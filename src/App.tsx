import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { NotificationToast } from './components/NotificationToast';
import { GuidedDemoModal } from './components/GuidedDemoModal';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';

import { AuthPage } from './pages/AuthPage';
import { OverviewPage } from './pages/OverviewPage';
import { RecordsPage } from './pages/RecordsPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { TimelinePage } from './pages/TimelinePage';
import { GraphPage } from './pages/GraphPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ConflictsPage } from './pages/ConflictsPage';
import { ActivityPage } from './pages/ActivityPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { ConnectedSourcesPage } from './pages/ConnectedSourcesPage';
import { GitHubExplorerPage } from './pages/GitHubExplorerPage';

import {
  LayoutDashboard,
  FileText,
  Layers,
  GitCommit,
  Network,
  Sparkles,
  Scale,
  Activity,
  GitBranch,
  Settings,
  Link2,
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const { activeToastNotification, dismissToastNotification, addEventReason } = useWorkspace();

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('aevora_theme') === 'dark';
  });
  const [isDemoOpen, setIsDemoOpen] = useState<boolean>(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState<boolean>(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Apply dark mode class to document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aevora_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aevora_theme', 'light');
    }
  }, [darkMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg dark:bg-brand-dark text-xs text-brand-secondary">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.svg" alt="AEVORA" className="w-10 h-10 animate-pulse" />
          <span>Initializing AEVORA Temporal System...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const mobileNavItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'features', icon: Layers, label: 'Features' },
    { id: 'timeline', icon: GitCommit, label: 'Timeline' },
    { id: 'connected-sources', icon: Link2, label: 'Sources' },
    { id: 'ai', icon: Sparkles, label: 'AI' },
  ];

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-gray-100 flex transition-colors">
      {/* Desktop Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onOpenDemo={() => setIsDemoOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Top Navigation Bar */}
      <Topbar
        collapsed={collapsed}
        onOpenCreateWorkspace={() => setIsCreateWsOpen(true)}
        onSelectFeature={(featId) => {
          setSelectedFeatureId(featId);
          setCurrentTab('features');
        }}
        setCurrentTab={setCurrentTab}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 pt-20 px-4 sm:px-8 ${currentTab === 'ai' ? 'pb-2 h-screen overflow-hidden' : 'pb-20 md:pb-8 min-h-screen'
          } ${collapsed ? 'md:ml-20' : 'md:ml-64'}`}
      >
        <div className="max-w-7xl mx-auto">
          {currentTab === 'overview' && (
            <OverviewPage
              setCurrentTab={setCurrentTab}
              onOpenUpload={() => setCurrentTab('records')}
              onSelectFeature={(featId) => {
                setSelectedFeatureId(featId);
                setCurrentTab('features');
              }}
            />
          )}

          {currentTab === 'records' && <RecordsPage />}

          {currentTab === 'features' && (
            <FeaturesPage
              selectedFeatureId={selectedFeatureId}
              setSelectedFeatureId={setSelectedFeatureId}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'timeline' && <TimelinePage />}

          {currentTab === 'graph' && <GraphPage />}

          {currentTab === 'ai' && (
            <AIAssistantPage onNavigate={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'conflicts' && <ConflictsPage />}

          {currentTab === 'activity' && <ActivityPage defaultView="STREAM" />}

          {currentTab === 'developer-updates' && <ActivityPage defaultView="DEVELOPERS" />}

          {currentTab === 'connected-sources' && (
            <ConnectedSourcesPage
              onNavigateToTab={(tab) => setCurrentTab(tab)}
              onSelectFeature={(featId) => {
                setSelectedFeatureId(featId);
                setCurrentTab('features');
              }}
            />
          )}

          {currentTab === 'github-explorer' && (
            <GitHubExplorerPage
              onNavigateToTab={(tab) => setCurrentTab(tab)}
              onSelectFeature={(featId) => {
                setSelectedFeatureId(featId);
                setCurrentTab('features');
              }}
            />
          )}

          {currentTab === 'integrations' && <IntegrationsPage />}

          {currentTab === 'settings' && (
            <SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} />
          )}

          {currentTab === 'diagnostics' && <DiagnosticsPage />}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-surface/95 dark:bg-brand-dark/95 backdrop-blur-md border-t border-brand-border dark:border-brand-dark-border px-3 py-2 flex items-center justify-around shadow-lg">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] font-bold ${isActive ? 'text-brand-primary' : 'text-brand-secondary hover:text-brand-dark'
                }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modals */}
      <GuidedDemoModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onNavigateToTab={(tab) => setCurrentTab(tab)}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWsOpen}
        onClose={() => setIsCreateWsOpen(false)}
      />

      {/* Live Notification Toast */}
      <NotificationToast
        notification={activeToastNotification}
        onDismiss={dismissToastNotification}
        onSaveReason={addEventReason}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <MainApp />
      </WorkspaceProvider>
    </AuthProvider>
  );
}
