import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Sparkles,
  Database,
  Moon,
  Sun,
  Save,
  Check,
  RefreshCw,
  Github,
  Link2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { auth } from '../services/firebase';

interface SettingsPageProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ darkMode, setDarkMode }) => {
  const { user, linkGitHubAccount, unlinkProvider, getLinkedProviders } = useAuth();
  const { currentWorkspace, seedSampleData, clearWorkspaceData } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'api' | 'firebase'>('profile');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(true);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // GitHub & Google account linking state
  const [isLinkingGithub, setIsLinkingGithub] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [includePrivate, setIncludePrivate] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);

  useEffect(() => {
    const syncProviders = async () => {
      if (auth?.currentUser) {
        try {
          await auth.currentUser.reload();
        } catch {
          // ignore
        }
      }
      setLinkedProviders(getLinkedProviders());
    };
    syncProviders();
  }, [user]);

  const handleLinkGitHub = async () => {
    setIsLinkingGithub(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      const res = await linkGitHubAccount(includePrivate);
      if (res.success) {
        setActionSuccess('GitHub account successfully linked! You can now access your GitHub repositories.');
        setLinkedProviders(getLinkedProviders());
      } else {
        setActionError(res.error || 'Failed to link GitHub account');
      }
    } catch (e: any) {
      setActionError(e.message || 'An unexpected error occurred during GitHub linking');
    } finally {
      setIsLinkingGithub(false);
    }
  };

  const handleUnlink = async (providerId: string, providerName: string) => {
    setActionSuccess(null);
    setActionError(null);
    if (linkedProviders.length <= 1) {
      setActionError(`Cannot unlink ${providerName}. It is your only sign-in method. Add another login method first.`);
      return;
    }
    const res = await unlinkProvider(providerId);
    if (res.success) {
      setActionSuccess(`${providerName} unlinked successfully.`);
      setLinkedProviders(getLinkedProviders());
    } else {
      setActionError(res.error || `Failed to unlink ${providerName}`);
    }
  };

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.hasGeminiApiKey !== undefined) {
          setHasGeminiKey(Boolean(data.hasGeminiApiKey));
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKeyInput.trim()) return;
    setIsSavingKey(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: geminiKeyInput.trim() }),
      });
      const data = await res.json();
      setHasGeminiKey(Boolean(data.hasGeminiApiKey));
      setSaveSuccess(true);
      setGeminiKeyInput('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingKey(false);
    }
  };

  // Derive display initials
  const displayName = user?.displayName || 'Jain';
  const displayEmail = user?.email || 'jain@gmail.com';
  const displayInitials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'JA';

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-4xl">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
          System & Workspace Settings
        </h1>
        <p className="text-xs text-brand-secondary mt-1">
          Manage user profiles, cloud AI credentials, Firebase persistence, and workspace data.
        </p>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────── */}
      <div className="flex border-b border-brand-border dark:border-brand-dark-border gap-6 text-xs font-bold">
        {[
          { id: 'profile', label: 'User Profile', icon: User },
          { id: 'workspace', label: 'Workspace & Product', icon: Building2 },
          { id: 'api', label: 'Gemini AI Configuration', icon: Sparkles },
          { id: 'firebase', label: 'Firebase Cloud Storage', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 flex items-center gap-2 transition-colors relative ${
                isActive
                  ? 'text-brand-primary'
                  : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: User Profile ───────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary-light/60 dark:bg-brand-primary/20 text-brand-primary flex items-center justify-center font-extrabold text-lg flex-shrink-0 shadow-sm border border-brand-primary/10">
              {displayInitials}
            </div>

            <div className="space-y-0.5">
              <h3 className="font-extrabold text-base text-brand-dark dark:text-white leading-tight">
                {displayName}
              </h3>
              <p className="text-xs text-brand-secondary font-mono">{displayEmail}</p>
              <div className="pt-1">
                <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary border border-brand-primary/20">
                  ROLE: {user?.role ? user.role.toUpperCase() : 'ADMIN'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-brand-border/60 dark:border-brand-dark-border/60 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="font-bold text-xs text-brand-dark dark:text-white block">
                Interface Theme
              </span>
              <p className="text-xs text-brand-secondary mt-0.5">
                Switch between curated light and dark modes
              </p>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs font-semibold text-brand-dark dark:text-white hover:bg-brand-bg dark:hover:bg-brand-dark transition-colors"
            >
              {darkMode ? <Sun size={14} className="text-brand-warning" /> : <Moon size={14} />}
              <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
            </button>
          </div>

          {/* Desktop Notifications Preference */}
          <div className="pt-5 border-t border-brand-border/60 dark:border-brand-dark-border/60 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="font-bold text-xs text-brand-dark dark:text-white block">
                Desktop Notifications
              </span>
              <p className="text-xs text-brand-secondary mt-0.5">
                Show system notifications when this tab is not focused (requires browser permission)
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                const current = localStorage.getItem('evolyra_desktop_notifs') === 'true';
                if (!current) {
                  if ('Notification' in window) {
                    const perm = await Notification.requestPermission();
                    if (perm === 'granted') {
                      localStorage.setItem('evolyra_desktop_notifs', 'true');
                      alert('Desktop notifications enabled.');
                    } else {
                      alert('Browser notification permission was not granted.');
                    }
                  }
                } else {
                  localStorage.setItem('evolyra_desktop_notifs', 'false');
                  alert('Desktop notifications disabled.');
                }
              }}
              className="px-3.5 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs font-semibold text-brand-dark dark:text-white hover:bg-brand-bg dark:hover:bg-brand-dark transition-colors"
            >
              Toggle Desktop Notifications
            </button>
          </div>

          {/* Linked Accounts Section */}
          <div className="pt-5 border-t border-brand-border/60 dark:border-brand-dark-border/60 space-y-4">
            <div>
              <span className="font-bold text-xs text-brand-dark dark:text-white block">
                Linked Accounts
              </span>
              <p className="text-xs text-brand-secondary mt-0.5">
                Manage your connected authentication providers and repository ingestion accounts.
              </p>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={15} className="flex-shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Google Provider Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/80 dark:border-brand-dark-border/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 border border-brand-border flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-brand-dark dark:text-white">Google Workspace</h4>
                      {linkedProviders.includes('google.com') && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Linked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-brand-secondary">
                      Used for authentication and team profile sync.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {linkedProviders.includes('google.com') ? (
                    <button
                      type="button"
                      onClick={() => handleUnlink('google.com', 'Google')}
                      className="px-3.5 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs font-semibold text-brand-secondary hover:text-rose-600 hover:border-rose-500/40 transition-colors"
                      title={linkedProviders.length <= 1 ? 'Cannot unlink the last login method' : 'Unlink Google account'}
                    >
                      Unlink
                    </button>
                  ) : (
                    <span className="text-xs text-brand-secondary italic">Not linked</span>
                  )}
                </div>
              </div>

              {/* GitHub Provider Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/80 dark:border-brand-dark-border/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Github size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-brand-dark dark:text-white">GitHub Account</h4>
                      {linkedProviders.includes('github.com') && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Linked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-brand-secondary">
                      Allows AEVORA to import your repositories and listen to live commits and PRs.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {linkedProviders.includes('github.com') ? (
                    <button
                      type="button"
                      onClick={() => handleUnlink('github.com', 'GitHub')}
                      className="px-3.5 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs font-semibold text-brand-secondary hover:text-rose-600 hover:border-rose-500/40 transition-colors"
                      title={linkedProviders.length <= 1 ? 'Cannot unlink the last login method' : 'Unlink GitHub account'}
                    >
                      Unlink
                    </button>
                  ) : (
                    <>
                      <label className="text-[11px] text-brand-secondary flex items-center gap-1.5 cursor-pointer mr-2 select-none">
                        <input
                          type="checkbox"
                          checked={includePrivate}
                          onChange={(e) => setIncludePrivate(e.target.checked)}
                          className="accent-brand-primary"
                        />
                        <span>Private repos</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleLinkGitHub}
                        disabled={isLinkingGithub}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                      >
                        {isLinkingGithub ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Connecting…</span>
                          </>
                        ) : (
                          <>
                            <Link2 size={13} />
                            <span>Link GitHub Account</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Workspace & Product ────────────────────────────── */}
      {activeTab === 'workspace' && (
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-6">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
              {currentWorkspace?.name || 'Active Project Workspace'}
            </h3>
            <p className="text-xs text-brand-secondary font-medium">
              Product: <span className="font-bold text-brand-dark dark:text-white">{currentWorkspace?.productName || 'Primary Project'}</span>
            </p>
            <p className="text-xs text-brand-secondary leading-relaxed pt-0.5">
              {currentWorkspace?.productDescription ||
                'Ingesting live commits, pull requests, and architecture records from your connected repositories.'}
            </p>
          </div>

          <div className="pt-5 border-t border-brand-border/60 dark:border-brand-dark-border/60 space-y-3">
            <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-brand-secondary">
              WORKSPACE ACTIONS
            </h4>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setClearConfirmOpen(true)}
                className="px-4 py-2 rounded-xl bg-transparent border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/10 transition-all shadow-sm"
              >
                Clear Current Workspace Records
              </button>
            </div>
          </div>

          {clearConfirmOpen && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs animate-fade-in">
              <p className="font-bold text-rose-600 dark:text-rose-400">
                Are you sure you want to clear this workspace?
              </p>
              <p className="text-brand-secondary">
                This will purge all ingested documents, feature events, and conflict records in {currentWorkspace?.name}.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => {
                    await clearWorkspaceData();
                    setClearConfirmOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Clear
                </button>
                <button
                  onClick={() => setClearConfirmOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-brand-border text-brand-secondary hover:text-brand-dark"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Gemini AI Configuration ────────────────────────── */}
      {activeTab === 'api' && (
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/15 text-brand-primary flex items-center justify-center flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                Google Gemini API
              </h3>
              <p className="text-xs text-brand-secondary mt-0.5">
                Server-side LLM for document information extraction and evidence-backed QA.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-brand-bg/40 dark:bg-brand-dark/40 border border-brand-border/60 text-xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-brand-dark dark:text-white">Active Operational Status:</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Gemini 3.5 Flash Active
              </span>
            </div>
            <p className="text-brand-secondary text-[11px] leading-relaxed">
              A custom API key is securely registered in backend environment. All extractions and historical answers use live Google Gemini 3.5 Flash.
            </p>
          </div>

          <form onSubmit={handleSaveGeminiKey} className="space-y-2.5 pt-1">
            <label className="block text-xs font-bold text-brand-dark dark:text-white">
              Configure Google Gemini API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="AiZaSy..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark/50 text-brand-text dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary font-mono"
              />
              <button
                type="submit"
                disabled={isSavingKey || !geminiKeyInput.trim()}
                className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                {isSavingKey ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Save Key</span>
              </button>
            </div>

            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 pt-1 animate-fade-in">
                <Check size={13} />
                <span>Gemini API key updated successfully</span>
              </span>
            )}
          </form>
        </div>
      )}

      {/* ── Tab 4: Firebase Cloud Storage ─────────────────────────── */}
      {activeTab === 'firebase' && (
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold flex-shrink-0">
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                Firebase Cloud Firestore & Storage
              </h3>
              <p className="text-xs text-brand-secondary mt-0.5">
                Cloud persistence, multi-region replication, and real-time onSnapshot listeners.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-brand-bg/40 dark:bg-brand-dark/40 border border-brand-border/60 text-xs space-y-2.5 text-brand-secondary">
            <p className="font-bold text-brand-dark dark:text-white">
              Configuration Environment Instructions:
            </p>
            <p className="text-[11px] leading-relaxed">
              To bind AEVORA to your Firebase project, provide your credentials in <code>.env</code>:
            </p>

            <div className="p-3.5 bg-brand-surface dark:bg-brand-dark rounded-xl font-mono text-[11px] text-brand-dark dark:text-gray-200 border border-brand-border dark:border-brand-dark-border space-y-1">
              <p>VITE_FIREBASE_API_KEY=AIzaSy...</p>
              <p>VITE_FIREBASE_PROJECT_ID=your-project-id</p>
              <p>VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com</p>
              <p>VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com</p>
            </div>

            <p className="text-[11px] leading-relaxed pt-1">
              AEVORA operates with unified local and cloud-synced datastores, persisting all records and broadcasting instantaneous real-time WebSocket events.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
