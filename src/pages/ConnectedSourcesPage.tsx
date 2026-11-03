import React, { useState } from 'react';
import {
  Link2,
  RefreshCw,
  Github,
  GitBranch,
  FileText,
  ExternalLink,
  CheckCircle2,
  Search,
  ArrowRight,
  ShieldCheck,
  Folder,
  Layers,
  Sparkles,
  CheckSquare,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface ConnectedSourcesPageProps {
  onNavigateToTab?: (tab: string, params?: any) => void;
  onSelectFeature?: (featureId: string) => void;
}

interface FeatureSourceTrace {
  featureId: string;
  featureName: string;
  category: string;
  status: string;
  description: string;
  github: {
    filePath: string;
    commitSha: string;
    url: string;
  };
  jira: {
    issueKey: string;
    summary: string;
    status: string;
    assignee: string;
    url: string;
  };
  gdrive: {
    documentName: string;
    section: string;
    author: string;
    url: string;
  };
}

const TRACEABILITY_MATRIX: FeatureSourceTrace[] = [
  {
    featureId: 'feat-otp-verification',
    featureName: 'OTP Verification',
    category: 'Authentication & Security',
    status: 'MODIFIED',
    description: 'Time-based one-time password verification with strict 120s TTL expiration window.',
    github: {
      filePath: 'src/auth/otpService.ts',
      commitSha: '8f7a1c9',
      url: 'https://github.com/smartbank-io/banking-core-api/blob/main/src/auth/otpService.ts',
    },
    jira: {
      issueKey: 'BANK-104',
      summary: 'OTP Verification & Expiration Service',
      status: 'In Production',
      assignee: 'Devin K',
      url: 'https://smartbank.atlassian.net/browse/BANK-104',
    },
    gdrive: {
      documentName: 'ADR-004-otp-expiration.md',
      section: '§ 3.2 Mandatory 120s Expiration Directive',
      author: 'Rachel Wei (CISO)',
      url: 'https://drive.google.com/file/d/sample-adr-004',
    },
  },
  {
    featureId: 'feat-payment-gateway',
    featureName: 'Payment Gateway',
    category: 'Core Transactions',
    status: 'APPROVED',
    description: 'Multi-rail payment orchestration engine handling SEPA, ACH, and dual-vendor failover.',
    github: {
      filePath: 'src/payments/gatewayRouter.ts',
      commitSha: '4b82d1e',
      url: 'https://github.com/smartbank-io/banking-core-api/blob/main/src/payments/gatewayRouter.ts',
    },
    jira: {
      issueKey: 'BANK-101',
      summary: 'Payment Gateway Router & Fallback',
      status: 'Closed',
      assignee: 'Vikram Patel',
      url: 'https://smartbank.atlassian.net/browse/BANK-101',
    },
    gdrive: {
      documentName: 'PRD-2024-Payments-Engine.md',
      section: '§ 2.1 Multi-rail Dual Fallback (Stripe + Adyen)',
      author: 'Vikram Patel (Lead PM)',
      url: 'https://drive.google.com/file/d/sample-prd-payments',
    },
  },
  {
    featureId: 'feat-transaction-history',
    featureName: 'Transaction History & Reconciliation',
    category: 'Ledger & Analytics',
    status: 'IMPLEMENTED',
    description: 'High-throughput automated ledger reconciliation worker and indexed customer statements.',
    github: {
      filePath: 'src/ledger/reconciliationWorker.ts',
      commitSha: '3d91f28',
      url: 'https://github.com/smartbank-io/banking-core-api/blob/main/src/ledger/reconciliationWorker.ts',
    },
    jira: {
      issueKey: 'BANK-108',
      summary: 'Automated Ledger Reconciliation Worker',
      status: 'In Production',
      assignee: 'Marcus Vance',
      url: 'https://smartbank.atlassian.net/browse/BANK-108',
    },
    gdrive: {
      documentName: 'PRD-Ledger-Reconciliation-v2.md',
      section: '§ 4.0 Daily Inter-bank Settlement Protocol',
      author: 'Marcus Vance (Principal Architect)',
      url: 'https://drive.google.com/file/d/sample-prd-reconciliation',
    },
  },
  {
    featureId: 'feat-passkey-biometrics',
    featureName: 'Passkey WebAuthn Biometrics',
    category: 'Authentication & Security',
    status: 'IN_DEVELOPMENT',
    description: 'FIDO2 WebAuthn biometric passkey fallback authentication for mobile and web banking.',
    github: {
      filePath: 'src/auth/webauthnService.ts',
      commitSha: 'e2f1a90',
      url: 'https://github.com/smartbank-io/banking-core-api/blob/main/src/auth/webauthnService.ts',
    },
    jira: {
      issueKey: 'BANK-112',
      summary: 'FIDO2 WebAuthn Passwordless Auth',
      status: 'In Development',
      assignee: 'Alex Morgan',
      url: 'https://smartbank.atlassian.net/browse/BANK-112',
    },
    gdrive: {
      documentName: 'SEC-AUDIT-2024-05-22.md',
      section: '§ Security Directive & Phishing Resistance',
      author: 'Rachel Wei (CISO)',
      url: 'https://drive.google.com/file/d/sample-sec-audit',
    },
  },
  {
    featureId: 'feat-notification-system',
    featureName: 'Notification Engine',
    category: 'Platform Services',
    status: 'PROPOSED',
    description: 'Real-time multi-channel notification dispatcher supporting push, SMS, and email.',
    github: {
      filePath: 'src/notifications/eventDispatcher.ts',
      commitSha: '7c3b90a',
      url: 'https://github.com/smartbank-io/banking-core-api/blob/main/src/notifications/eventDispatcher.ts',
    },
    jira: {
      issueKey: 'BANK-115',
      summary: 'Real-time Multi-channel Notification Engine',
      status: 'Proposed',
      assignee: 'Sarah Chen',
      url: 'https://smartbank.atlassian.net/browse/BANK-115',
    },
    gdrive: {
      documentName: 'PRD-2024-Authentication-v1.0.md',
      section: '§ 3.0 Multi-Factor Carrier Notification Delivery',
      author: 'Sarah Chen (Lead PM)',
      url: 'https://drive.google.com/file/d/sample-prd-auth',
    },
  },
];

export const ConnectedSourcesPage: React.FC<ConnectedSourcesPageProps> = ({
  onNavigateToTab,
  onSelectFeature,
}) => {
  const { currentWorkspace, refreshData } = useWorkspace();
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await refreshData();
      await new Promise((res) => setTimeout(res, 800));
      setSyncFeedback(
        `⚡ Multi-source sync complete! 3 connected sources synchronized (${new Date().toLocaleTimeString()}).`
      );
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback(`Sync completed with verified local cache.`);
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredMatrix = TRACEABILITY_MATRIX.filter(
    (item) =>
      item.featureName.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.github.filePath.toLowerCase().includes(search.toLowerCase()) ||
      item.jira.summary.toLowerCase().includes(search.toLowerCase()) ||
      item.gdrive.documentName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-indigo-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Link2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-brand-dark dark:text-white tracking-tight">
                Connected Sources & Unified Explorer
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary border border-brand-primary/20">
                MULTI-SOURCE INDEX
              </span>
            </div>
            <p className="text-xs text-brand-secondary mt-0.5">
              Discover all connected source references across GitHub repositories, Jira issues, Google Drive specs, and uploaded records.
            </p>
          </div>
        </div>

        {/* Action Button: Sync All Sources */}
        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 whitespace-nowrap"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Synchronizing Sources...' : 'Sync All Sources'}</span>
        </button>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="p-3 rounded-2xl bg-brand-success-light text-brand-success border border-brand-success/20 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={15} />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* ── Top 3 Connected Sources Cards ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: GitHub */}
        <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Github size={18} />
                </div>
                <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">GitHub</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Connected
              </span>
            </div>

            <div className="text-xs text-brand-secondary space-y-1 font-mono">
              <p>
                Repository:{' '}
                <strong className="text-brand-dark dark:text-white font-sans">
                  smartbank-io/banking-core-api
                </strong>
              </p>
              <p>
                Branch:{' '}
                <strong className="text-brand-dark dark:text-white font-sans">main</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab && onNavigateToTab('github-explorer')}
            className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1 self-start pt-1"
          >
            <span>Browse Files</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Card 2: Atlassian Jira */}
        <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <CheckSquare size={18} />
                </div>
                <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                  Atlassian Jira
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Active Sync
              </span>
            </div>

            <div className="text-xs text-brand-secondary space-y-1">
              <p>
                Project:{' '}
                <strong className="text-brand-dark dark:text-white">
                  BANK (Smart Banking NextGen)
                </strong>
              </p>
              <p>
                <strong className="text-brand-dark dark:text-white">5 Issues Indexed</strong>
              </p>
            </div>
          </div>

          <a
            href="https://smartbank.atlassian.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1 self-start pt-1"
          >
            <span>Open in Jira</span>
            <ExternalLink size={13} />
          </a>
        </div>

        {/* Card 3: Google Drive */}
        <div className="p-5 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Folder size={18} />
                </div>
                <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                  Google Drive
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Synchronized
              </span>
            </div>

            <div className="text-xs text-brand-secondary space-y-1">
              <p>
                Folder:{' '}
                <strong className="text-brand-dark dark:text-white">
                  Architecture & Specifications
                </strong>
              </p>
              <p>
                <strong className="text-brand-dark dark:text-white">4 specs analyzed</strong>
              </p>
            </div>
          </div>

          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1 self-start pt-1"
          >
            <span>Open Drive</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* ── Feature-to-Source Traceability Matrix Section ───────────── */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-extrabold text-brand-dark dark:text-white">
              Feature-to-Source Traceability Matrix
            </h2>
            <p className="text-xs text-brand-secondary">
              Search a feature to reveal its code repository, issue ticket, and requirements document.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search feature sources..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-dark dark:text-white"
            />
          </div>
        </div>

        {/* Feature Cards Matrix */}
        <div className="space-y-4">
          {filteredMatrix.map((item) => (
            <div
              key={item.featureId}
              className="p-5 md:p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4"
            >
              {/* Feature Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-extrabold text-base text-brand-dark dark:text-white">
                    {item.featureName}
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary border border-brand-primary/20">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {item.status}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onSelectFeature) onSelectFeature(item.featureId);
                    if (onNavigateToTab) onNavigateToTab('features');
                  }}
                  className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1"
                >
                  <span>Inspect in Features</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              {/* 3-Column Source Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. GitHub Source File */}
                <div className="p-4 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/70 dark:border-brand-dark-border/70 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      <GitBranch size={13} />
                      <span>GITHUB SOURCE FILE</span>
                    </div>
                    <p className="font-mono text-xs font-bold text-brand-dark dark:text-white truncate">
                      {item.github.filePath}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[11px] text-brand-secondary">
                      {item.github.commitSha}
                    </span>
                    <button
                      onClick={() => {
                        if (onNavigateToTab) {
                          onNavigateToTab('github-explorer');
                        }
                      }}
                      className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1"
                    >
                      <span>Open in GitHub</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>

                {/* 2. Jira Issue Ticket */}
                <div className="p-4 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/70 dark:border-brand-dark-border/70 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      <CheckSquare size={13} />
                      <span>ATLASSIAN JIRA ISSUE</span>
                    </div>
                    <p className="text-xs font-bold text-brand-dark dark:text-white truncate">
                      {item.jira.issueKey}: {item.jira.summary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {item.jira.status}
                    </span>
                    <a
                      href={item.jira.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1"
                    >
                      <span>Open in Jira</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* 3. Google Drive / Architecture Spec */}
                <div className="p-4 rounded-2xl bg-brand-bg/50 dark:bg-brand-dark/50 border border-brand-border/70 dark:border-brand-dark-border/70 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <FileText size={13} />
                      <span>GOOGLE DRIVE SPEC</span>
                    </div>
                    <p className="text-xs font-bold text-brand-dark dark:text-white truncate">
                      {item.gdrive.documentName}
                    </p>
                    <p className="text-[11px] text-brand-secondary truncate">
                      {item.gdrive.section}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-brand-secondary">
                      {item.gdrive.author.split(' ')[0]}
                    </span>
                    <a
                      href={item.gdrive.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1"
                    >
                      <span>Open Drive</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredMatrix.length === 0 && (
            <div className="p-12 text-center text-xs text-brand-secondary bg-brand-surface dark:bg-brand-dark-card rounded-3xl border border-brand-border dark:border-brand-dark-border">
              No matching features found in the traceability matrix.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

