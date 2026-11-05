import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Layers,
  GitCommit,
  Network,
  Sparkles,
  Clock,
  Code2,
  Link2,
  GitBranch,
  Settings,
  Scale,
  ShieldCheck,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onOpenDemo: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  onOpenDemo,
  darkMode,
  setDarkMode,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'features', label: 'Product Features', icon: Layers },
    { id: 'timeline', label: 'Timeline', icon: GitCommit },
    { id: 'activity', label: 'Recent History', icon: Clock, badge: 'Audit' },
    { id: 'developer-updates', label: 'Developer Updates', icon: Code2, badge: 'Dev' },
    { id: 'graph', label: 'Knowledge Graph', icon: Network },
    { id: 'ai', label: 'AI Assistant', icon: Sparkles, badge: 'Gemini' },
    { id: 'connected-sources', label: 'Connected Sources', icon: Link2 },
    { id: 'github-explorer', label: 'GitHub Explorer', icon: GitBranch },
    { id: 'records', label: 'Product Records', icon: FileText },
    { id: 'conflicts', label: 'Decisions & Conflicts', icon: Scale },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 md:z-30 transition-all duration-300 flex flex-col bg-brand-surface dark:bg-brand-dark border-r border-brand-border dark:border-brand-dark-border ${
          mobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-brand-border dark:border-brand-dark-border">
          <div
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
            onClick={() => {
              setCurrentTab('overview');
              onCloseMobile?.();
            }}
          >
            <img src="/logo.svg" alt="AEVORA Logo" className="w-9 h-9 rounded-xl flex-shrink-0 shadow-sm" />
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-wider text-brand-dark dark:text-white leading-none">
                  AEVORA
                </span>
                <span className="text-[10px] uppercase font-bold text-brand-secondary tracking-widest mt-1">
                  PRODUCT INTELLIGENCE
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg dark:hover:bg-brand-dark-card transition-colors md:hidden"
              title="Close menu"
            >
              <X size={18} />
            </button>

            {/* Desktop collapse button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg dark:hover:bg-brand-dark-card transition-colors hidden md:flex items-center justify-center"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>

      {/* Guided Live Demo Banner */}
      <div className="px-3 pt-3">
        <button
          onClick={() => {
            onOpenDemo();
            onCloseMobile?.();
          }}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold bg-brand-primary-light dark:bg-brand-primary/15 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/25 transition-all ${
            collapsed && !mobileOpen ? 'justify-center' : 'justify-between'
          }`}
          title="Interactive Guided Demonstration"
        >
          <div className="flex items-center gap-2">
            <PlayCircle size={16} className="text-brand-primary animate-pulse" />
            {(!collapsed || mobileOpen) && <span>Guided Live Demo</span>}
          </div>
          {(!collapsed || mobileOpen) && (
            <span className="bg-brand-primary text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Live
            </span>
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                onCloseMobile?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-brand-text/80 dark:text-gray-300 hover:bg-brand-bg dark:hover:bg-brand-dark-card hover:text-brand-dark dark:hover:text-white'
              } ${collapsed && !mobileOpen ? 'justify-center' : 'justify-start'}`}
              title={collapsed && !mobileOpen ? item.label : undefined}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-brand-secondary dark:text-gray-400 group-hover:text-brand-primary'
                }`}
              />
              {(!collapsed || mobileOpen) && (
                <div className="flex items-center justify-between flex-1">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 border-t border-brand-border dark:border-brand-dark-border space-y-1.5">
        {/* User Profile Summary */}
        {user && (
          <div
            className={`flex items-center gap-2.5 px-3 py-2 mb-1 rounded-xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border/50 dark:border-brand-dark-border/50 ${
              collapsed && !mobileOpen ? 'justify-center' : 'justify-start'
            }`}
            title={user.displayName || user.email}
          >
            {user.photoUrl ? (
              <img src={user.photoUrl} alt="Avatar" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-brand-primary/15 text-brand-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'JA'}
              </div>
            )}
            {(!collapsed || mobileOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-brand-dark dark:text-white truncate leading-tight">
                  {user.displayName || 'Jain'}
                </p>
                <p className="text-[9px] text-brand-secondary truncate leading-tight">
                  {user.email || 'jain@gmail.com'}
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => {
            setCurrentTab('diagnostics');
            onCloseMobile?.();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-brand-secondary dark:text-gray-400 hover:bg-brand-bg dark:hover:bg-brand-dark-card hover:text-brand-dark dark:hover:text-white transition-colors ${
            currentTab === 'diagnostics' ? 'bg-brand-bg dark:bg-brand-dark-card text-brand-primary font-semibold' : ''
          } ${collapsed && !mobileOpen ? 'justify-center' : 'justify-start'}`}
          title="System Diagnostics"
        >
          <ShieldCheck size={16} className="text-brand-success" />
          {(!collapsed || mobileOpen) && <span>System Diagnostics</span>}
        </button>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-brand-secondary dark:text-gray-400 hover:bg-brand-bg dark:hover:bg-brand-dark-card hover:text-brand-dark dark:hover:text-white transition-colors ${
            collapsed && !mobileOpen ? 'justify-center' : 'justify-start'
          }`}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun size={16} className="text-brand-warning" /> : <Moon size={16} />}
          {(!collapsed || mobileOpen) && <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>}
        </button>

        {/* Sign Out Button */}
        <button
          onClick={() => {
            logout();
            onCloseMobile?.();
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-brand-error hover:bg-brand-error/10 dark:hover:bg-brand-error/15 transition-colors ${
            collapsed && !mobileOpen ? 'justify-center' : 'justify-start'
          }`}
          title="Sign Out"
        >
          <LogOut size={16} />
          {(!collapsed || mobileOpen) && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  </>
  );
};
