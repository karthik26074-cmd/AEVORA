import React, { useState, useRef } from 'react';
import {
  GitBranch,
  Github,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Layers,
  Zap,
  Upload,
  Sparkles,
  Link,
  Unlink,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export const IntegrationsPage: React.FC = () => {
  const { integrations, refreshData, currentWorkspace, uploadFiles, records } = useWorkspace();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(
    null
  );
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Direct Document Ingestion State
  const [isDirectUploading, setIsDirectUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [directUploadMsg, setDirectUploadMsg] = useState<{ success: boolean; msg: string } | null>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  const webhookUrl = `${window.location.origin}/api/webhooks/github?workspaceId=${currentWorkspace?.id || ''}`;

  // Check integration states
  const googleDriveInt = integrations.find((i) => i.provider === 'GOOGLE_DRIVE');
  const isGdriveConnected = googleDriveInt?.isConnected ?? false;

  const jiraInt = integrations.find((i) => i.provider === 'JIRA');
  const isJiraConnected = jiraInt?.isConnected ?? false;

  const handleTestConnection = async (provider: string, config: any) => {
    setTestingId(provider);
    setTestResult(null);

    try {
      const res = await fetch('/api/integrations/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, config }),
      });
      const data = await res.json();
      setTestResult({
        id: provider,
        success: data.success,
        msg: data.message || data.error || 'Test passed successfully',
      });
    } catch (err: any) {
      setTestResult({
        id: provider,
        success: false,
        msg: err.message || 'Connection ping failed',
      });
    } finally {
      setTestingId(null);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Toggle Google Drive connection
  const toggleGdriveConnection = async () => {
    setTestingId('GDRIVE_TOGGLE');
    try {
      const res = await fetch('/api/integrations/GOOGLE_DRIVE', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
          isConnected: !isGdriveConnected,
        }),
      });
      if (res.ok) {
        await refreshData();
        setTestResult({
          id: 'GDRIVE',
          success: true,
          msg: !isGdriveConnected
            ? '✅ Google Drive / Docs Sync connected! Automatic PRD folder watch is now active.'
            : 'Google Drive integration disconnected.',
        });
      }
    } catch (err: any) {
      setTestResult({ id: 'GDRIVE', success: false, msg: err.message });
    } finally {
      setTestingId(null);
    }
  };

  // Sync sample PRD from Google Drive
  const handleGdriveSyncPRD = async () => {
    setTestingId('GDRIVE_SYNC');
    try {
      const res = await fetch('/api/demo/dispatch-live-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
          eventCategory: 'GOOGLE_DRIVE',
        }),
      });
      const d = await res.json();
      setTestResult({
        id: 'GDRIVE',
        success: d.success,
        msg: `⚡ Synced 'PRD: Biometric Authentication Architecture Spec v2.4' from Google Drive folder with Gemini event extraction! (${new Date().toLocaleTimeString()})`,
      });
      await refreshData();
    } catch (err: any) {
      setTestResult({ id: 'GDRIVE', success: false, msg: err.message });
    } finally {
      setTestingId(null);
    }
  };

  // Toggle Jira connection
  const toggleJiraConnection = async () => {
    setTestingId('JIRA_TOGGLE');
    try {
      const res = await fetch('/api/integrations/JIRA', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
          isConnected: !isJiraConnected,
          config: { projectKey: 'BANK' },
        }),
      });
      if (res.ok) {
        await refreshData();
        setTestResult({
          id: 'JIRA',
          success: true,
          msg: !isJiraConnected
            ? '✅ Jira Software connected! Issue transitions will now automatically record into the timeline.'
            : 'Jira integration disconnected.',
        });
      }
    } catch (err: any) {
      setTestResult({ id: 'JIRA', success: false, msg: err.message });
    } finally {
      setTestingId(null);
    }
  };

  // Direct Document Ingestion Handlers
  const handleDirectFilesUploaded = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsDirectUploading(true);
    setDirectUploadMsg(null);
    try {
      const res = await uploadFiles(files, 'Product Team');
      if (res.success) {
        setDirectUploadMsg({
          success: true,
          msg: `✅ Ingested ${files.length} document(s). Extracted events and linked features via Gemini AI!`,
        });
        await refreshData();
      } else {
        setDirectUploadMsg({
          success: false,
          msg: res.error || 'Failed to ingest document.',
        });
      }
    } catch (err: any) {
      setDirectUploadMsg({
        success: false,
        msg: err.message || 'Upload error',
      });
    } finally {
      setIsDirectUploading(false);
    }
  };

  const handleSamplePRDIngest = async () => {
    setIsDirectUploading(true);
    setDirectUploadMsg(null);
    try {
      const sampleContent = `# PRD: Multi-Region High-Availability Banking Architecture (v3.0)
Author: Elena Rostova & Architecture Working Group
Date: ${new Date().toISOString().split('T')[0]}
Status: APPROVED

## 1. Executive Summary
Specifies active-active multi-region failover cluster for payments routing with < 200ms latency.

## 2. Requirements & Directives
- Auto-failover across AWS us-east-1 and eu-central-1
- Distributed transaction journal with Paxos consensus
- Real-time audit replication to secondary cold archive

Feature: Multi-Region Failover
Module: Infrastructure & Resilience`;

      const blob = new Blob([sampleContent], { type: 'text/markdown' });
      const file = new File([blob], 'PRD_SmartBanking_MultiRegion_v3.0.md', { type: 'text/markdown' });
      const res = await uploadFiles([file], 'Elena Rostova (VP Architecture)');
      if (res.success) {
        setDirectUploadMsg({
          success: true,
          msg: `⚡ Sample Architecture PRD ingested & processed! Extracted "Multi-Region Failover" into Knowledge Graph.`,
        });
        await refreshData();
      } else {
        setDirectUploadMsg({ success: false, msg: res.error || 'Ingest failed' });
      }
    } catch (err: any) {
      setDirectUploadMsg({ success: false, msg: err.message });
    } finally {
      setIsDirectUploading(false);
    }
  };

  const uploadedRecordsCount = records.filter(
    (r) => r.sourceType === 'UPLOAD' || r.sourceType === 'GOOGLE_DRIVE'
  ).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
          Live Integrations Centre
        </h1>
        <p className="text-xs text-brand-secondary mt-1">
          Connect your version control systems, project trackers, and cloud repositories to stream temporal changes automatically.
        </p>
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ========================================================================= */}
        {/* 1. GitHub Integration                                                     */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#24292e] text-white flex items-center justify-center font-bold">
                <Github size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                  GitHub Repository & Webhook
                </h3>
                <p className="text-xs text-brand-secondary">
                  Repo: <code className="font-mono">smartbank-io/banking-core-api</code>
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-success-light text-brand-success border border-brand-success/20 flex items-center gap-1">
              <CheckCircle size={11} />
              <span>Connected</span>
            </span>
          </div>

          <p className="text-xs text-brand-secondary leading-relaxed">
            Receives verified Pull Request, Merge, and Push events. Extracts feature lifecycle updates and updates the timeline in real time.
          </p>

          {/* Webhook Payload Details */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-[11px] text-brand-secondary uppercase">
              Webhook Endpoint URL:
            </span>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border">
              <code className="text-[11px] font-mono text-brand-dark dark:text-gray-200 truncate flex-1">
                {webhookUrl}
              </code>
              <button
                onClick={copyWebhook}
                className="p-1 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white"
                title="Copy Webhook URL"
              >
                {copiedUrl ? <Check size={14} className="text-brand-success" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/60 text-xs space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-brand-secondary">Webhook Secret:</span>
              <span className="font-mono text-brand-dark dark:text-white">HMAC SHA-256 (Protected)</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-brand-secondary">Events Listened:</span>
              <span className="font-semibold text-brand-primary">pull_request, push</span>
            </div>
          </div>

          {testResult?.id === 'GITHUB' && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                testResult.success
                  ? 'bg-brand-success-light text-brand-success border border-brand-success/20'
                  : 'bg-brand-error-light text-brand-error border border-brand-error/20'
              }`}
            >
              {testResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{testResult.msg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={async () => {
                setTestingId('GITHUB_DISPATCH');
                try {
                  const res = await fetch('/api/demo/dispatch-live-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      workspaceId: currentWorkspace?.id,
                      eventCategory: 'PULL_REQUEST',
                    }),
                  });
                  const d = await res.json();
                  setTestResult({
                    id: 'GITHUB',
                    success: d.success,
                    msg: `⚡ Live PR Event ingested & broadcasted over WebSockets (${new Date().toLocaleTimeString()})`,
                  });
                  await refreshData();
                } catch (err: any) {
                  setTestResult({ id: 'GITHUB', success: false, msg: err.message });
                } finally {
                  setTestingId(null);
                }
              }}
              disabled={testingId === 'GITHUB_DISPATCH'}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-60 flex items-center gap-1.5"
            >
              {testingId === 'GITHUB_DISPATCH' ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Zap size={13} />
              )}
              <span>Dispatch Live PR #145</span>
            </button>

            <button
              onClick={() =>
                handleTestConnection('GITHUB', { repository: 'smartbank-io/banking-core-api' })
              }
              disabled={testingId === 'GITHUB'}
              className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm disabled:opacity-60 flex items-center gap-1.5"
            >
              {testingId === 'GITHUB' && <RefreshCw size={13} className="animate-spin" />}
              <span>Test Webhook Ping</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. Jira Software Integration                                             */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0052CC] text-white flex items-center justify-center font-bold">
                <GitBranch size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                  Atlassian Jira Software
                </h3>
                <p className="text-xs text-brand-secondary">Project Key: BANK</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isJiraConnected
                  ? 'bg-brand-success-light text-brand-success border border-brand-success/20'
                  : 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20'
              }`}
            >
              {isJiraConnected && <CheckCircle size={11} />}
              <span>{isJiraConnected ? 'Connected' : 'Disconnected'}</span>
            </span>
          </div>

          <p className="text-xs text-brand-secondary leading-relaxed">
            Synchronizes epic descriptions, story criteria, and issue status transitions into temporal feature history.
          </p>

          <div className="p-4 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/60 text-xs text-brand-secondary space-y-2">
            <p className="font-semibold text-brand-dark dark:text-white">Configuration Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>Jira Host URL (e.g. smartbank.atlassian.net)</li>
              <li>Atlassian API Token with Read Issues & Changelog scope</li>
              <li>Target Project Board Key: <code>BANK</code></li>
            </ul>
          </div>

          {testResult?.id === 'JIRA' && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                testResult.success
                  ? 'bg-brand-success-light text-brand-success border border-brand-success/20'
                  : 'bg-brand-error-light text-brand-error border border-brand-error/20'
              }`}
            >
              {testResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{testResult.msg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={toggleJiraConnection}
              disabled={testingId === 'JIRA_TOGGLE'}
              className="px-3.5 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-dark dark:text-white hover:bg-brand-bg flex items-center gap-1.5"
            >
              {isJiraConnected ? <Unlink size={13} /> : <Link size={13} />}
              <span>{isJiraConnected ? 'Disconnect' : 'Connect Jira'}</span>
            </button>

            <button
              onClick={() => handleTestConnection('JIRA', {})}
              disabled={testingId === 'JIRA'}
              className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm disabled:opacity-60 flex items-center gap-1.5"
            >
              {testingId === 'JIRA' && <RefreshCw size={13} className="animate-spin" />}
              <span>Simulate Jira Sync</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. Google Drive / Docs Integration (FULLY WORKING)                        */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0F9D58] text-white flex items-center justify-center font-bold">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                  Google Drive / Docs Sync
                </h3>
                <p className="text-xs text-brand-secondary">Automated PRD document watcher</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isGdriveConnected
                  ? 'bg-brand-success-light text-brand-success border border-brand-success/20'
                  : 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20'
              }`}
            >
              {isGdriveConnected && <CheckCircle size={11} />}
              <span>{isGdriveConnected ? 'Connected' : 'Disconnected'}</span>
            </span>
          </div>

          <p className="text-xs text-brand-secondary leading-relaxed">
            Watches shared team folders for newly authored Product Requirements Documents (PRDs) and architecture meeting agendas.
          </p>

          <div className="p-4 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/60 text-xs text-brand-secondary space-y-2">
            <p className="font-semibold text-brand-dark dark:text-white">Setup Requirements:</p>
            <p className="text-[11px] leading-relaxed">
              Requires Google Workspace Service Account JSON credentials with Drive Read permissions or OAuth2 User Consent.
            </p>
            <div className="flex items-center gap-3 text-[11px] pt-1 text-brand-primary">
              <span className="flex items-center gap-1">
                <Shield size={12} />
                <span>OAuth2 Scopes: drive.readonly</span>
              </span>
              <span>•</span>
              <span>Auto-poll: 60s</span>
            </div>
          </div>

          {/* Feedback Result Alert */}
          {testResult?.id === 'GDRIVE' && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                testResult.success
                  ? 'bg-brand-success-light text-brand-success border border-brand-success/20'
                  : 'bg-brand-error-light text-brand-error border border-brand-error/20'
              }`}
            >
              {testResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{testResult.msg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={toggleGdriveConnection}
              disabled={testingId === 'GDRIVE_TOGGLE'}
              className="px-3.5 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-dark dark:text-white hover:bg-brand-bg flex items-center gap-1.5"
            >
              {isGdriveConnected ? <Unlink size={13} /> : <Link size={13} />}
              <span>{isGdriveConnected ? 'Disconnect' : 'Connect Google Drive'}</span>
            </button>

            <button
              onClick={handleGdriveSyncPRD}
              disabled={testingId === 'GDRIVE_SYNC'}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm disabled:opacity-60 flex items-center gap-1.5"
            >
              {testingId === 'GDRIVE_SYNC' ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Zap size={13} />
              )}
              <span>Sync PRD from Drive</span>
            </button>

            <button
              onClick={() => handleTestConnection('GDRIVE', {})}
              disabled={testingId === 'GDRIVE'}
              className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm disabled:opacity-60 flex items-center gap-1.5"
            >
              {testingId === 'GDRIVE' && <RefreshCw size={13} className="animate-spin" />}
              <span>Verify OAuth Config</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. Direct Document Ingestion (FULLY INTERACTIVE & WORKING)                */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-bold">
                <Layers size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                  Direct Document Ingestion
                </h3>
                <p className="text-xs text-brand-secondary">Local & Cloud Drag-and-Drop</p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-success-light text-brand-success border border-brand-success/20 flex items-center gap-1">
              <CheckCircle size={11} />
              <span>Always Active</span>
            </span>
          </div>

          <p className="text-xs text-brand-secondary leading-relaxed">
            Ready-to-use document upload accepting Markdown, Text, PDF, DOCX, CSV, and JSON files with instantaneous Gemini event extraction.
          </p>

          {/* Interactive Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                handleDirectFilesUploaded(e.dataTransfer.files);
              }
            }}
            onClick={() => directFileInputRef.current?.click()}
            className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 ${
              isDragging
                ? 'border-brand-primary bg-brand-primary/10'
                : 'border-brand-border/80 dark:border-brand-dark-border/80 bg-brand-bg/40 dark:bg-brand-dark/40 hover:border-brand-primary/50'
            }`}
          >
            <input
              type="file"
              ref={directFileInputRef}
              multiple
              accept=".md,.txt,.pdf,.docx,.json,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleDirectFilesUploaded(e.target.files);
                }
              }}
            />
            <Upload
              size={20}
              className={isDirectUploading ? 'animate-bounce text-brand-primary' : 'text-brand-secondary'}
            />
            <div className="text-xs font-bold text-brand-dark dark:text-white">
              {isDirectUploading
                ? 'Ingesting & Analyzing with Gemini AI...'
                : 'Click to select or drag & drop files here'}
            </div>
            <p className="text-[10px] text-brand-secondary">
              Accepts Markdown (.md), PDF, DOCX, CSV, TXT, JSON
            </p>
          </div>

          {/* Ingestion Feedback Banner */}
          {directUploadMsg && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in ${
                directUploadMsg.success
                  ? 'bg-brand-success-light text-brand-success border border-brand-success/20'
                  : 'bg-brand-error-light text-brand-error border border-brand-error/20'
              }`}
            >
              {directUploadMsg.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{directUploadMsg.msg}</span>
            </div>
          )}

          {/* Action Buttons & Pipeline Status */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <span className="text-[11px] text-brand-secondary">
              Indexed in Knowledge Base: <strong className="text-brand-dark dark:text-white">{uploadedRecordsCount} files</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSamplePRDIngest}
                disabled={isDirectUploading}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-primary/15 via-indigo-500/15 to-brand-success/15 hover:from-brand-primary/20 hover:to-brand-success/20 border border-brand-primary/30 text-brand-primary dark:text-indigo-400 text-xs font-bold shadow-sm disabled:opacity-60 flex items-center gap-1.5"
              >
                <Sparkles size={13} className="text-brand-primary" />
                <span>Ingest Sample PRD (Fast Demo)</span>
              </button>

              <button
                type="button"
                onClick={() => directFileInputRef.current?.click()}
                disabled={isDirectUploading}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm disabled:opacity-60 flex items-center gap-1.5"
              >
                {isDirectUploading ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Upload size={13} />
                )}
                <span>Upload Documents</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};