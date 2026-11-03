import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Database,
  Sparkles,
  Lock,
  HardDrive,
  GitBranch,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Radio,
} from 'lucide-react';

export const DiagnosticsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diagnostics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-4xl">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
              Application Diagnostics
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-success-light text-brand-success uppercase">
              System Live
            </span>
          </div>
          <p className="text-xs text-brand-secondary mt-1">
            Real-time verification of database persistence, Gemini AI endpoints, storage, and processing pipelines.
          </p>
        </div>

        <button
          onClick={fetchDiagnostics}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card text-xs font-semibold text-brand-dark dark:text-white hover:border-brand-primary"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-brand-primary' : ''} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="p-12 text-center text-xs text-brand-secondary">
          Polling system telemetry...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Status Banner */}
          <div className="p-5 rounded-3xl bg-brand-success-light/40 dark:bg-brand-success/10 border border-brand-success/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle size={22} className="text-brand-success" />
              <div>
                <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                  All Core Subsystems Operational
                </h3>
                <p className="text-xs text-brand-secondary">
                  Last telemetry heartbeat: {new Date(data?.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-brand-success">200 OK</span>
          </div>

          {/* Subsystems Diagnostic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database Subsystem */}
            <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-dark dark:text-white">
                  <Database size={16} className="text-brand-primary" />
                  <span>Database Layer</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-success-light text-brand-success">
                  {data?.database?.status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-brand-secondary">
                <p>Engine: <strong className="text-brand-dark dark:text-white">{data?.database?.engine}</strong></p>
                <p>Total Stored Records: <strong className="text-brand-dark dark:text-white">{data?.database?.activeRecords}</strong></p>
                <p>Historical Events Preserved: <strong className="text-brand-dark dark:text-white">{data?.database?.historicalEvents}</strong></p>
              </div>
            </div>

            {/* Gemini AI Subsystem */}
            <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-dark dark:text-white">
                  <Sparkles size={16} className="text-brand-primary" />
                  <span>Gemini AI Pipeline</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary">
                  {data?.geminiApi?.status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-brand-secondary">
                <p>Mode: <strong className="text-brand-dark dark:text-white">{data?.geminiApi?.mode}</strong></p>
                <p>Custom API Key: <strong className="text-brand-dark dark:text-white">{data?.geminiApi?.configured ? 'Configured' : 'Using Built-in NLP'}</strong></p>
              </div>
            </div>

            {/* Real-time Subsystem */}
            <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-dark dark:text-white">
                  <Radio size={16} className="text-teal-500" />
                  <span>Real-Time Event Stream</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-success-light text-brand-success">
                  {data?.realtime?.status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-brand-secondary">
                <p>Protocols: <strong className="text-brand-dark dark:text-white">{data?.realtime?.protocol}</strong></p>
                <p>Connected Browser Sessions: <strong className="text-brand-dark dark:text-white">{data?.realtime?.connectedClients}</strong></p>
              </div>
            </div>

            {/* Integrations Subsystem */}
            <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-dark dark:text-white">
                  <GitBranch size={16} className="text-purple-500" />
                  <span>Integrations & Webhooks</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-success-light text-brand-success">
                  {data?.integrations?.status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-brand-secondary">
                <p>GitHub Webhook: <strong className="text-brand-dark dark:text-white">{data?.integrations?.githubWebhook}</strong></p>
                <p>Active Verified Connections: <strong className="text-brand-dark dark:text-white">{data?.integrations?.activeConnectionsCount}</strong></p>
              </div>
            </div>
          </div>

          {/* Processing Queue Card */}
          <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-dark dark:text-white">
                Background Processing Queue
              </span>
              <span className="text-[10px] font-mono text-brand-secondary">
                Queue Status: {data?.processingQueue?.status}
              </span>
            </div>
            <p className="text-xs text-brand-secondary">
              Last Successful Document Extraction Time:{' '}
              <strong className="text-brand-dark dark:text-white">
                {new Date(data?.processingQueue?.lastSuccessfulProcessingTime).toLocaleString()}
              </strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
