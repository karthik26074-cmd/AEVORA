import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Layers,
  FileText,
  GitCommit,
  Plus,
  Radio,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  User as UserIcon,
  Sparkles,
  Menu,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

interface TopbarProps {
  collapsed: boolean;
  onOpenCreateWorkspace: () => void;
  onSelectFeature: (featureId: string) => void;
  setCurrentTab: (tab: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  collapsed,
  onOpenCreateWorkspace,
  onSelectFeature,
  setCurrentTab,
  onToggleMobileMenu,
}) => {
  const {
    workspaces,
    currentWorkspace,
    selectWorkspace,
    isLiveConnected,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    promptReasonForNotification,
    features,
    records,
    events,
  } = useWorkspace();

  const { user, logout } = useAuth();

  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const wsRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter search results across features, records, and events
  const searchResults = searchQuery.trim()
    ? {
      features: features
        .filter(
          (f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.aliases.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 4),
      records: records
        .filter((r) => r.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 3),
      events: events
        .filter((e) => e.description.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 3),
    }
    : null;

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-brand-surface/90 dark:bg-brand-dark/90 backdrop-blur-md border-b border-brand-border dark:border-brand-dark-border px-3 sm:px-4 md:px-6 flex items-center justify-between transition-all duration-300 left-0 ${
        collapsed ? 'md:left-20' : 'md:left-64'
      }`}
    >
      {/* Left: Mobile Menu & Workspace Selector */}
      <div className="relative flex items-center gap-2 sm:gap-3" ref={wsRef}>
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ml-1 text-brand-secondary hover:text-brand-dark dark:hover:text-white rounded-xl hover:bg-brand-bg dark:hover:bg-brand-dark-card transition-colors flex items-center justify-center"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        <button
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark-card/50 hover:bg-brand-bg dark:hover:bg-brand-dark-card transition-colors text-left"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-brand-dark dark:text-white leading-tight max-w-[150px] md:max-w-[200px] truncate">
              {currentWorkspace ? currentWorkspace.name : 'Select Workspace'}
            </span>
            <span className="text-[10px] text-brand-secondary leading-tight truncate">
              {currentWorkspace?.productName || 'AEVORA'}
            </span>
          </div>
          <ChevronDown size={14} className="text-brand-secondary ml-1" />
        </button>

        {wsDropdownOpen && (
          <div className="absolute top-12 left-0 w-72 bg-brand-surface dark:bg-brand-dark-card rounded-2xl shadow-elevated border border-brand-border dark:border-brand-dark-border py-2 z-50">
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-brand-secondary tracking-wider">
              Product Workspaces
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 px-1">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    selectWorkspace(ws.id);
                    setWsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${ws.id === currentWorkspace?.id
                      ? 'bg-brand-primary/10 text-brand-primary font-bold'
                      : 'text-brand-text dark:text-gray-200 hover:bg-brand-bg dark:hover:bg-brand-dark'
                    }`}
                >
                  <div className="truncate mr-2">
                    <p className="font-medium truncate">{ws.name}</p>
                    <p className="text-[10px] text-brand-secondary truncate">{ws.productName}</p>
                  </div>
                  {ws.isSample && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-secondary/15 text-brand-secondary font-mono flex-shrink-0">
                      Sample
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-brand-border dark:border-brand-dark-border mt-1">
              <button
                onClick={() => {
                  setWsDropdownOpen(false);
                  onOpenCreateWorkspace();
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-primary-light dark:hover:bg-brand-primary/15 rounded-xl transition-colors"
              >
                <Plus size={14} />
                <span>Create New Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Middle: Global Search */}
      <div className="relative flex-1 max-w-md mx-4 hidden md:block" ref={searchRef}>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search features, records, decisions, historical events..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark-card/50 text-brand-text dark:text-white placeholder-brand-secondary focus:outline-none focus:border-brand-primary focus:bg-white dark:focus:bg-brand-dark-card transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-secondary hover:text-brand-text"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchFocused && searchResults && (
          <div className="absolute top-11 left-0 right-0 bg-brand-surface dark:bg-brand-dark-card rounded-2xl shadow-elevated border border-brand-border dark:border-brand-dark-border p-3 space-y-3 z-50 max-h-96 overflow-y-auto">
            {searchResults.features.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-brand-secondary tracking-wider mb-1 flex items-center gap-1.5">
                  <Layers size={12} className="text-brand-primary" />
                  <span>Features ({searchResults.features.length})</span>
                </p>
                <div className="space-y-1">
                  {searchResults.features.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        onSelectFeature(f.id);
                        setCurrentTab('features');
                        setSearchFocused(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs hover:bg-brand-bg dark:hover:bg-brand-dark cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-semibold text-brand-dark dark:text-white">{f.name}</span>
                      <span className="text-[10px] text-brand-secondary">{f.module}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.records.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-brand-secondary tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText size={12} className="text-brand-success" />
                  <span>Records ({searchResults.records.length})</span>
                </p>
                <div className="space-y-1">
                  {searchResults.records.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setCurrentTab('records');
                        setSearchFocused(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs hover:bg-brand-bg dark:hover:bg-brand-dark cursor-pointer flex items-center justify-between"
                    >
                      <span className="font-medium text-brand-dark dark:text-white truncate max-w-[200px]">
                        {r.fileName}
                      </span>
                      <span className="text-[10px] text-brand-secondary">{r.sourceType}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.events.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-brand-secondary tracking-wider mb-1 flex items-center gap-1.5">
                  <GitCommit size={12} className="text-brand-warning" />
                  <span>Timeline Events ({searchResults.events.length})</span>
                </p>
                <div className="space-y-1">
                  {searchResults.events.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => {
                        setCurrentTab('timeline');
                        setSearchFocused(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs hover:bg-brand-bg dark:hover:bg-brand-dark cursor-pointer"
                    >
                      <p className="font-medium text-brand-dark dark:text-white truncate">{e.description}</p>
                      <p className="text-[10px] text-brand-secondary">{e.featureName} • {e.eventDate}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.features.length === 0 &&
              searchResults.records.length === 0 &&
              searchResults.events.length === 0 && (
                <p className="text-xs text-brand-secondary text-center py-4">
                  No matching records or features found.
                </p>
              )}
          </div>
        )}
      </div>

      {/* Right Controls: Live Sync Indicator, Notifications, User */}
      <div className="flex items-center gap-3">
        {/* Real-Time Live Connection Indicator */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-brand-border dark:border-brand-dark-border bg-brand-bg/60 dark:bg-brand-dark-card/60 text-xs font-medium"
          title={
            isLiveConnected
              ? 'Real-Time WebSocket stream connected: automatic sync across all browsers and operations'
              : 'Connecting to live real-time stream...'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-brand-success pulse-dot' : 'bg-brand-warning animate-ping'
              }`}
          />
          <span className="text-[11px] text-brand-secondary font-medium hidden sm:inline">
            {isLiveConnected ? 'Live Sync Active' : 'Connecting...'}
          </span>
        </div>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="p-2 rounded-xl text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg dark:hover:bg-brand-dark-card transition-colors relative"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-primary text-white text-[9px] font-bold flex items-center justify-center animate-bounce">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute top-12 right-0 w-80 bg-brand-surface dark:bg-brand-dark-card rounded-2xl shadow-elevated border border-brand-border dark:border-brand-dark-border py-2 z-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border dark:border-brand-dark-border">
                <span className="text-xs font-bold text-brand-dark dark:text-white">
                  Notifications ({unreadNotificationCount} new)
                </span>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-[11px] font-semibold text-brand-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-brand-border/50 dark:divide-brand-dark-border/50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-brand-secondary">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.link) {
                          const tab = n.link.replace('/', '');
                          setCurrentTab(tab);
                        }
                        setNotifDropdownOpen(false);
                      }}
                      className={`p-3 text-xs hover:bg-brand-bg dark:hover:bg-brand-dark cursor-pointer transition-colors ${!n.read ? 'bg-brand-primary/5 dark:bg-brand-primary/10' : ''
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-brand-dark dark:text-white truncate">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-brand-secondary mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-brand-secondary/80 font-mono block">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {n.needs_reason === 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              promptReasonForNotification({
                                id: n.id,
                                kind: n.type || 'push',
                                repo: n.repo || currentWorkspace?.name || 'repo',
                                title: n.title,
                                body: n.message,
                                actor: n.actor || 'Developer',
                                event_ids: n.event_ids || [],
                                needs_reason: 1,
                                created_at: n.timestamp,
                              });
                              setNotifDropdownOpen(false);
                            }}
                            className="px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors"
                          >
                            Add reason
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-brand-bg dark:hover:bg-brand-dark-card transition-colors"
          >
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="Avatar" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-brand-primary/15 text-brand-primary flex items-center justify-center font-bold text-xs">
                {user?.displayName
                  ? user.displayName.slice(0, 2).toUpperCase()
                  : user?.email
                  ? user.email.slice(0, 2).toUpperCase()
                  : 'US'}
              </div>
            )}
            <ChevronDown size={14} className="text-brand-secondary hidden sm:inline" />
          </button>

          {userDropdownOpen && (
            <div className="absolute top-12 right-0 w-56 bg-brand-surface dark:bg-brand-dark-card rounded-2xl shadow-elevated border border-brand-border dark:border-brand-dark-border py-2 z-50">
              <div className="px-4 py-2 border-b border-brand-border dark:border-brand-dark-border">
                <p className="text-xs font-bold text-brand-dark dark:text-white truncate">
                  {user?.displayName || (user?.email ? user.email.split('@')[0] : 'User')}
                </p>
                <p className="text-[10px] text-brand-secondary truncate">
                  {user?.email || 'Authenticated User'}
                </p>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  onClick={() => {
                    setCurrentTab('settings');
                    setUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-brand-text dark:text-gray-200 hover:bg-brand-bg dark:hover:bg-brand-dark transition-colors"
                >
                  <UserIcon size={14} className="text-brand-secondary" />
                  <span>Profile & Settings</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-brand-error hover:bg-brand-error-light dark:hover:bg-brand-error/15 transition-colors font-medium"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
