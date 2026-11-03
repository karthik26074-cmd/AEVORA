import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle,
  GitPullRequest,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface GuidedDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const GuidedDemoModal: React.FC<GuidedDemoModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const { simulateDemoEvent, refreshData } = useWorkspace();
  const [step, setStep] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await simulateDemoEvent();
      setSimulationResult(res);
      setStep(3);
    } catch (err) {
      console.error('Demo simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-brand-surface dark:bg-brand-dark-card rounded-3xl shadow-elevated border border-brand-border dark:border-brand-dark-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/15 text-brand-primary flex items-center justify-center font-bold">
              <Play size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-brand-dark dark:text-white">
                AEVORA Live Architecture Demonstration
              </h3>
              <p className="text-xs text-brand-secondary">
                Step {step} of 4 • Temporal Evolution & Multi-Tab Real-Time Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg dark:hover:bg-brand-dark transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-primary-light/50 dark:bg-brand-primary/10 border border-brand-primary/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary bg-white dark:bg-brand-dark px-2 py-0.5 rounded-md">
                  Scenario Overview
                </span>
                <h4 className="font-bold text-sm text-brand-dark dark:text-white mt-2">
                  Feature: OTP Verification Lifecycle
                </h4>
                <p className="text-xs text-brand-secondary mt-1">
                  AEVORA tracks this feature from its initial PRD proposal through architecture sign-off, GitHub PR implementation, and security audit modification.
                </p>
              </div>

              <div className="space-y-2 border border-brand-border dark:border-brand-dark-border rounded-2xl p-4 bg-brand-bg/30 dark:bg-brand-dark/30">
                <p className="text-[11px] font-bold text-brand-secondary uppercase tracking-wider">
                  Existing Recorded Lifecycle:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-brand-dark-card border border-brand-border/60 dark:border-brand-dark-border/60">
                    <span className="font-medium text-brand-dark dark:text-white">10 May — Proposed</span>
                    <span className="text-brand-secondary">PRD-2024-Authentication-v1.0.md</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-brand-dark-card border border-brand-border/60 dark:border-brand-dark-border/60">
                    <span className="font-medium text-brand-dark dark:text-white">12 May — Approved</span>
                    <span className="text-brand-secondary">ARCH-REVIEW-2024-05-12.md</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-brand-dark-card border border-brand-border/60 dark:border-brand-dark-border/60">
                    <span className="font-medium text-brand-dark dark:text-white">18 May — Implemented</span>
                    <span className="text-brand-secondary">GitHub PR #104</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-brand-dark-card border border-brand-border/60 dark:border-brand-dark-border/60">
                    <span className="font-medium text-brand-dark dark:text-white">22 May — Modified (120s limit)</span>
                    <span className="text-brand-secondary">SEC-AUDIT-2024-05-22.md</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToTab('timeline');
                  }}
                  className="text-xs font-semibold text-brand-primary flex items-center gap-1 hover:underline"
                >
                  <ExternalLink size={14} />
                  <span>Inspect Timeline View</span>
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover flex items-center gap-1.5 shadow-sm"
                >
                  <span>Next: Trigger Live Ingestion</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-dark dark:text-white">
                  <GitPullRequest size={16} className="text-brand-primary" />
                  <span>Incoming GitHub Pull Request Webhook Event</span>
                </div>
                <p className="text-xs text-brand-secondary mt-1">
                  We will dispatch a simulated GitHub PR #142 webhook to <code>/api/demo/simulate-otp-modification</code>:
                </p>
                <div className="mt-3 p-3 bg-brand-surface dark:bg-brand-dark-card rounded-xl text-[11px] font-mono text-brand-secondary border border-brand-border dark:border-brand-dark-border">
                  <p className="text-brand-dark dark:text-white font-bold">
                    PR #142: feat(otp): add biometric passkey fallback & reduce throttle to 60s
                  </p>
                  <p className="mt-1 text-brand-secondary">
                    Branch: feat/passkey-otp {'->'} main (Merged by Architecture Board)
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-brand-warning-light dark:bg-brand-warning/10 border border-brand-warning/30 flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-brand-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-brand-text dark:text-gray-300">
                  <strong>Multi-Tab Verification:</strong> Open AEVORA in a second browser window or tab. When you click Simulate below, the second tab will update its timeline, activity feed, and dashboard instantly via WebSocket without any reload!
                </p>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-brand-secondary hover:text-brand-dark"
                >
                  Back
                </button>
                <button
                  onClick={handleSimulate}
                  disabled={isSimulating}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover flex items-center gap-2 shadow-sm disabled:opacity-60"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Processing Through Gemini Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      <span>Simulate Live Event Ingestion</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-success-light dark:bg-brand-success/15 border border-brand-success/30 flex items-center gap-3">
                <CheckCircle size={24} className="text-brand-success flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-brand-dark dark:text-white">
                    Event Successfully Processed & Broadcast!
                  </h4>
                  <p className="text-xs text-brand-secondary">
                    Gemini AI extracted feature events from the PR and updated the persistent timeline, knowledge graph, and audit feed in real time.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border">
                  <span className="text-[10px] text-brand-secondary uppercase font-bold">Feature Updated</span>
                  <p className="font-bold text-brand-dark dark:text-white mt-1">OTP Verification</p>
                  <p className="text-[11px] text-brand-success font-medium">Status: MODIFIED</p>
                </div>
                <div className="p-3 rounded-xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border">
                  <span className="text-[10px] text-brand-secondary uppercase font-bold">Real-Time Sync</span>
                  <p className="font-bold text-brand-dark dark:text-white mt-1">WebSocket Broadcast</p>
                  <p className="text-[11px] text-brand-primary font-medium">All Connected Tabs Synchronized</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToTab('timeline');
                  }}
                  className="px-4 py-2 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs font-semibold text-brand-dark dark:text-white hover:bg-brand-bg dark:hover:bg-brand-dark"
                >
                  View in Feature Timeline
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover flex items-center gap-1.5 shadow-sm"
                >
                  <span>Next: Ask AEVORA Intelligence</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-primary-light/40 dark:bg-brand-primary/10 border border-brand-primary/20">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-primary">
                  <Sparkles size={16} />
                  <span>Evidence-Based Historical Verification</span>
                </div>
                <p className="text-xs text-brand-secondary mt-1">
                  Ask AEVORA Intelligence to explain the latest modifications with direct document citations and timestamps.
                </p>
              </div>

              <div className="p-3 bg-brand-bg dark:bg-brand-dark rounded-xl text-xs space-y-2 border border-brand-border dark:border-brand-dark-border">
                <p className="text-[11px] font-bold text-brand-secondary uppercase">Recommended Prompts:</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToTab('ai');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-white dark:bg-brand-dark-card border border-brand-border/60 hover:border-brand-primary transition-all text-xs font-medium text-brand-dark dark:text-white flex items-center justify-between"
                  >
                    <span>"What changes happened to the OTP feature recently?"</span>
                    <Sparkles size={13} className="text-brand-primary" />
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToTab('ai');
                    }}
                    className="w-full text-left p-2 rounded-lg bg-white dark:bg-brand-dark-card border border-brand-border/60 hover:border-brand-primary transition-all text-xs font-medium text-brand-dark dark:text-white flex items-center justify-between"
                  >
                    <span>"Were there conflicting decisions about OTP expiration?"</span>
                    <Sparkles size={13} className="text-brand-primary" />
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-brand-secondary hover:text-brand-dark"
                >
                  Restart Demo
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToTab('ai');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles size={14} />
                  <span>Launch AEVORA Intelligence</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
