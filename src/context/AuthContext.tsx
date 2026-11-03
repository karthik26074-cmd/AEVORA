import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, isFirebaseConfigured } from '../services/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'aevora_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('evolyra_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

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
      return { success: false, error: err.message || 'Google Sign-in failed' };
    }
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
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('evolyra_user');
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
