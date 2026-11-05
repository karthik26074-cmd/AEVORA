import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { auth, isFirebaseConfigured } from '../services/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithPopup,
  reauthenticateWithPopup,
  linkWithCredential,
  unlink,
  onAuthStateChanged,
  AuthCredential,
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithGitHub: (includePrivate?: boolean, promptSelectAccount?: boolean) => Promise<{ success: boolean; error?: string }>;
  linkGitHubAccount: (includePrivate?: boolean) => Promise<{ success: boolean; error?: string }>;
  unlinkProvider: (providerId: string) => Promise<{ success: boolean; error?: string }>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  getLinkedProviders: () => string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'aevora_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('evolyra_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const pendingCredentialRef = useRef<AuthCredential | null>(null);

  useEffect(() => {
    // If Firebase Auth is configured, attach listener
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const mappedUser: User = {
            id: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            photoUrl: fbUser.photoURL || undefined,
            role: 'admin',
            createdAt: new Date().toISOString(),
          };
          setUser(mappedUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
        } else {
          // If no stored local user, clear
          if (!localStorage.getItem(STORAGE_KEY)) {
            setUser(null);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // If cached user exists in local storage, keep it
      const cached = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('evolyra_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      if (isFirebaseConfigured && auth) {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const mappedUser: User = {
          id: cred.user.uid,
          email: cred.user.email || email,
          displayName: cred.user.displayName || email.split('@')[0],
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        setUser(mappedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
        return { success: true };
      }

      // Backend API login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error: 'Email/Password sign-in is not enabled in Firebase Console. Enable it under Authentication > Sign-in method.',
        };
      }
      return { success: false, error: err.message || 'Authentication error' };
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    try {
      if (isFirebaseConfigured && auth) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const mappedUser: User = {
          id: cred.user.uid,
          email: cred.user.email || email,
          displayName: name,
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        setUser(mappedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
        return { success: true };
      }

      // Backend API register
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name, email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration error' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      if (isFirebaseConfigured && auth) {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);

        // Auto-link pending credential from a previous collision
        if (pendingCredentialRef.current && cred.user) {
          const pending = pendingCredentialRef.current;
          try {
            await linkWithCredential(cred.user, pending);
          } catch (linkErr) {
            console.warn('[Account Linking Warning]', linkErr);
          }
          const pendingOAuth = pending as any;
          const pendingToken = pendingOAuth?.accessToken;
          if (pendingToken) {
            try {
              const idToken = await cred.user.getIdToken();
              await fetch('/api/github/connect', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ token: pendingToken }),
              });
            } catch (connErr) {
              console.warn('[GitHub Connect on Google Login]', connErr);
            }
          }
          pendingCredentialRef.current = null;
        }

        const mappedUser: User = {
          id: cred.user.uid,
          email: cred.user.email || '',
          displayName: cred.user.displayName || 'Google User',
          photoUrl: cred.user.photoURL || undefined,
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        setUser(mappedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
        return { success: true };
      }

      // Auto-fallback demo Google sign-in
      const demoUser: User = {
        id: `google-${Date.now()}`,
        email: 'alex.morgan.lead@gmail.com',
        displayName: 'Alex Morgan',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      setUser(demoUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
      return { success: true };
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error: 'Google Sign-in is not enabled in Firebase Console. Enable it under Authentication > Sign-in method > Google.',
        };
      }
      return { success: false, error: err.message || 'Google Sign-in failed' };
    }
  };

  const loginWithGitHub = async (includePrivate: boolean = false, promptSelectAccount: boolean = false) => {
    try {
      if (isFirebaseConfigured && auth) {
        const provider = new GithubAuthProvider();
        provider.addScope('read:user');
        provider.addScope('user:email');
        provider.addScope('public_repo');
        provider.addScope('admin:repo_hook');
        if (includePrivate) {
          provider.addScope('repo');
        }
        if (promptSelectAccount) {
          provider.setCustomParameters({ prompt: 'select_account' });
        }

        let cred;
        try {
          cred = await signInWithPopup(auth, provider);
        } catch (popupErr: any) {
          if (popupErr.code === 'auth/operation-not-allowed') {
            return {
              success: false,
              error: 'GitHub Sign-in is not enabled in Firebase Console. Enable it under Authentication > Sign-in method > GitHub (requires GitHub OAuth Client ID & Secret).',
            };
          }
          if (popupErr.code === 'auth/account-exists-with-different-credential') {
            const gitCred = GithubAuthProvider.credentialFromError(popupErr) || popupErr.credential || null;
            pendingCredentialRef.current = gitCred;
            return {
              success: false,
              error: 'This email already has an account with Google. Sign in with Google first, and your GitHub account will connect automatically.',
            };
          }
          throw popupErr;
        }

        const gitCredential = GithubAuthProvider.credentialFromResult(cred);
        const accessToken = gitCredential?.accessToken;

        // Securely pass token once to backend using verified Firebase ID token authentication
        if (accessToken) {
          try {
            const idToken = await cred.user.getIdToken();
            await fetch('/api/github/connect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ token: accessToken }),
            });
          } catch (connErr) {
            console.warn('[GitHub] Backend connect warning:', connErr);
          }
        }

        const mappedUser: User = {
          id: cred.user.uid,
          email: cred.user.email || '',
          displayName: cred.user.displayName || 'GitHub Developer',
          photoUrl: cred.user.photoURL || undefined,
          role: 'admin',
          createdAt: new Date().toISOString(),
        };
        setUser(mappedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
        return { success: true };
      }

      // Auto-fallback demo GitHub sign-in
      const demoUser: User = {
        id: `gh-${Date.now()}`,
        email: 'dev.lead@github.com',
        displayName: 'GitHub Developer',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      setUser(demoUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'GitHub Sign-in failed' };
    }
  };

  const linkGitHubAccount = async (includePrivate: boolean = false) => {
    try {
      if (isFirebaseConfigured && auth && auth.currentUser) {
        const provider = new GithubAuthProvider();
        provider.addScope('read:user');
        provider.addScope('user:email');
        provider.addScope('public_repo');
        provider.addScope('admin:repo_hook');
        if (includePrivate) {
          provider.addScope('repo');
        }

        let accessToken: string | undefined;
        let mappedUid = auth.currentUser.uid;

        // Check if GitHub is already linked to this current user
        await auth.currentUser.reload().catch(() => {});
        const isAlreadyLinked = auth.currentUser.providerData.some((p) => p.providerId === 'github.com');

        try {
          let cred;
          if (isAlreadyLinked) {
            // User is already linked with GitHub: reauthenticate to obtain a fresh repository access token
            cred = await reauthenticateWithPopup(auth.currentUser, provider);
          } else {
            cred = await linkWithPopup(auth.currentUser, provider);
          }
          const gitCredential = GithubAuthProvider.credentialFromResult(cred);
          accessToken = gitCredential?.accessToken;
          if (cred.user) mappedUid = cred.user.uid;
        } catch (linkErr: any) {
          const isCredInUse =
            linkErr.code === 'auth/credential-already-in-use' ||
            (linkErr.message && linkErr.message.includes('credential-already-in-use'));

          // Extract OAuth credential directly from link error
          const gitCred = GithubAuthProvider.credentialFromError(linkErr) || (linkErr as any)?.credential;
          if (gitCred?.accessToken) {
            accessToken = gitCred.accessToken;
          }

          if (!accessToken && isCredInUse) {
            // If already associated with a separate user account, use popup sign-in to capture fresh token
            try {
              const signCred = await signInWithPopup(auth, provider);
              const signGitCred = GithubAuthProvider.credentialFromResult(signCred);
              accessToken = signGitCred?.accessToken;
              if (signCred.user) mappedUid = signCred.user.uid;
            } catch (pErr: any) {
              const pGitCred = GithubAuthProvider.credentialFromError(pErr) || (pErr as any)?.credential;
              if (pGitCred?.accessToken) {
                accessToken = pGitCred.accessToken;
              }
            }
          }

          if (!accessToken && !isCredInUse) {
            throw linkErr;
          }
        }

        if (accessToken) {
          try {
            const idToken = await auth.currentUser.getIdToken(true);
            const connRes = await fetch('/api/github/connect', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({ token: accessToken }),
            });
            if (!connRes.ok) {
              const errData = await connRes.json().catch(() => ({}));
              return {
                success: false,
                error: errData.error || `GitHub connect failed (${connRes.status})`,
              };
            }
          } catch (connErr: any) {
            console.warn('[GitHub] Backend connect warning:', connErr);
            return {
              success: false,
              error: connErr.message || 'Failed to save GitHub connection',
            };
          }
        } else {
          // If accessToken was not extracted, check if server already has stored credentials
          try {
            const idToken = await auth.currentUser.getIdToken(true);
            const statusRes = await fetch('/api/github/status', {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            const statusData = await statusRes.json().catch(() => ({}));
            if (statusData.connected) {
              return { success: true };
            }
          } catch {
            // ignore
          }
          return {
            success: false,
            error: 'GitHub authorization did not provide an access token. Please retry.',
          };
        }

        await auth.currentUser.reload().catch(() => {});
        const updatedUser: User = {
          id: mappedUid,
          email: auth.currentUser.email || user?.email || '',
          displayName: auth.currentUser.displayName || user?.displayName || 'GitHub Connected',
          photoUrl: auth.currentUser.photoURL || user?.photoUrl,
          role: 'admin',
          createdAt: user?.createdAt || new Date().toISOString(),
        };
        setUser(updatedUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
        return { success: true };
      }
      return { success: false, error: 'User is not currently authenticated' };
    } catch (err: any) {
      if (
        err.code === 'auth/credential-already-in-use' ||
        (err.message && err.message.includes('credential-already-in-use'))
      ) {
        return {
          success: false,
          error:
            'This GitHub account is already associated with another user account. If you originally signed up with GitHub, sign in directly with GitHub.',
        };
      }
      return { success: false, error: err.message || 'Failed to link GitHub account' };
    }
  };

  const unlinkProvider = async (providerId: string) => {
    if (!isFirebaseConfigured || !auth || !auth.currentUser) {
      return { success: false, error: 'User is not authenticated' };
    }
    if (auth.currentUser.providerData.length <= 1) {
      return {
        success: false,
        error: 'Cannot unlink your last sign-in method. You must keep at least one provider linked.',
      };
    }
    try {
      await unlink(auth.currentUser, providerId);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to unlink provider' };
    }
  };

  const getLinkedProviders = (): string[] => {
    if (isFirebaseConfigured && auth?.currentUser) {
      return auth.currentUser.providerData.map((p) => p.providerId);
    }
    return ['google.com'];
  };

  const loginDemo = async () => {
    const res = await fetch('/api/auth/demo', { method: 'POST' });
    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        // ignore
      }
    }
    pendingCredentialRef.current = null;
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('evolyra_user');
    localStorage.removeItem('aevora_active_ws');
    sessionStorage.clear();
  };

  const resetPassword = async (email: string) => {
    try {
      if (isFirebaseConfigured && auth) {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: `Password reset email dispatched to ${email}. Check your inbox.` };
      }
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to dispatch password reset' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        loginWithGitHub,
        linkGitHubAccount,
        unlinkProvider,
        getLinkedProviders,
        loginDemo,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
