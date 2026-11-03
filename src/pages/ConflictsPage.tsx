import React, { useState } from 'react';
import {
  Scale,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  Layers,
  Check,
  Clock,
  User,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { ConflictItem } from '../types';

export const ConflictsPage: React.FC = () => {
  const { conflicts, decisions, resolveConflict, reviewConflict } = useWorkspace();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'conflicts' | 'decisions'>('conflicts');
  const [resolvingConflict, setResolvingConflict] = useState<ConflictItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingConflict || !resolutionNote.trim()) return;
    await resolveConflict(
      resolvingConflict.id,
      resolutionNote.trim(),
      user?.displayName || 'Lead Architect'
    );
    setResolvingConflict(null);
    setResolutionNote('');
  };

  const openCount = conflicts.filter((c) => c.status === 'OPEN').length;
  const reviewedCount = conflicts.filter((c) => c.status === 'REVIEWED').length;
  const resolvedCount = conflicts.filter((c) => c.status === 'RESOLVED').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
            Decisions & Historical Conflicts
          </h1>
          <p className="text-xs text-brand-secondary mt-1">
            Reconcile contradictions between PRDs, security audits, tickets, and architecture decisions without rewriting history.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-brand-surface dark:bg-brand-dark-card p-1 border border-brand-border dark:border-brand-dark-border">
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'conflicts'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Historical Conflicts ({conflicts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'decisions'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
            }`}
          >
            <Scale size={14} />
            <span>Decision Registry ({decisions.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'conflicts' && (
        <div className="space-y-6">
          {/* Status Metric Pills */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
              <span className="text-[10px] font-bold text-brand-error uppercase tracking-wider">
                Open Conflicts
              </span>
              <p className="text-2xl font-black text-brand-dark dark:text-white mt-1">{openCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
              <span className="text-[10px] font-bold text-brand-warning uppercase tracking-wider">
                Reviewed
              </span>
              <p className="text-2xl font-black text-brand-dark dark:text-white mt-1">{reviewedCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle">
              <span className="text-[10px] font-bold text-brand-success uppercase tracking-wider">
                Resolved
              </span>
              <p className="text-2xl font-black text-brand-dark dark:text-white mt-1">{resolvedCount}</p>
            </div>
          </div>

          {/* Conflict Cards List */}
          <div className="space-y-4">
            {conflicts.length === 0 ? (
              <div className="p-12 text-center text-xs text-brand-secondary bg-brand-surface dark:bg-brand-dark-card rounded-3xl border border-brand-border">
                No historical conflicts detected. Product records are consistent.
              </div>
            ) : (
              conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-brand-error-light dark:bg-brand-error/20 text-brand-error flex items-center justify-center font-bold">
                        <ShieldAlert size={16} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                          {conflict.title}
                        </h3>
                        <p className="text-xs text-brand-secondary">
                          Feature: <span className="font-semibold">{conflict.featureName}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-auto ${
                        conflict.status === 'RESOLVED'
                          ? 'bg-brand-success-light text-brand-success'
                          : conflict.status === 'REVIEWED'
                          ? 'bg-brand-warning-light text-brand-warning'
                          : 'bg-brand-error-light text-brand-error'
                      }`}
                    >
                      {conflict.status}
                    </span>
                  </div>

                  <p className="text-xs text-brand-text dark:text-gray-300 bg-brand-bg/60 dark:bg-brand-dark/60 p-3.5 rounded-2xl border border-brand-border/60 dark:border-brand-dark-border/60">
                    <strong>Contradiction Rationale:</strong> {conflict.reason}
                  </p>

                  {/* Conflicting Statements Comparison Matrix */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {conflict.conflictingStatements.map((stmt, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-brand-bg/40 dark:bg-brand-dark/40 border border-brand-border/60 dark:border-brand-dark-border/60 space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-brand-secondary">
                          <span className="flex items-center gap-1.5 text-brand-dark dark:text-white">
                            <FileText size={13} className="text-brand-primary" />
                            <span>{stmt.sourceName}</span>
                          </span>
                          <span className="font-mono text-brand-secondary">{stmt.date}</span>
                        </div>
                        <p className="text-xs text-brand-text dark:text-gray-200">{stmt.statement}</p>
                        {stmt.evidenceText && (
                          <p className="text-[11px] font-mono text-brand-secondary italic border-l-2 border-brand-primary/50 pl-2">
                            "{stmt.evidenceText}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resolution Note if resolved */}
                  {conflict.resolutionNote && (
                    <div className="p-4 rounded-2xl bg-brand-success-light/30 dark:bg-brand-success/10 border border-brand-success/30 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-brand-success font-bold">
                        <CheckCircle size={14} />
                        <span>Reconciliation Note (Recorded by {conflict.resolvedBy})</span>
                      </div>
                      <p className="text-brand-text dark:text-gray-200">{conflict.resolutionNote}</p>
                    </div>
                  )}

                  {/* Action Bar */}
                  {conflict.status !== 'RESOLVED' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/60">
                      {conflict.status === 'OPEN' && (
                        <button
                          onClick={() => reviewConflict(conflict.id)}
                          className="px-3 py-1.5 rounded-xl border border-brand-border text-xs font-semibold text-brand-dark dark:text-white hover:bg-brand-bg"
                        >
                          Mark as Reviewed
                        </button>
                      )}
                      <button
                        onClick={() => setResolvingConflict(conflict)}
                        className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm"
                      >
                        Add Resolution Note
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'decisions' && (
        <div className="bg-brand-surface dark:bg-brand-dark-card rounded-3xl border border-brand-border dark:border-brand-dark-border shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark/50 text-brand-secondary font-semibold">
                  <th className="py-3 px-4">Decision Title</th>
                  <th className="py-3 px-4">Feature Affected</th>
                  <th className="py-3 px-4">Decider / Sign-off</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Evidence Excerpt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 dark:divide-brand-dark-border/60">
                {decisions.map((dec) => (
                  <tr key={dec.id} className="hover:bg-brand-bg/40 dark:hover:bg-brand-dark/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-brand-dark dark:text-white max-w-[200px] truncate">
                      {dec.title}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-brand-primary">
                      {dec.featureName || 'Architecture'}
                    </td>
                    <td className="py-3.5 px-4 text-brand-secondary">
                      {dec.decider || 'Architecture Board'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-brand-secondary">{dec.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-success-light text-brand-success uppercase">
                        {dec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-brand-secondary italic truncate max-w-[250px]">
                      "{dec.evidenceText || dec.description}"
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolve Conflict Modal */}
      {resolvingConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-brand-surface dark:bg-brand-dark-card rounded-3xl p-6 shadow-elevated border border-brand-border dark:border-brand-dark-border space-y-4">
            <h3 className="font-bold text-base text-brand-dark dark:text-white">
              Reconcile Historical Conflict
            </h3>
            <p className="text-xs text-brand-secondary">
              Provide an authoritative reconciliation note for "{resolvingConflict.title}". Original conflicting statements remain preserved in perpetuity.
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-brand-dark dark:text-white mb-1">
                  Resolution & Policy Note *
                </label>
                <textarea
                  rows={4}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Explain which directive or requirement takes precedence and the architectural justification..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-text dark:text-white focus:outline-none focus:border-brand-primary resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingConflict(null)}
                  className="px-3 py-2 text-xs text-brand-secondary hover:text-brand-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold"
                >
                  Save Resolution Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
