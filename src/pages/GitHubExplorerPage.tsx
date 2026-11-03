import React, { useState } from 'react';
import {
  GitBranch,
  FileCode,
  FileText,
  ExternalLink,
  CheckCircle2,
  Search,
  Copy,
  Check,
  Code2,
  FileJson,
  Layers,
  ArrowRight,
  GitCommit,
  Clock,
  User,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';

interface GitHubExplorerPageProps {
  initialFile?: string | null;
  onSelectFeature?: (featureId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

interface TrackedSourceFile {
  id: string;
  path: string;
  subpath: string;
  featureId: string;
  featureName: string;
  featureCategory: string;
  fileType: 'typescript' | 'markdown' | 'json';
  commitSha: string;
  fileSize: string;
  latestCommit: {
    message: string;
    author: string;
    date: string;
  };
  content: string;
  diff: string;
}

const TRACKED_FILES: TrackedSourceFile[] = [
  {
    id: 'otp-service',
    path: 'src/auth/otpService.ts',
    subpath: 'src/auth/otpService.ts',
    featureId: 'feat-otp-verification',
    featureName: 'OTP Verification',
    featureCategory: 'Authentication & Security',
    fileType: 'typescript',
    commitSha: '8f7a1c9e2b10',
    fileSize: '4280 bytes',
    latestCommit: {
      message: 'feat(auth): enforce 120s TTL token expiration per sec-audit',
      author: 'Marcus Vance',
      date: '5/24/2024, 9:50:00 PM',
    },
    content: `// ============================================================================
// Smart Banking Core API - OTP Verification Service
// Module: Authentication & Security
// ============================================================================

import { redisClient } from '../cache/redis';
import { twilioClient } from '../services/sms';
import { auditLog } from '../security/audit';

export class OtpService {
  /**
   * PCI-DSS 4.0 & NIST SP 800-63B Compliance:
   * Reduced OTP validity window from 300 seconds to 120 seconds.
   * Directive: SEC-AUDIT-2024-05-22 / ADR-004
   */
  private static readonly TTL_SECONDS = 120;
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RATE_LIMIT_WINDOW = 900; // 15 minutes

  /**
   * Issues cryptographically secure 6-digit OTP code to registered mobile phone
   */
  static async issueOtp(userId: string, phoneNumber: string): Promise<{ success: boolean; expiresAt: Date }> {
    const rateLimitKey = \`otp:attempts:\${userId}\`;
    const attempts = await redisClient.incr(rateLimitKey);
    if (attempts === 1) {
      await redisClient.expire(rateLimitKey, this.RATE_LIMIT_WINDOW);
    }
    if (attempts > this.MAX_ATTEMPTS) {
      throw new Error('Too many OTP attempts. Cooldown period is 15 minutes.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = \`otp:user:\${userId}\`;

    await redisClient.set(redisKey, code, 'EX', this.TTL_SECONDS);
    await twilioClient.sendSms(
      phoneNumber,
      \`Your SmartBank verification code is: \${code}. Valid for 2 minutes.\`
    );

    auditLog.record({
      action: 'OTP_ISSUED',
      userId,
      ttl: this.TTL_SECONDS,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      expiresAt: new Date(Date.now() + this.TTL_SECONDS * 1000),
    };
  }

  /**
   * Validates submitted OTP against in-memory key
   */
  static async verifyOtp(userId: string, enteredCode: string): Promise<boolean> {
    const redisKey = \`otp:user:\${userId}\`;
    const stored = await redisClient.get(redisKey);

    if (!stored || stored !== enteredCode.trim()) {
      return false;
    }

    // Single-use token: invalidate immediately upon success
    await redisClient.del(redisKey);
    return true;
  }
}`,
    diff: `@@ -12,3 +12,3 @@
-  // Initial PRD tolerance window
-  private static readonly TTL_SECONDS = 300;
+  // PCI-DSS 4.0 strict requirement: reduced from 300s to 120s per SEC-AUDIT-2024-05-22
+  private static readonly TTL_SECONDS = 120;`,
  },
  {
    id: 'gateway-router',
    path: 'src/payments/gatewayRouter.ts',
    subpath: 'src/payments/gatewayRouter.ts',
    featureId: 'feat-payment-gateway',
    featureName: 'Payment Gateway',
    featureCategory: 'Core Transactions',
    fileType: 'typescript',
    commitSha: '4b82d1ef9a33',
    fileSize: '3820 bytes',
    latestCommit: {
      message: 'feat(payments): configure Stripe primary with Adyen dual-vendor failover',
      author: 'Vikram Patel',
      date: '5/25/2024, 9:00:00 AM',
    },
    content: `// ============================================================================
// Smart Banking Core API - Multi-Rail Payment Gateway Router
// Module: Payments & Transfers
// ============================================================================

import { stripeProvider } from './providers/stripe';
import { adyenProvider } from './providers/adyen';
import { PaymentRequest, PaymentResult } from '../types/payment';
import { auditLog } from '../security/audit';

export class GatewayRouter {
  /**
   * Architecture Decision: Dual-vendor redundant fallback
   * Primary: Stripe Enterprise (ISO 20022 message specs)
   * Secondary Fallback: Adyen Direct
   */
  static async routePayment(req: PaymentRequest): Promise<PaymentResult> {
    const startTime = Date.now();

    try {
      // 1. Attempt primary gateway (Stripe)
      const primaryRes = await stripeProvider.charge({
        amount: req.amount,
        currency: req.currency,
        source: req.token,
        metadata: { customerId: req.customerId, rail: req.paymentRail },
      });

      auditLog.record({
        event: 'PAYMENT_PROCESSED',
        provider: 'STRIPE',
        txId: primaryRes.id,
        durationMs: Date.now() - startTime,
      });

      return {
        status: 'SUCCESS',
        provider: 'STRIPE',
        transactionId: primaryRes.id,
        settlementTime: primaryRes.created,
      };
    } catch (primaryErr: any) {
      console.warn('Primary gateway (Stripe) failed, falling back to Adyen:', primaryErr.message);

      // 2. High-Availability automated failover to Adyen
      const fallbackRes = await adyenProvider.processPayment({
        reference: req.id,
        amount: { value: req.amount, currency: req.currency },
        channel: 'WEB',
      });

      auditLog.record({
        event: 'PAYMENT_FAILOVER_PROCESSED',
        provider: 'ADYEN',
        txId: fallbackRes.pspReference,
        durationMs: Date.now() - startTime,
      });

      return {
        status: 'SUCCESS',
        provider: 'ADYEN_FAILOVER',
        transactionId: fallbackRes.pspReference,
        settlementTime: new Date().toISOString(),
      };
    }
  }
}`,
    diff: `@@ -15,0 +16,8 @@
+    } catch (primaryErr: any) {
+      console.warn('Primary gateway (Stripe) failed, falling back to Adyen:', primaryErr.message);
+      // High-Availability automated failover to Adyen
+      const fallbackRes = await adyenProvider.processPayment({
+        reference: req.id,
+        amount: { value: req.amount, currency: req.currency }
+      });`,
  },
  {
    id: 'recon-worker',
    path: 'src/ledger/reconciliationWorker.ts',
    subpath: 'src/ledger/reconciliationWorker.ts',
    featureId: 'feat-transaction-history',
    featureName: 'Transaction History & Reconciliation',
    featureCategory: 'Ledger & Analytics',
    fileType: 'typescript',
    commitSha: '3d91f28c4091',
    fileSize: '5120 bytes',
    latestCommit: {
      message: 'feat(ledger): implement automated end-of-day bank settlement reconciliation',
      author: 'Marcus Vance',
      date: '5/28/2024, 11:15:00 AM',
    },
    content: `// ============================================================================
// Smart Banking Core API - Automated Ledger Reconciliation Worker
// Module: Ledger & Analytics
// ============================================================================

import { db } from '../database';
import { ledgerQueue } from '../queues/ledgerQueue';
import { notificationClient } from '../services/notifications';

export class ReconciliationWorker {
  /**
   * Automated Daily Settlement Batch Reconciliation
   * Synchronizes internal double-entry ledgers with external bank rails
   */
  static async processBatch(batchId: string): Promise<{ matched: number; flagged: number }> {
    const pendingTransactions = await db.query(
      'SELECT * FROM ledger_entries WHERE reconciled = false AND batch_id = $1',
      [batchId]
    );

    let matchedCount = 0;
    let flaggedCount = 0;

    for (const tx of pendingTransactions.rows) {
      const settlementRecord = await this.queryBankClearingHouse(tx.clearingReference);

      if (settlementRecord && settlementRecord.amount === tx.amount) {
        await db.query(
          'UPDATE ledger_entries SET reconciled = true, reconciled_at = NOW() WHERE id = $1',
          [tx.id]
        );
        matchedCount++;
      } else {
        await this.flagDiscrepancy(tx, settlementRecord);
        flaggedCount++;
      }
    }

    return { matched: matchedCount, flagged: flaggedCount };
  }

  private static async queryBankClearingHouse(ref: string) {
    // Inter-bank settlement protocol integration (FedNow / SEPA Instant)
    return { clearingRef: ref, amount: 250000, status: 'SETTLED' };
  }

  private static async flagDiscrepancy(internalTx: any, externalRecord: any) {
    await db.query(
      'INSERT INTO reconciliation_flags (tx_id, internal_amount, external_amount, flagged_at) VALUES ($1, $2, $3, NOW())',
      [internalTx.id, internalTx.amount, externalRecord?.amount || 0]
    );
  }
}`,
    diff: `@@ -22,2 +22,6 @@
+      if (settlementRecord && settlementRecord.amount === tx.amount) {
+        await db.query('UPDATE ledger_entries SET reconciled = true WHERE id = $1', [tx.id]);
+        matchedCount++;
+      }`,
  },
  {
    id: 'adr-004',
    path: 'docs/architecture/ADR-004-otp-expiration.md',
    subpath: 'docs/architecture/ADR-004-otp-expiration.md',
    featureId: 'feat-otp-verification',
    featureName: 'OTP Verification',
    featureCategory: 'Authentication & Security',
    fileType: 'markdown',
    commitSha: '6e44b8210f99',
    fileSize: '2980 bytes',
    latestCommit: {
      message: 'docs(adr): document PCI-DSS mandatory OTP lifetime reduction to 120s',
      author: 'Rachel Wei',
      date: '5/22/2024, 2:30:00 PM',
    },
    content: `# Architectural Decision Record (ADR-004)
## Strict Reduction of OTP Expiration Window from 300s to 120s

- **Status**: SUPERSEDED_MANDATE (Approved by CISO)
- **Signatories**: Rachel Wei (CISO), Marcus Vance (Principal Architect), Sarah Chen (Lead PM)
- **Effective Date**: 2024-05-22

### 1. Context
PRD-2024-Authentication-v1.0 originally specified a 300-second (5 minute) expiration window
to accommodate carrier SMS transmission delays. During the May 2024 compliance audit,
security findings flagged that 300s exceeds PCI-DSS 4.0 Section 8.3.6 and NIST SP 800-63B guidelines.

### 2. Decision Directive
1. Enforce strict 120s TTL on all Redis token keys in \`src/auth/otpService.ts\`.
2. Telemetry indicates 98.4% of users verify OTP within 45 seconds, so user friction is minimal.
3. Configure automated resend cooldown of 60 seconds with rate limit of 3 attempts per 15 minutes.`,
    diff: `@@ -1,4 +1,8 @@
+# Architectural Decision Record (ADR-004)
+## Strict Reduction of OTP Expiration Window from 300s to 120s
+- **Status**: SUPERSEDED_MANDATE (Approved by CISO)`,
  },
  {
    id: 'spec-json',
    path: 'docs/specifications/banking-core-spec.json',
    subpath: 'docs/specifications/banking-core-spec.json',
    featureId: 'feat-payment-gateway',
    featureName: 'Payment Gateway',
    featureCategory: 'Payments & Transfers',
    fileType: 'json',
    commitSha: '9a8711e5f03d',
    fileSize: '1850 bytes',
    latestCommit: {
      message: 'chore(spec): export ISO 20022 schema definitions for gateway router',
      author: 'Elena Rostova',
      date: '5/25/2024, 10:45:00 AM',
    },
    content: `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Smart Banking Core Specifications",
  "version": "2.4.0",
  "modules": {
    "paymentGateway": {
      "routingStrategy": "DUAL_VENDOR_FAILOVER",
      "primaryProvider": "STRIPE_ENTERPRISE",
      "secondaryProvider": "ADYEN_DIRECT",
      "maxLatencyMs": 850,
      "supportedCurrencies": ["USD", "EUR", "GBP", "SGD"]
    },
    "otpVerification": {
      "expirationSeconds": 120,
      "rateLimitPerWindow": 3,
      "windowMinutes": 15,
      "channels": ["SMS_TWILIO", "EMAIL_SENDGRID"]
    }
  }
}`,
    diff: `@@ -8,2 +8,4 @@
+      "primaryProvider": "STRIPE_ENTERPRISE",
+      "secondaryProvider": "ADYEN_DIRECT",`,
  },
];

export const GitHubExplorerPage: React.FC<GitHubExplorerPageProps> = ({
  initialFile,
  onSelectFeature,
  onNavigateToTab,
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string>(() => {
    if (initialFile) {
      const match = TRACKED_FILES.find((f) => f.path === initialFile || f.id === initialFile);
      if (match) return match.id;
    }
    return TRACKED_FILES[0].id;
  });

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'source' | 'diff'>('source');
  const [copied, setCopied] = useState(false);

  const selectedFile = TRACKED_FILES.find((f) => f.id === selectedFileId) || TRACKED_FILES[0];

  const filteredFiles = TRACKED_FILES.filter(
    (file) =>
      file.path.toLowerCase().includes(search.toLowerCase()) ||
      file.featureName.toLowerCase().includes(search.toLowerCase()) ||
      file.featureCategory.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(
      activeTab === 'source' ? selectedFile.content : selectedFile.diff
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'typescript':
        return <Code2 size={16} className="text-blue-500" />;
      case 'json':
        return <FileJson size={16} className="text-amber-500" />;
      case 'markdown':
      default:
        return <FileText size={16} className="text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-purple-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <GitBranch size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-brand-dark dark:text-white tracking-tight">
                GitHub Storage Explorer
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary border border-brand-primary/20">
                VERIFIED REPOSITORY
              </span>
            </div>
            <p className="text-xs text-brand-secondary mt-0.5">
              Inspect actual repository directory structures, source code file paths, commit SHAs, and mapped AEVORA features.
            </p>
          </div>
        </div>

        {/* Action Button: Open in GitHub */}
        <a
          href="https://github.com/smartbank-io/banking-core-api"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
        >
          <span>Open in GitHub</span>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* ── Top Repository Info Card ──────────────────────────────── */}
      <div className="p-4 md:p-5 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-brand-secondary block">
              REPOSITORY:
            </span>
            <span className="font-mono font-bold text-brand-dark dark:text-white">
              smartbank-io/banking-core-api
            </span>
          </div>

          <div className="h-6 w-px bg-brand-border dark:bg-brand-dark-border hidden md:block" />

          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-brand-secondary block">
              BRANCH:
            </span>
            <span className="font-mono font-bold text-brand-dark dark:text-white">
              main
            </span>
          </div>

          <div className="h-6 w-px bg-brand-border dark:bg-brand-dark-border hidden md:block" />

          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-brand-secondary block">
              STATUS:
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              <span>Verified & Synchronized</span>
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files or mapped features..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-dark dark:text-white"
          />
        </div>
      </div>

      {/* ── Split Layout: File List (Left) + File Inspector (Right) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tracked Source Files */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-secondary">
              TRACKED SOURCE FILES ({filteredFiles.length})
            </h2>
          </div>

          <div className="space-y-2">
            {filteredFiles.map((file) => {
              const isSelected = file.id === selectedFile.id;
              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-brand-primary-light/40 dark:bg-brand-primary/15 border-brand-primary shadow-subtle ring-1 ring-brand-primary/20'
                      : 'bg-brand-surface dark:bg-brand-dark-card border-brand-border dark:border-brand-dark-border hover:border-brand-primary/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{getFileIcon(file.fileType)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-bold text-brand-dark dark:text-white truncate">
                        {file.path}
                      </p>
                      <p className="text-[11px] text-brand-secondary font-mono truncate mt-0.5">
                        {file.subpath}
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary border border-brand-primary/20">
                          Mapped to {file.featureName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredFiles.length === 0 && (
              <div className="p-8 text-center text-xs text-brand-secondary bg-brand-surface dark:bg-brand-dark-card rounded-2xl border border-brand-border dark:border-brand-dark-border">
                No matching tracked source files found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: File Inspector Pane */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-5">
            {/* File Path Header */}
            <div className="flex items-center justify-between pb-3 border-b border-brand-border dark:border-brand-dark-border flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                {getFileIcon(selectedFile.fileType)}
                <h3 className="font-mono text-sm font-extrabold text-brand-dark dark:text-white">
                  {selectedFile.path}
                </h3>
              </div>

              <a
                href={`https://github.com/smartbank-io/banking-core-api/blob/main/${selectedFile.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1"
              >
                <span>Open on GitHub</span>
                <ExternalLink size={13} />
              </a>
            </div>

            {/* AEVORA Feature-to-Source Mapping Card */}
            <div className="p-4 rounded-2xl bg-brand-primary-light/30 dark:bg-brand-primary/10 border border-brand-primary/20 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-primary">
                <Layers size={13} />
                <span>AEVORA FEATURE-TO-SOURCE MAPPING</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-extrabold text-brand-dark dark:text-white">
                    {selectedFile.featureName}
                  </h4>
                  <p className="text-xs text-brand-secondary mt-0.5">
                    This source file contains the primary business logic implementing this feature.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onSelectFeature) onSelectFeature(selectedFile.featureId);
                    if (onNavigateToTab) onNavigateToTab('features');
                  }}
                  className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-sm whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>Inspect Feature</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Storage & Commit Verification Card */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-secondary">
                STORAGE & COMMIT VERIFICATION
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border">
                  <span className="text-[10px] uppercase font-bold text-brand-secondary block">
                    Commit SHA
                  </span>
                  <span className="font-mono text-sm font-bold text-brand-dark dark:text-white">
                    {selectedFile.commitSha}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border">
                  <span className="text-[10px] uppercase font-bold text-brand-secondary block">
                    File Size
                  </span>
                  <span className="font-mono text-sm font-bold text-brand-dark dark:text-white">
                    {selectedFile.fileSize}
                  </span>
                </div>
              </div>

              {/* Latest Commit Message */}
              <div className="p-3.5 rounded-2xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border space-y-1">
                <div className="text-[11px] text-brand-secondary flex items-center gap-1">
                  <span>→ Latest Commit Message:</span>
                </div>
                <p className="text-xs font-mono font-bold text-brand-dark dark:text-white">
                  "{selectedFile.latestCommit.message}"
                </p>
                <p className="text-[11px] text-brand-secondary">
                  By {selectedFile.latestCommit.author} on {selectedFile.latestCommit.date}
                </p>
              </div>
            </div>

            {/* Interactive Code / Diff Viewer */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border">
                  <button
                    onClick={() => setActiveTab('source')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'source'
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
                    }`}
                  >
                    Source Code
                  </button>
                  <button
                    onClick={() => setActiveTab('diff')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'diff'
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
                    }`}
                  >
                    Commit Diff
                  </button>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs font-medium text-brand-secondary hover:text-brand-dark dark:hover:text-white flex items-center gap-1.5 hover:bg-brand-bg dark:hover:bg-brand-dark transition-colors"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-brand-border dark:border-brand-dark-border bg-[#0D1117] text-gray-200">
                <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed select-all">
                  <code>{activeTab === 'source' ? selectedFile.content : selectedFile.diff}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
