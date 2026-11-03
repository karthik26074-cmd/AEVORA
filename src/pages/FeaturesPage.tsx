import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Plus,
  GitCommit,
  Clock,
  User,
  FileText,
  AlertCircle,
  ExternalLink,
  X,
  Edit2,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Feature, FeatureStatus } from '../types';

interface FeaturesPageProps {
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  setCurrentTab: (tab: string) => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({
  selectedFeatureId,
  setSelectedFeatureId,
  setCurrentTab,
}) => {
  const { features, events, records, conflicts, decisions, createFeature, updateFeature } =
    useWorkspace();

  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFeatName, setNewFeatName] = useState('');
  const [newFeatModule, setNewFeatModule] = useState('Core Platform');
  const [newFeatDesc, setNewFeatDesc] = useState('');

  // Selected feature details
  const activeFeature = features.find((f) => f.id === selectedFeatureId) || null;
  const activeFeatureEvents = activeFeature
    ? events.filter((e) => e.featureId === activeFeature.id).sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''))
    : [];
  const activeFeatureConflicts = activeFeature
    ? conflicts.filter((c) => c.featureId === activeFeature.id)
    : [];
  const activeFeatureDecisions = activeFeature
    ? decisions.filter((d) => d.featureId === activeFeature.id)
    : [];

  // Modules list
  const modules = Array.from(new Set(features.map((f) => f.module)));

  // Filter features
  const filteredFeatures = features.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    const matchesModule = moduleFilter === 'ALL' || f.module === moduleFilter;
    const matchesStatus = statusFilter === 'ALL' || f.currentStatus === statusFilter;
    return matchesSearch && matchesModule && matchesStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatName.trim()) return;
    await createFeature({
      name: newFeatName.trim(),
      module: newFeatModule,
      description: newFeatDesc.trim(),
    });
    setIsCreateOpen(false);
    setNewFeatName('');
    setNewFeatDesc('');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
            Feature Explorer
          </h1>
          <p className="text-xs text-brand-secondary mt-1">
            Permanent unique identities, alias tracking, dependency graphs, and historical lifecycle states.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm transition-all"
        >
          <Plus size={14} />
          <span>Register New Feature</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features, aliases, descriptions..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card text-brand-text dark:text-white focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card text-brand-text dark:text-white focus:outline-none"
          >
            <option value="ALL">All Modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card text-brand-text dark:text-white focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PROPOSED">PROPOSED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="IN_DEVELOPMENT">IN DEVELOPMENT</option>
            <option value="IMPLEMENTED">IMPLEMENTED</option>
            <option value="MODIFIED">MODIFIED</option>
            <option value="RENAMED">RENAMED</option>
            <option value="DEPRECATED">DEPRECATED</option>
            <option value="REMOVED">REMOVED</option>
          </select>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeatures.map((f) => (
          <div
            key={f.id}
            onClick={() => setSelectedFeatureId(f.id)}
            className={`p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border cursor-pointer transition-all hover:shadow-card group ${
              selectedFeatureId === f.id
                ? 'border-brand-primary ring-2 ring-brand-primary/20'
                : 'border-brand-border dark:border-brand-dark-border'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary flex items-center justify-center font-bold flex-shrink-0">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-brand-dark dark:text-white group-hover:text-brand-primary transition-colors">
                    {f.name}
                  </h3>
                  <span className="text-[10px] text-brand-secondary font-medium">{f.module}</span>
                </div>
              </div>

              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                  f.currentStatus === 'IMPLEMENTED'
                    ? 'bg-brand-success-light text-brand-success'
                    : f.currentStatus === 'MODIFIED'
                    ? 'bg-indigo-100 text-brand-primary'
                    : f.currentStatus === 'APPROVED'
                    ? 'bg-blue-100 text-blue-700'
                    : f.currentStatus === 'REJECTED' || f.currentStatus === 'REMOVED'
                    ? 'bg-rose-100 text-rose-700'
                    : f.currentStatus === 'RENAMED'
                    ? 'bg-teal-100 text-teal-700'
                    : f.currentStatus === 'IN_DEVELOPMENT' || f.currentStatus === 'IN_PROGRESS'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-brand-warning-light text-brand-warning'
                }`}
              >
                {f.currentStatus}
              </span>
            </div>

            <p className="text-xs text-brand-secondary mt-3 line-clamp-2 leading-relaxed">
              {f.description}
            </p>

            {/* Aliases */}
            {f.aliases.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-brand-secondary font-medium">Aliases:</span>
                {f.aliases.map((alias) => (
                  <span
                    key={alias}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-bg dark:bg-brand-dark text-brand-secondary border border-brand-border/60 dark:border-brand-dark-border/60"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            )}

            {/* Footer Metadata */}
            <div className="mt-4 pt-3 border-t border-brand-border/60 dark:border-brand-dark-border/60 flex items-center justify-between text-[11px] text-brand-secondary">
              <span className="flex items-center gap-1">
                <GitCommit size={12} className="text-brand-primary" />
                <span>{f.historicalEventCount} event(s)</span>
              </span>
              <span>Updated: {f.lastModifiedDate}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Details Modal / Drawer */}
      {activeFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] bg-brand-surface dark:bg-brand-dark-card rounded-3xl shadow-elevated border border-brand-border dark:border-brand-dark-border flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-bold">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-brand-dark dark:text-white">
                      {activeFeature.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary uppercase">
                      {activeFeature.currentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-brand-secondary">
                    Module: {activeFeature.module} • Permanent ID: <code className="font-mono">{activeFeature.id}</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeatureId(null)}
                className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg dark:hover:bg-brand-dark"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-brand-secondary mb-1">
                  Description
                </h4>
                <p className="text-xs text-brand-text dark:text-gray-300 leading-relaxed bg-brand-bg/50 dark:bg-brand-dark/50 p-3.5 rounded-2xl border border-brand-border/60 dark:border-brand-dark-border/60">
                  {activeFeature.description}
                </p>
              </div>

              {/* Contradiction / Conflict Warning if active */}
              {activeFeatureConflicts.length > 0 && (
                <div className="p-4 rounded-2xl bg-brand-error-light/50 dark:bg-brand-error/15 border border-brand-error/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-error">
                    <ShieldAlert size={16} />
                    <span>Active Historical Conflict Flagged</span>
                  </div>
                  {activeFeatureConflicts.map((c) => (
                    <div key={c.id} className="text-xs text-brand-text dark:text-gray-200">
                      <p className="font-semibold">{c.title}</p>
                      <p className="text-brand-secondary text-[11px] mt-0.5">{c.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Historical Timeline Milestones */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-brand-secondary">
                    Historical Event Trail ({activeFeatureEvents.length})
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedFeatureId(null);
                      setCurrentTab('timeline');
                    }}
                    className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1"
                  >
                    <span>Inspect Timeline</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div className="space-y-2">
                  {activeFeatureEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-2xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-dark dark:text-white">
                          {evt.eventDate || 'Undated'} — {evt.eventType.replace('FEATURE_', '')}
                        </span>
                        {evt.person && (
                          <span className="text-[10px] text-brand-secondary">by {evt.person}</span>
                        )}
                      </div>
                      <p className="text-brand-text dark:text-gray-300">{evt.description}</p>
                      <div className="text-[11px] font-mono text-brand-secondary italic">
                        "{evt.evidenceText}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* People & Dependencies */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/60">
                  <span className="font-bold text-[10px] uppercase text-brand-secondary">
                    Related People & Roles
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeFeature.relatedPeople.length > 0 ? (
                      activeFeature.relatedPeople.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-brand-dark-card border border-brand-border text-brand-dark dark:text-white font-medium"
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-brand-secondary">None specified</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/60">
                  <span className="font-bold text-[10px] uppercase text-brand-secondary">
                    Feature Dependencies
                  </span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeFeature.dependencies.length > 0 ? (
                      activeFeature.dependencies.map((dep) => (
                        <span
                          key={dep}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-brand-dark-card border border-brand-border text-brand-dark dark:text-white font-medium"
                        >
                          {dep}
                        </span>
                      ))
                    ) : (
                      <span className="text-brand-secondary">No dependencies</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark/50 flex justify-end">
              <button
                onClick={() => setSelectedFeatureId(null)}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Feature Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-brand-surface dark:bg-brand-dark-card rounded-3xl p-6 shadow-elevated border border-brand-border dark:border-brand-dark-border">
            <h3 className="font-bold text-base text-brand-dark dark:text-white">
              Register New Product Feature
            </h3>
            <p className="text-xs text-brand-secondary mt-1">
              Initialize a permanent feature entity to track its historical lifecycle.
            </p>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                  Feature Name *
                </label>
                <input
                  type="text"
                  value={newFeatName}
                  onChange={(e) => setNewFeatName(e.target.value)}
                  placeholder="e.g. Biometric Login"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white focus:outline-none focus:border-brand-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                  Module
                </label>
                <input
                  type="text"
                  value={newFeatModule}
                  onChange={(e) => setNewFeatModule(e.target.value)}
                  placeholder="e.g. Authentication & Security"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                  Initial Description
                </label>
                <textarea
                  rows={3}
                  value={newFeatDesc}
                  onChange={(e) => setNewFeatDesc(e.target.value)}
                  placeholder="Scope, intended capability, and context..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white focus:outline-none focus:border-brand-primary resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 text-xs text-brand-secondary hover:text-brand-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold"
                >
                  Register Feature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
