import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Play,
  Square,
  Zap,
  Sparkles,
  GitPullRequest,
  GitCommit,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  RotateCcw,
  Send,
  Loader2,
  Check,
  Activity,
  Layers,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export const LiveStreamController: React.FC = () => {
  const { currentWorkspace, isLiveConnected, refreshData } = useWorkspace();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamCount, setStreamCount] = useState(0);
  const [lastDispatched, setLastDispatched] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const timerRef = useRef<any>(null);

  const categories = [
    {
      id: 'PULL_REQUEST',
      label: 'Merge GitHub PR',
      desc: 'feat(passkey): WebAuthn biometric authentication',
      icon: GitPullRequest,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      id: 'COMMIT',
      label: 'Push Commit',
      desc: 'fix(security): Enforce 60s OTP expiration window',
      icon: GitCommit,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
      id: 'DECISION',
      label: 'Architecture Sign-Off',
      desc: 'ADR: Approved gRPC microservices mesh for payments',
      icon: CheckCircle2,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
    {
      id: 'SECURITY',
      label: 'Security Directive',
      desc: 'SEC-AUDIT: Mandate HMAC-SHA256 signature verification',
      icon: ShieldAlert,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    },
  ];

  // Dispatch a single live event
  const dispatchEvent = async (category: string, custom?: { title?: string; content?: string }) => {
    if (!currentWorkspace) return;
    setIsDispatching(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/demo/dispatch-live-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          eventCategory: category,
          title: custom?.title,
          content: custom?.content,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStreamCount((prev) => prev + 1);
        setLastDispatched(data.eventTitle || 'Live Event Ingested');
        setStatusMessage(`⚡ Broadcasted via WebSockets at ${new Date().toLocaleTimeString()}`);
        refreshData();
      }
    } catch (err: any) {
      console.error('[Live Stream] Error dispatching event:', err);
      setStatusMessage('Dispatch failed: ' + (err.message || 'Network error'));
    } finally {
      setIsDispatching(false);
    }
  };

  // Continuous auto-streaming interval
  useEffect(() => {
    if (isStreaming) {
      let step = 0;
      const streamSequence = ['PULL_REQUEST', 'COMMIT', 'DECISION', 'SECURITY'];

      timerRef.current = setInterval(() => {
        const cat = streamSequence[step % streamSequence.length];
        dispatchEvent(cat);
        step++;
      }, 5000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming, currentWorkspace]);

  // Clear workspace data (Start clean slate for judges)
  const handleClearData = async () => {
    if (!currentWorkspace) return;
    if (!window.confirm('Clear all pre-existing records to start a 100% clean real-time session? You can restore sample data anytime.')) {
      return;
    }

    setIsDispatching(true);
    try {
      await fetch(`/api/workspaces/${currentWorkspace.id}/data`, { method: 'DELETE' });
      setStreamCount(0);
      setLastDispatched(null);
      setStatusMessage('Workspace cleared. Ready for live real-time stream ingestion.');
      refreshData();
    } catch (err: any) {
      console.error('Error clearing workspace:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  // Restore sample data
  const handleRestoreSample = async () => {
    setIsDispatching(true);
    try {
      await fetch('/api/workspaces/seed-sample', { method: 'POST' });
      setStatusMessage('Sample workspace data restored.');
      refreshData();
    } catch (err: any) {
      console.error('Error restoring sample:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  // Submit custom live note
  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    dispatchEvent('CUSTOM', {
      title: customText.slice(0, 50),
      content: customText,
    });
    setCustomText('');
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-brand-surface via-brand-surface to-brand-primary/5 dark:from-brand-dark-card dark:via-brand-dark-card dark:to-brand-primary/10 border-2 border-brand-primary/30 shadow-subtle space-y-5">
      {/* Top Banner: Real-Time Stream Status & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-brand-border dark:border-brand-dark-border">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-4 h-4 rounded-full ${
                isStreaming
                  ? 'bg-rose-500 animate-ping absolute'
                  : isLiveConnected
                  ? 'bg-emerald-500/50 animate-ping absolute'
                  : 'bg-gray-400'
              }`}
            />
            <span
              className={`w-3.5 h-3.5 rounded-full relative ${
                isStreaming ? 'bg-rose-600' : isLiveConnected ? 'bg-emerald-500' : 'bg-gray-400'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-brand-dark dark:text-white tracking-tight flex items-center gap-1.5">
                <Radio size={16} className={isStreaming ? 'text-rose-600 animate-pulse' : 'text-brand-primary'} />
                <span>Live Real-Time Stream Pipeline</span>
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isStreaming
                    ? 'bg-rose-500 text-white animate-pulse'
                    : isLiveConnected
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                {isStreaming ? '🔴 Auto-Streaming Active' : 'WebSocket Ready (60fps)'}
              </span>
            </div>
            <p className="text-xs text-brand-secondary mt-0.5">
              Demonstrates real-time event extraction and multi-tab synchronization with current live timestamps.
            </p>
          </div>
        </div>

        {/* Streaming Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isStreaming
                ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/20'
                : 'bg-brand-primary hover:bg-brand-primary-hover text-white'
            }`}
          >
            {isStreaming ? (
              <>
                <Square size={13} fill="currentColor" />
                <span>Stop Stream</span>
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                <span>Start Live Stream (5s interval)</span>
              </>
            )}
          </button>

          <button
            onClick={handleClearData}
            disabled={isDispatching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-all disabled:opacity-50"
            title="Wipe old sample records to show judges a 100% clean real-time session"
          >
            <Trash2 size={13} />
            <span>Clear Old Records</span>
          </button>

          <button
            onClick={handleRestoreSample}
            disabled={isDispatching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border dark:border-brand-dark-border text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg text-xs font-semibold transition-all disabled:opacity-50"
            title="Restore default sample records"
          >
            <RotateCcw size={13} />
            <span>Restore Samples</span>
          </button>
        </div>
      </div>

      {/* Instant Live Event Trigger Buttons for Judges */}
      <div>
        <span className="text-[11px] font-bold text-brand-secondary uppercase tracking-wider block mb-2.5">
          One-Click Live Event Dispatches (Instant Gemini Extraction & WebSocket Broadcast):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => dispatchEvent(c.id)}
                disabled={isDispatching}
                className={`p-3 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex flex-col justify-between ${c.color}`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <span className="font-extrabold text-xs">{c.label}</span>
                  </div>
                  <Zap size={13} className="opacity-70" />
                </div>
                <p className="text-[11px] opacity-80 line-clamp-2 mt-1">{c.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Custom Text Ingest Box for Judges */}
      <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-2 pt-1">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Or type/paste any real update: e.g. 'PR #107: Added biometric login, approved by Sarah today...'"
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border text-xs text-brand-dark dark:text-white placeholder:text-brand-secondary/60 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <button
          type="submit"
          disabled={!customText.trim() || isDispatching}
          className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
        >
          {isDispatching ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          <span>Ingest Live in Real-Time</span>
        </button>
      </form>

      {/* Live Feedback Status Line */}
      {(statusMessage || lastDispatched) && (
        <div className="flex items-center justify-between text-[11px] p-2.5 rounded-xl bg-brand-bg/70 dark:bg-brand-dark/70 border border-brand-border/60">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-brand-dark dark:text-white truncate">
              {lastDispatched || statusMessage}
            </span>
          </div>
          <span className="text-brand-secondary shrink-0 ml-2">
            Total live events: <strong className="text-brand-primary font-mono">{streamCount}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

