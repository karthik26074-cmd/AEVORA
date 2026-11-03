import React from 'react';
import {
  FileText,
  Layers,
  GitCommit,
  Clock,
  CheckCircle,
  AlertTriangle,
  GitBranch,
  Upload,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  Plus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { RecentProjectHistory } from '../components/RecentProjectHistory';
import { LiveStreamController } from '../components/LiveStreamController';

interface OverviewPageProps {
  setCurrentTab: (tab: string) => void;
  onOpenUpload: () => void;
  onSelectFeature: (featureId: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  setCurrentTab,
  onOpenUpload,
  onSelectFeature,
}) => {
  const { currentWorkspace, stats, features, records, events, activityLogs, conflicts } =
    useWorkspace();
  const { user } = useAuth();

  // Status distribution for Chart B (All 10 Core Lifecycle States)
  const statusCounts = {
    PROPOSED: features.filter((f) => f.currentStatus === 'PROPOSED').length,
    UNDER_REVIEW: features.filter((f) => f.currentStatus === 'UNDER_REVIEW').length,
    APPROVED: features.filter((f) => f.currentStatus === 'APPROVED').length,
    IN_DEVELOPMENT: features.filter((f) => f.currentStatus === 'IN_DEVELOPMENT').length,
    IMPLEMENTED: features.filter((f) => f.currentStatus === 'IMPLEMENTED').length,
    MODIFIED: features.filter((f) => f.currentStatus === 'MODIFIED').length,
    RENAMED: features.filter((f) => f.currentStatus === 'RENAMED').length,
    DEPRECATED: features.filter((f) => f.currentStatus === 'DEPRECATED').length,
    REJECTED: features.filter((f) => f.currentStatus === 'REJECTED').length,
    REMOVED: features.filter((f) => f.currentStatus === 'REMOVED').length,
  };

  const statusChartData = [
    { name: 'Proposed', value: statusCounts.PROPOSED, color: '#D99B43' },
    { name: 'Under Review', value: statusCounts.UNDER_REVIEW, color: '#8B5CF6' },
    { name: 'Approved', value: statusCounts.APPROVED, color: '#7668F5' },
    { name: 'In Development', value: statusCounts.IN_DEVELOPMENT, color: '#3B82F6' },
    { name: 'Implemented', value: statusCounts.IMPLEMENTED, color: '#1C9B78' },
    { name: 'Modified', value: statusCounts.MODIFIED, color: '#EC4899' },
    { name: 'Renamed', value: statusCounts.RENAMED, color: '#06B6D4' },
    { name: 'Deprecated', value: statusCounts.DEPRECATED, color: '#85899A' },
    { name: 'Rejected', value: statusCounts.REJECTED, color: '#EF4444' },
    { name: 'Removed', value: statusCounts.REMOVED, color: '#F97316' },
  ].filter((d) => d.value > 0);

  // Fallback if empty
  if (statusChartData.length === 0) {
    statusChartData.push({ name: 'Active', value: 1, color: '#7668F5' });
  }

  // Temporal Evolution Distribution (Events grouped by date)
  const dateMap = new Map<string, number>();
  events.forEach((e) => {
    const d = e.eventDate || 'Recent';
    dateMap.set(d, (dateMap.get(d) || 0) + 1);
  });
  const temporalTimelineData = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, events: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (temporalTimelineData.length === 0) {
    temporalTimelineData.push({ date: 'Today', events: 0 });
  }

  // Recent changes
  const recentModified = features
    .slice()
    .sort((a, b) => (b.lastModifiedDate || '').localeCompare(a.lastModifiedDate || ''))
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
            Welcome back, {user?.displayName || 'Alex Morgan'}
          </h1>
          <p className="text-xs text-brand-secondary mt-1">
            Your product history, intelligently connected. Tracking {currentWorkspace?.name || 'Workspace'}.
          </p>
        </div>

        {/* Quick Actions Header Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover shadow-sm transition-all"
          >
            <Upload size={14} />
            <span>Add Record</span>
          </button>
          <button
            onClick={() => setCurrentTab('ai')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border text-brand-dark dark:text-white text-xs font-semibold hover:border-brand-primary transition-all"
          >
            <Sparkles size={14} className="text-brand-primary" />
            <span>Ask AI</span>
          </button>
        </div>
      </div>

      {/* Real-Time Live Data Stream Pipeline & Interactive Dispatcher */}
      <LiveStreamController />

      {/* Overview Statistics Grid (8 Metrics from Database) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
          <div className="flex items-center justify-between text-brand-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Project Records</span>
            <FileText size={16} className="text-brand-primary" />
          </div>
          <p className="text-2xl font-black text-brand-dark dark:text-white">{stats.totalRecords}</p>
          <span className="text-[10px] text-brand-secondary mt-1 block">Uploaded & ingested</span>
        </div>

        <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
          <div className="flex items-center justify-between text-brand-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Identified Features</span>
            <Layers size={16} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-brand-dark dark:text-white">{stats.totalFeatures}</p>
          <span className="text-[10px] text-brand-secondary mt-1 block">Permanent identities</span>
        </div>

        <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
          <div className="flex items-center justify-between text-brand-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Historical Events</span>
            <GitCommit size={16} className="text-brand-success" />
          </div>
          <p className="text-2xl font-black text-brand-dark dark:text-white">{stats.totalEvents}</p>
          <span className="text-[10px] text-brand-secondary mt-1 block">Validated lifecycle points</span>
        </div>

        <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
          <div className="flex items-center justify-between text-brand-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Modified Features</span>
            <Clock size={16} className="text-brand-warning" />
          </div>
          <p className="text-2xl font-black text-brand-dark dark:text-white">
            {stats.recentlyModifiedFeatures}
          </p>
          <span className="text-[10px] text-brand-secondary mt-1 block">Evolutionary iterations</span>
        </div>

        <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
          <div className="flex items-center justify-between text-brand-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Approved Decisions</span>
            <CheckCircle size={16} className="text-brand-success" />
          </div>
          <p className="text-2xl font-black text-brand-dark dark:text-white">{stats.approvedDecisions}</p>
          <span className="text-[10px] text-brand-secondary mt-1 block">Sign-offs & approvals</span>
        </div>

        <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
          <div className="flex items-center justify-between text-brand-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Implemented Features</span>
            <TrendingUp size={16} className="text-teal-500" />
          </div>
          <p className="text-2xl font-black text-brand-dark dark:text-white">{stats.implementedFeatures}</p>
          <span className="text-[10px] text-brand-secondary mt-1 block">Shipped & merged</span>
        </div>

        <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
          <div className="flex items-center justify-between text-brand-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Open Conflicts</span>
            <AlertTriangle size={16} className="text-brand-error" />
          </div>
          <p className="text-2xl font-black text-brand-dark dark:text-white">{stats.openConflicts}</p>
          <span className="text-[10px] text-brand-secondary mt-1 block">Contradictions flagged</span>
        </div>

        <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
          <div className="flex items-center justify-between text-brand-secondary mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Integrations</span>
            <GitBranch size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-black text-brand-dark dark:text-white">{stats.activeIntegrations}</p>
          <span className="text-[10px] text-brand-secondary mt-1 block">Live connected sources</span>
        </div>
      </div>

      {/* Visualizations Section (A. Product Evolution & B. Feature Status) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section A: Product Evolution Chart */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                Product Evolution Trajectory
              </h3>
              <p className="text-xs text-brand-secondary">
                Chronological event discovery across project development
              </p>
            </div>
            <button
              onClick={() => setCurrentTab('timeline')}
              className="text-xs font-semibold text-brand-primary flex items-center gap-1 hover:underline"
            >
              <span>Full Timeline</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={temporalTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="eventGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7668F5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7668F5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#85899A" />
                <YAxis tick={{ fontSize: 10 }} stroke="#85899A" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181A2B',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="#7668F5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#eventGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section B: Feature Status Distribution */}
        <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
              Feature Lifecycle Distribution
            </h3>
            <p className="text-xs text-brand-secondary">
              Current state breakdown across all modules
            </p>
          </div>

          <div className="h-48 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181A2B',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-brand-border/60 dark:border-brand-dark-border/60">
            {statusChartData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-brand-secondary">{item.name}:</span>
                <span className="font-bold text-brand-dark dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Project History (Timeline In Original Context) */}
      <RecentProjectHistory
        events={events}
        records={records}
        onViewFullTimeline={() => setCurrentTab('timeline')}
      />

      {/* Sections C, D, E: Recent Changes, Records, and Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section C: Recent Changes */}
        <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">Recent Changes</h3>
              <p className="text-xs text-brand-secondary">Latest feature modifications</p>
            </div>
            <button
              onClick={() => setCurrentTab('features')}
              className="text-xs font-semibold text-brand-primary hover:underline"
            >
              Explore
            </button>
          </div>

          <div className="space-y-2.5">
            {recentModified.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  onSelectFeature(f.id);
                  setCurrentTab('features');
                }}
                className="p-3 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 hover:bg-brand-bg dark:hover:bg-brand-dark border border-brand-border/60 dark:border-brand-dark-border/60 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-brand-dark dark:text-white">{f.name}</span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      f.currentStatus === 'IMPLEMENTED'
                        ? 'bg-brand-success-light text-brand-success'
                        : f.currentStatus === 'MODIFIED'
                        ? 'bg-indigo-100 text-brand-primary'
                        : 'bg-brand-warning-light text-brand-warning'
                    }`}
                  >
                    {f.currentStatus}
                  </span>
                </div>
                <p className="text-[11px] text-brand-secondary mt-1 truncate">{f.description}</p>
                <div className="flex items-center justify-between text-[10px] text-brand-secondary mt-2">
                  <span>{f.module}</span>
                  <span>Mod: {f.lastModifiedDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section D: Recent Records */}
        <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">Recent Records</h3>
              <p className="text-xs text-brand-secondary">Ingested PRDs, tickets & PRs</p>
            </div>
            <button
              onClick={() => setCurrentTab('records')}
              className="text-xs font-semibold text-brand-primary hover:underline"
            >
              All Records
            </button>
          </div>

          <div className="space-y-2.5">
            {records.slice(0, 4).map((r) => (
              <div
                key={r.id}
                onClick={() => setCurrentTab('records')}
                className="p-3 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 hover:bg-brand-bg dark:hover:bg-brand-dark border border-brand-border/60 dark:border-brand-dark-border/60 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-brand-dark dark:text-white truncate max-w-[180px]">
                    {r.fileName}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-secondary/15 text-brand-secondary">
                    {r.sourceType}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-brand-secondary mt-2">
                  <span>{r.author || 'Product Team'}</span>
                  <span className="text-brand-success font-medium">
                    {r.extractedEventCount} event(s) extracted
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section E: Live Activity */}
        <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">Live Activity</h3>
              <p className="text-xs text-brand-secondary">Real-time event stream</p>
            </div>
            <button
              onClick={() => setCurrentTab('activity')}
              className="text-xs font-semibold text-brand-primary hover:underline"
            >
              Live Feed
            </button>
          </div>

          <div className="space-y-2.5">
            {activityLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/60 dark:border-brand-dark-border/60"
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-bold text-brand-primary uppercase tracking-wider">{log.type}</span>
                  <span className="text-brand-secondary">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs font-semibold text-brand-dark dark:text-white">{log.title}</p>
                <p className="text-[11px] text-brand-secondary mt-0.5 truncate">{log.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
