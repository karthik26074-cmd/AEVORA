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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';

interface SettingsPageProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ darkMode, setDarkMode }) => {
  const { user } = useAuth();
  const { currentWorkspace, seedSampleData, clearWorkspaceData } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'api' | 'firebase'>('profile');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(true);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

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
        </div>
      )}

      {/* ── Tab 2: Workspace & Product ────────────────────────────── */}
      {activeTab === 'workspace' && (
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-6">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
              {currentWorkspace?.name || 'Smart Banking Platform [SAMPLE DATA]'}
            </h3>
            <p className="text-xs text-brand-secondary font-medium">
              Product: <span className="font-bold text-brand-dark dark:text-white">{currentWorkspace?.productName || 'Smart Banking NextGen'}</span>
            </p>
            <p className="text-xs text-brand-secondary leading-relaxed pt-0.5">
              {currentWorkspace?.productDescription ||
                'Enterprise retail banking web and mobile application suite with real-time payments, biometric auth, and ledger analytics.'}
            </p>
          </div>

          <div className="pt-5 border-t border-brand-border/60 dark:border-brand-dark-border/60 space-y-3">
            <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-brand-secondary">
              DEMONSTRATION & WORKSPACE ACTIONS
            </h4>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => seedSampleData()}
                className="px-4 py-2 rounded-xl bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary text-xs font-bold hover:bg-brand-primary/25 border border-brand-primary/20 transition-all shadow-sm"
              >
                Re-seed Smart Banking Sample Data
              </button>

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
