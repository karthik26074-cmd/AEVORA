import React, { useState } from 'react';
import {
  Activity,
  GitPullRequest,
  FileText,
  Layers,
  AlertTriangle,
  CheckCircle,
  Filter,
  Clock,
  Sparkles,
  GitCommit,
  Radio,
  User,
  GitBranch,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface ActivityPageProps {
  defaultView?: 'STREAM' | 'DEVELOPERS';
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ defaultView = 'STREAM' }) => {
  const { activityLogs, features, events, records, isLiveConnected } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'STREAM' | 'DEVELOPERS'>(defaultView);
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [featureFilter, setFeatureFilter] = useState('ALL');
  const [developerFilter, setDeveloperFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Extract distinct developers/authors from events and records
  const developerSet = new Set<string>();
  events.forEach((e) => {
    if (e.person && e.person.trim().length > 1) developerSet.add(e.person);
  });
  records.forEach((r) => {
    if (r.author && r.author.trim().length > 1) developerSet.add(r.author);
  });
  const developers = Array.from(developerSet);

  const filteredLogs = activityLogs.filter((log) => {
    const matchesSource = sourceFilter === 'ALL' || log.source === sourceFilter;
    const matchesFeature = featureFilter === 'ALL' || log.featureId === featureFilter;
    const matchesSearch =
      !search ||
      log.title.toLowerCase().includes(search.toLowerCase()) ||
      log.description.toLowerCase().includes(search.toLowerCase());
    return matchesSource && matchesFeature && matchesSearch;
  });

  // Developer updates from verified events
  const developerActivities = events
    .filter((e) => e.person && (developerFilter === 'ALL' || e.person === developerFilter))
    .sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'GITHUB':
        return <GitPullRequest size={15} className="text-purple-500" />;
      case 'GEMINI_AI':
        return <Sparkles size={15} className="text-brand-primary" />;
      case 'MANUAL':
        return <FileText size={15} className="text-blue-500" />;
      case 'SYSTEM':
        return <Activity size={15} className="text-teal-500" />;
      default:
        return <Clock size={15} className="text-brand-secondary" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
              Live Activity & Developer Updates
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-brand-success/30 bg-brand-success-light text-brand-success text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
              <span>{isLiveConnected ? 'Streaming Live' : 'Listening'}</span>
            </div>
          </div>
          <p className="text-xs text-brand-secondary mt-1">
            Real-time audit log of commits, PR merges, approvals, AI extractions, and verified developer contributions.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border rounded-2xl shadow-subtle self-start md:self-auto">
          <button
            onClick={() => setActiveTab('STREAM')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'STREAM'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
            }`}
          >
            <Activity size={14} />
            <span>Event Stream</span>
          </button>
          <button
            onClick={() => setActiveTab('DEVELOPERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'DEVELOPERS'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
            }`}
          >
            <User size={14} />
            <span>Developer Updates</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-dark dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {activeTab === 'STREAM' ? (
            <>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card text-brand-text dark:text-white focus:outline-none"
              >
                <option value="ALL">All Sources</option>
                <option value="GITHUB">GitHub Webhooks</option>
                <option value="GEMINI_AI">Gemini AI</option>
                <option value="MANUAL">Manual Document Ingestion</option>
                <option value="SYSTEM">System Engine</option>
              </select>

              <select
                value={featureFilter}
                onChange={(e) => setFeatureFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card text-brand-text dark:text-white focus:outline-none"
              >
                <option value="ALL">All Features</option>
                {features.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <select
              value={developerFilter}
              onChange={(e) => setDeveloperFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card text-brand-text dark:text-white focus:outline-none"
            >
              <option value="ALL">All Developers ({developers.length})</option>
              {developers.map((dev) => (
                <option key={dev} value={dev}>
                  {dev}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'STREAM' ? (
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-brand-secondary bg-brand-surface dark:bg-brand-dark-card rounded-3xl border border-brand-border">
              No live events match your filter criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle hover:border-brand-primary/40 transition-all flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-2xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getSourceIcon(log.source)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-xs text-brand-dark dark:text-white">
                        {log.title}
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-bg dark:bg-brand-dark border border-brand-border text-brand-secondary">
                        {log.source}
                      </span>
                      {log.featureName && (
                        <span className="text-[10px] font-semibold text-brand-primary">
                          • {log.featureName}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-brand-secondary flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-brand-secondary mt-1">{log.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Developer Updates View */
        <div className="space-y-4">
          {developerActivities.length === 0 ? (
            <div className="p-12 text-center text-xs text-brand-secondary bg-brand-surface dark:bg-brand-dark-card rounded-3xl border border-brand-border">
              No verified developer activity recorded for the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {developerActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-brand-primary-light text-brand-primary dark:bg-brand-primary/20 flex items-center justify-center font-bold">
                        <User size={16} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-brand-dark dark:text-white">
                          {act.person}
                        </h4>
                        <span className="text-[10px] font-mono text-brand-secondary">
                          {act.eventDate || 'Recent'}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      {act.eventType.replace('FEATURE_', '')}
                    </span>
                  </div>

                  <p className="text-xs text-brand-dark dark:text-gray-200 font-medium">
                    {act.description}
                  </p>

                  {act.evidenceText && (
                    <div className="p-3 rounded-2xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border/60 text-[11px] text-brand-secondary italic">
                      "{act.evidenceText.slice(0, 160)}..."
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-brand-border/60 text-[10px] text-brand-secondary">
                    <span className="font-semibold text-brand-primary">Feature: {act.featureName}</span>
                    <span className="flex items-center gap-1 text-brand-success font-medium">
                      <ShieldCheck size={12} />
                      Verified Source
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
