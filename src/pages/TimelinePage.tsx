import React, { useState } from 'react';
import {
  GitCommit,
  Calendar,
  Layers,
  FileText,
  Filter,
  User,
  ArrowRight,
  Sparkles,
  GitCompare,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FeatureEvent } from '../types';

export const TimelinePage: React.FC = () => {
  const { events, features, records } = useWorkspace();

  const [selectedFeatureFilter, setSelectedFeatureFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Compare Mode State
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareFeatureId, setCompareFeatureId] = useState<string>('');
  const [compareDate1, setCompareDate1] = useState<string>('2024-05-10');
  const [compareDate2, setCompareDate2] = useState<string>('2024-05-22');
  const [compareResult, setCompareResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Selected Evidence Modal
  const [selectedEvidenceEvent, setSelectedEvidenceEvent] = useState<FeatureEvent | null>(null);
  const [liveGitHubOnly, setLiveGitHubOnly] = useState<boolean>(false);

  const SEED_SOURCE_IDS = [
    'gh-pr-104-otp-verified',
    'sec-audit-otp-mod',
    'prd-auth-v1-otp',
    'gh-pr-112-rename-checkout',
    'jira-bank-201-payment-approved',
    'gh-commit-gateway-router',
    'gh-commit-reconciliation-worker',
    'jira-bank-205-passkey-proposed',
  ];

  const isDemoRecord = (e: any): boolean => {
    if (!e) return false;
    if (e.isSample) return true;
    if (e.sourceRecordId && (e.sourceRecordId.startsWith('sample-') || e.sourceRecordId.includes('seed'))) return true;
    if (e.source_id && SEED_SOURCE_IDS.includes(e.source_id)) return true;
    if (e.id && SEED_SOURCE_IDS.includes(e.id)) return true;
    if (e.details && typeof e.details === 'string' && e.details.includes('"seed":true')) return true;
    return false;
  };

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (liveGitHubOnly && isDemoRecord(e)) {
      return false;
    }
    const matchesFeature =
      selectedFeatureFilter === 'ALL' || e.featureId === selectedFeatureFilter;
    const matchesType = selectedTypeFilter === 'ALL' || e.eventType === selectedTypeFilter;
    const matchesStart = !startDate || !e.eventDate || e.eventDate >= startDate;
    const matchesEnd = !endDate || !e.eventDate || e.eventDate <= endDate;
    return matchesFeature && matchesType && matchesStart && matchesEnd;
  }).sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));

  // Run Comparison
  const handleRunComparison = async () => {
    const featId = compareFeatureId || (features[0] ? features[0].id : '');
    if (!featId || !compareDate1 || !compareDate2) return;

    setIsComparing(true);
    try {
      const res = await fetch(
        `/api/timeline/compare?featureId=${featId}&date1=${compareDate1}&date2=${compareDate2}`
      );
      const data = await res.json();
      setCompareResult(data);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
            Temporal Feature Timeline
          </h1>
          <p className="text-xs text-brand-secondary mt-1">
            Append-only chronological record of software capability proposals, approvals, merges, and modifications.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCompareMode(!isCompareMode);
            if (!isCompareMode && features.length > 0 && !compareFeatureId) {
              setCompareFeatureId(features[0].id);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            isCompareMode
              ? 'bg-brand-primary text-white'
              : 'bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border text-brand-dark dark:text-white hover:border-brand-primary'
          }`}
        >
          <GitCompare size={15} />
          <span>{isCompareMode ? 'Exit State Comparison' : 'Compare States Across Dates'}</span>
        </button>
      </div>

      {/* Comparison Drawer / Panel */}
      {isCompareMode && (
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-primary/30 shadow-card space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare size={18} className="text-brand-primary" />
              <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                Temporal State Comparison Matrix
              </h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-brand-primary bg-brand-primary-light dark:bg-brand-primary/20 px-2 py-0.5 rounded-md">
              Delta Inspection
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-brand-secondary mb-1">
                Select Feature to Compare
              </label>
              <select
                value={compareFeatureId}
                onChange={(e) => setCompareFeatureId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-dark dark:text-white focus:outline-none"
              >
                {features.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.module})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-brand-secondary mb-1">
                Initial Date Point (T1)
              </label>
              <input
                type="date"
                value={compareDate1}
                onChange={(e) => setCompareDate1(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-dark dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-brand-secondary mb-1">
                Subsequent Date Point (T2)
              </label>
              <input
                type="date"
                value={compareDate2}
                onChange={(e) => setCompareDate2(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-dark dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={isComparing}
            className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm disabled:opacity-60 flex items-center gap-2"
          >
            <span>Evaluate Temporal Differences</span>
            <ArrowRight size={14} />
          </button>

          {/* Comparison Results Card */}
          {compareResult && (
            <div className="mt-4 pt-4 border-t border-brand-border dark:border-brand-dark-border space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border">
                  <span className="text-[10px] uppercase font-bold text-brand-secondary">
                    State at {compareResult.date1.date}
                  </span>
                  <p className="text-base font-extrabold text-brand-dark dark:text-white mt-1">
                    {compareResult.date1.status}
                  </p>
                  <p className="text-xs text-brand-secondary mt-1">
                    {compareResult.date1.latestEvent?.description || 'Feature not yet registered at this date'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-brand-primary-light/30 dark:bg-brand-primary/10 border border-brand-primary/20">
                  <span className="text-[10px] uppercase font-bold text-brand-primary">
                    State at {compareResult.date2.date}
                  </span>
                  <p className="text-base font-extrabold text-brand-dark dark:text-white mt-1">
                    {compareResult.date2.status}
                  </p>
                  <p className="text-xs text-brand-secondary mt-1">
                    {compareResult.date2.latestEvent?.description || 'No changes recorded'}
                  </p>
                </div>
              </div>

              {/* Events Between */}
              <div>
                <p className="text-xs font-bold text-brand-dark dark:text-white mb-2">
                  Intermediate Evolution Events ({compareResult.eventsBetween.length})
                </p>
                <div className="space-y-1.5">
                  {compareResult.eventsBetween.map((ev: any) => (
                    <div
                      key={ev.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-brand-dark-card border border-brand-border text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-brand-dark dark:text-white">
                        {ev.eventDate} — {ev.description}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary font-bold">
                        {ev.eventType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border">
        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
          {/* Feature Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <Layers size={14} className="text-brand-secondary" />
            <select
              value={selectedFeatureFilter}
              onChange={(e) => setSelectedFeatureFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white font-medium focus:outline-none"
            >
              <option value="ALL">All Features ({features.length})</option>
              {features.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter size={14} className="text-brand-secondary" />
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white font-medium focus:outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="FEATURE_PROPOSED">FEATURE_PROPOSED</option>
              <option value="FEATURE_APPROVED">FEATURE_APPROVED</option>
              <option value="FEATURE_IMPLEMENTED">FEATURE_IMPLEMENTED</option>
              <option value="FEATURE_MODIFIED">FEATURE_MODIFIED</option>
              <option value="FEATURE_RENAMED">FEATURE_RENAMED</option>
              <option value="FEATURE_REJECTED">FEATURE_REJECTED</option>
              <option value="FEATURE_DEPRECATED">FEATURE_DEPRECATED</option>
              <option value="FEATURE_REMOVED">FEATURE_REMOVED</option>
              <option value="REQUIREMENT_CHANGED">REQUIREMENT_CHANGED</option>
              <option value="ARCHITECTURE_CHANGED">ARCHITECTURE_CHANGED</option>
              <option value="BUG_FIXED">BUG_FIXED</option>
            </select>
          </div>
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-end flex-wrap">
          <button
            type="button"
            onClick={() => setLiveGitHubOnly(!liveGitHubOnly)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              liveGitHubOnly
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-brand-surface dark:bg-brand-dark-card text-brand-secondary border-brand-border dark:border-brand-dark-border hover:text-brand-dark dark:hover:text-white'
            }`}
            title="Toggle between all records and live GitHub events only"
          >
            <span className={`w-2 h-2 rounded-full ${liveGitHubOnly ? 'bg-emerald-500' : 'bg-brand-secondary/40'}`} />
            <span>Live GitHub only</span>
          </button>
          <Calendar size={14} className="text-brand-secondary ml-1" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
            className="px-2 py-1 rounded-lg border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white text-xs"
          />
          <span className="text-brand-secondary">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
            className="px-2 py-1 rounded-lg border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white text-xs"
          />
        </div>
      </div>

      {/* Chronological Vertical Timeline Feed */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-brand-border dark:before:bg-brand-dark-border">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-brand-secondary">
            No events match the selected filters.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const sourceRec = records.find((r) => r.id === evt.sourceRecordId);

            // Determine badge color
            let badgeClass = 'bg-brand-primary-light text-brand-primary border-brand-primary/20';
            if (evt.eventType === 'FEATURE_IMPLEMENTED') {
              badgeClass = 'bg-brand-success-light text-brand-success border-brand-success/20';
            } else if (evt.eventType === 'FEATURE_APPROVED') {
              badgeClass = 'bg-blue-100 text-blue-700 border-blue-200';
            } else if (evt.eventType === 'FEATURE_MODIFIED') {
              badgeClass = 'bg-purple-100 text-purple-700 border-purple-200';
            } else if (evt.eventType === 'FEATURE_PROPOSED') {
              badgeClass = 'bg-brand-warning-light text-brand-warning border-brand-warning/20';
            }

            return (
              <div key={evt.id} className="relative group">
                {/* Timeline Node Icon Anchor */}
                <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-brand-surface dark:bg-brand-dark-card border-2 border-brand-primary flex items-center justify-center shadow-subtle group-hover:scale-110 transition-transform">
                  <div className="w-2 h-2 rounded-full bg-brand-primary" />
                </div>

                {/* Milestone Card */}
                <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle hover:border-brand-primary/50 transition-all space-y-3">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-brand-dark dark:text-white">
                        {evt.featureName}
                      </span>
                      <span className="text-brand-secondary text-xs">•</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeClass}`}>
                        {evt.eventType.replace('FEATURE_', '')}
                      </span>
                      {evt.status === 'UNDER_REVIEW' && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-warning-light text-brand-warning">
                          Under Review
                        </span>
                      )}
                      {isDemoRecord(evt) && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                          Demo data
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-brand-secondary">
                      <Calendar size={13} />
                      <span className="font-bold text-brand-dark dark:text-gray-200">
                        {evt.eventDate || 'Undated'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-brand-text dark:text-gray-200 leading-relaxed font-medium">
                    {evt.description}
                  </p>

                  {/* State Transitions: Previous -> New */}
                  <div className="flex items-center gap-2 text-[11px] p-2.5 rounded-xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border/60 dark:border-brand-dark-border/60">
                    <span className="text-brand-secondary font-medium">State Transition:</span>
                    <span className="font-mono text-brand-secondary">{evt.previousState}</span>
                    <ArrowRight size={12} className="text-brand-primary" />
                    <span className="font-mono font-bold text-brand-dark dark:text-white">{evt.newState}</span>
                  </div>

                  {/* Verbatim Supporting Evidence Excerpt */}
                  <div
                    onClick={() => setSelectedEvidenceEvent(evt)}
                    className="p-3 rounded-2xl bg-brand-primary-light/20 dark:bg-brand-primary/5 border border-brand-primary/15 cursor-pointer hover:bg-brand-primary-light/40 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-brand-primary uppercase tracking-wider mb-1">
                      <span className="flex items-center gap-1">
                        <Sparkles size={12} />
                        <span>Verbatim Supporting Evidence</span>
                      </span>
                      <span className="flex items-center gap-0.5 text-brand-secondary hover:text-brand-primary">
                        <span>Inspect Excerpt</span>
                        <ChevronRight size={12} />
                      </span>
                    </div>
                    <p className="text-xs italic text-brand-text/90 dark:text-gray-300 line-clamp-2">
                      "{evt.evidenceText}"
                    </p>
                  </div>

                  {/* Card Footer: Person & Source Document */}
                  <div className="pt-2 border-t border-brand-border/60 dark:border-brand-dark-border/60 flex flex-wrap items-center justify-between text-[11px] text-brand-secondary gap-2">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-brand-secondary" />
                      <span>{evt.person || 'Document Specifier'}</span>
                    </div>

                    {sourceRec && (
                      <div className="flex items-center gap-1.5 font-medium text-brand-primary">
                        <FileText size={13} />
                        <span className="truncate max-w-[200px]">{sourceRec.fileName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Evidence Full Modal */}
      {selectedEvidenceEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-brand-surface dark:bg-brand-dark-card rounded-3xl p-6 shadow-elevated border border-brand-border dark:border-brand-dark-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-primary">
                <Sparkles size={18} />
                <h3 className="font-bold text-sm text-brand-dark dark:text-white">
                  Original Supporting Evidence
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvidenceEvent(null)}
                className="text-brand-secondary hover:text-brand-dark"
              >
                Close
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border font-serif text-sm leading-relaxed text-brand-dark dark:text-white">
              "{selectedEvidenceEvent.evidenceText}"
            </div>

            <div className="text-xs text-brand-secondary space-y-1">
              <p>
                <strong>Feature:</strong> {selectedEvidenceEvent.featureName}
              </p>
              <p>
                <strong>Event Date:</strong> {selectedEvidenceEvent.eventDate || 'Undated'}
              </p>
              <p>
                <strong>Source Record ID:</strong> {selectedEvidenceEvent.sourceRecordId}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEvidenceEvent(null)}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold"
              >
                Close Excerpt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
