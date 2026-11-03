import { v4 as uuidv4 } from 'uuid';
import { db } from '../store/db.js';
import {
  Workspace,
  ProjectRecord,
  Feature,
  FeatureEvent,
  Decision,
  ConflictItem,
  ActivityLog,
  IntegrationConnection,
  NotificationItem,
} from '../../src/types/index.js';

export const SAMPLE_WORKSPACE_ID = 'sample-workspace-smart-banking';
export const SAMPLE_USER_ID = 'sample-user-alex-morgan';

export function seedSampleWorkspace(force = false) {
  const existing = db.getWorkspaceById(SAMPLE_WORKSPACE_ID);
  const existingEvents = db.getFeatureEvents(SAMPLE_WORKSPACE_ID);
  if (existing && existingEvents.length >= 8 && !force) {
    return existing;
  }

  // Ensure default demo user exists
  if (!db.getUserById(SAMPLE_USER_ID)) {
    db.saveUser({
      id: SAMPLE_USER_ID,
      email: 'alex.morgan@smartbank.io',
      displayName: 'Alex Morgan',
      role: 'admin',
      createdAt: '2024-05-01T09:00:00.000Z',
    });
  }

  // Workspace
  const workspace: Workspace = {
    id: SAMPLE_WORKSPACE_ID,
    name: 'Smart Banking Platform [SAMPLE DATA]',
    productName: 'Smart Banking NextGen',
    productDescription: 'Enterprise retail banking web and mobile application suite with real-time payments, biometric auth, and ledger analytics.',
    teamDetails: 'Core Banking & Identity Engineering (8 members)',
    ownerId: SAMPLE_USER_ID,
    createdAt: '2024-05-01T09:30:00.000Z',
    updatedAt: new Date().toISOString(),
    isSample: true,
  };
  db.saveWorkspace(workspace);

  // Clear any existing sample items if forcing
  if (force) {
    db.clearWorkspaceData(SAMPLE_WORKSPACE_ID);
  }

  // 1. Project Records (with rich authentic markdown source text)
  const record1Id = 'rec-prd-auth-v1';
  const record1: ProjectRecord = {
    id: record1Id,
    workspaceId: SAMPLE_WORKSPACE_ID,
    fileName: 'PRD-2024-Authentication-v1.0.md',
    fileType: 'text/markdown',
    fileSize: 4280,
    sourceType: 'UPLOAD',
    author: 'Sarah Chen (Lead PM)',
    module: 'Authentication & Security',
    eventDate: '2024-05-10',
    ingestionDate: '2024-05-10T10:15:00.000Z',
    status: 'COMPLETED',
    extractedEventCount: 4,
    rawContent: `# Product Requirements Document: Core Authentication & Verification
Date: 2024-05-10
Author: Sarah Chen (Lead PM)
Status: Proposed

## 1. Executive Summary
This document proposes the architecture for User Authentication and Multi-Factor OTP Verification for the Smart Banking platform.

## 2. Requirements & Proposals
- Proposal 1: User Authentication must support email/password with OAuth2 and passkey fallbacks.
- Proposal 2: OTP Verification must be triggered upon login from unrecognized devices and before high-value transactions.
- OTP Expiration Specification: The one-time code validity window shall be set to 300 seconds (5 minutes) to ensure optimal user experience over unstable mobile carrier networks.
- Proposed SMS gateway provider: Twilio High-Availability tier.

## 3. Scope & Dependencies
OTP Verification depends directly on User Authentication and integrates with the Notification System.`,
    summary: 'Initial proposal for User Authentication and OTP Verification with 5-minute timeout window.',
    isSample: true,
  };
  db.saveRecord(record1);

  const record2Id = 'rec-arch-review-may12';
  const record2: ProjectRecord = {
    id: record2Id,
    workspaceId: SAMPLE_WORKSPACE_ID,
    fileName: 'ARCH-REVIEW-2024-05-12.md',
    fileType: 'text/markdown',
    fileSize: 3120,
    sourceType: 'UPLOAD',
    author: 'Marcus Vance (Principal Architect)',
    module: 'Authentication & Security',
    eventDate: '2024-05-12',
    ingestionDate: '2024-05-12T14:30:00.000Z',
    status: 'COMPLETED',
    extractedEventCount: 3,
    rawContent: `# Architecture Review Board Sign-Off
Date: 2024-05-12
Attendees: Marcus Vance (Principal Architect), Elena Rostova (VP Engineering), Sarah Chen (Lead PM)

## Decisions Approved
1. User Authentication architecture approved for Phase 1 rollout using JWT with RS256 signing.
2. OTP Verification specification approved with Redis-backed rate limiting (max 3 attempts per 15 minutes).
3. Payment Gateway architecture proposed using Stripe Enterprise integration with ISO 20022 messaging standards.`,
    summary: 'Formal architecture approval of User Authentication and OTP Verification.',
    isSample: true,
  };
  db.saveRecord(record2);

  const record3Id = 'rec-pr-104-impl';
  const record3: ProjectRecord = {
    id: record3Id,
    workspaceId: SAMPLE_WORKSPACE_ID,
    fileName: 'GitHub PR #104: feat(auth): implement otp verification module.md',
    fileType: 'text/markdown',
    fileSize: 2890,
    sourceType: 'GITHUB',
    author: 'Devin K (Senior Backend Engineer)',
    module: 'Authentication & Security',
    eventDate: '2024-05-18',
    ingestionDate: '2024-05-18T16:45:00.000Z',
    status: 'COMPLETED',
    extractedEventCount: 2,
    rawContent: `# Pull Request #104: Implement OTP Verification Module
Merged by: Marcus Vance
Merged at: 2024-05-18T16:42:00Z
Commit SHA: 7f8a91b

## Description
Implements the core OTP generation, hashing with bcrypt, SMS dispatch pipeline, and verification endpoint /api/v1/auth/verify-otp.
Unit test coverage: 94%. Verified on staging environment.`,
    summary: 'Implementation and merge of the OTP Verification service and endpoints.',
    isSample: true,
  };
  db.saveRecord(record3);

  const record4Id = 'rec-sec-audit-may22';
  const record4: ProjectRecord = {
    id: record4Id,
    workspaceId: SAMPLE_WORKSPACE_ID,
    fileName: 'SEC-AUDIT-2024-05-22.md',
    fileType: 'text/markdown',
    fileSize: 3450,
    sourceType: 'UPLOAD',
    author: 'Rachel Wei (Chief Information Security Officer)',
    module: 'Authentication & Security',
    eventDate: '2024-05-22',
    ingestionDate: '2024-05-22T11:00:00.000Z',
    status: 'COMPLETED',
    extractedEventCount: 2,
    rawContent: `# Security Audit Finding & Policy Directive
Date: 2024-05-22
Auditor: Rachel Wei (CISO)
Severity: High

## Finding: Excessive OTP Expiration Window
The original PRD specified a 300-second (5 minutes) OTP validity window. Under financial regulatory guidelines (PCI-DSS 4.0 and NIST SP 800-63B), SMS OTPs must expire within 120 seconds (2 minutes).

## Mandatory Modification Directive:
Modified requirement: OTP expiration time must be reduced immediately from 300 seconds to 120 seconds.
Status: Implemented in Hotfix #112.`,
    summary: 'Security audit mandate modifying OTP expiration from 300 seconds to 120 seconds.',
    isSample: true,
  };
  db.saveRecord(record4);

  const record5Id = 'rec-payments-prd';
  const record5: ProjectRecord = {
    id: record5Id,
    workspaceId: SAMPLE_WORKSPACE_ID,
    fileName: 'PRD-2024-Payments-Engine.md',
    fileType: 'text/markdown',
    fileSize: 4100,
    sourceType: 'UPLOAD',
    author: 'Vikram Patel (Product Lead)',
    module: 'Payments & Transfers',
    eventDate: '2024-05-25',
    ingestionDate: '2024-05-25T09:00:00.000Z',
    status: 'COMPLETED',
    extractedEventCount: 3,
    rawContent: `# Product Requirements: Payment Gateway & Transaction History
Date: 2024-05-25
Author: Vikram Patel
Status: Approved

## Overview
Specifications for multi-rail payments (SEPA, ACH, Wire) and real-time ledger recording.
- Payment Gateway: Approved for dual-vendor fallback (Stripe + Adyen).
- Transaction History: Proposed real-time indexed search by merchant, category, and date range.
- Notification System: Integrates push notifications for transaction receipts.`,
    summary: 'Approval of Payment Gateway and initial proposal for Transaction History.',
    isSample: true,
  };
  db.saveRecord(record5);

  // 2. Features (5 Core Banking features)
  const featAuthId = 'feat-user-auth';
  const featOtpId = 'feat-otp-verification';
  const featPaymentId = 'feat-payment-gateway';
  const featTxId = 'feat-transaction-history';
  const featNotifId = 'feat-notification-system';

  const featOtp: Feature = {
    id: featOtpId,
    workspaceId: SAMPLE_WORKSPACE_ID,
    name: 'OTP Verification',
    module: 'Authentication & Security',
    description: 'Time-based one-time password verification via SMS/Email for multi-factor login and step-up transaction validation.',
    currentStatus: 'MODIFIED',
    firstRecordedDate: '2024-05-10',
    lastModifiedDate: '2024-05-22',
    aliases: ['Two-Factor OTP', 'SMS OTP', 'MFA Verification'],
    relatedPeople: ['Sarah Chen', 'Marcus Vance', 'Devin K', 'Rachel Wei'],
    dependencies: ['User Authentication'],
    historicalEventCount: 4,
    sourceRecordIds: [record1Id, record2Id, record3Id, record4Id],
    isSample: true,
  };
  db.saveFeature(featOtp);

  const featAuth: Feature = {
    id: featAuthId,
    workspaceId: SAMPLE_WORKSPACE_ID,
    name: 'User Authentication',
    module: 'Authentication & Security',
    description: 'Core identity provider handling user registration, encrypted credential validation, JWT token issuance, and session management.',
    currentStatus: 'IMPLEMENTED',
    firstRecordedDate: '2024-05-10',
    lastModifiedDate: '2024-05-18',
    aliases: ['Auth0 Service', 'Login System', 'Identity Provider'],
    relatedPeople: ['Sarah Chen', 'Marcus Vance', 'Devin K'],
    dependencies: [],
    historicalEventCount: 3,
    sourceRecordIds: [record1Id, record2Id, record3Id],
    isSample: true,
  };
  db.saveFeature(featAuth);

  const featPayment: Feature = {
    id: featPaymentId,
    workspaceId: SAMPLE_WORKSPACE_ID,
    name: 'Payment Gateway',
    module: 'Payments & Transfers',
    description: 'Multi-rail payment orchestration engine handling SEPA, ACH, credit card tokenization, and transaction settlement.',
    currentStatus: 'APPROVED',
    firstRecordedDate: '2024-05-12',
    lastModifiedDate: '2024-05-25',
    aliases: ['Payment Orchestration', 'Stripe Bridge'],
    relatedPeople: ['Vikram Patel', 'Elena Rostova'],
    dependencies: ['User Authentication', 'Notification System'],
    historicalEventCount: 2,
    sourceRecordIds: [record2Id, record5Id],
    isSample: true,
  };
  db.saveFeature(featPayment);

  const featTx: Feature = {
    id: featTxId,
    workspaceId: SAMPLE_WORKSPACE_ID,
    name: 'Transaction History',
    module: 'Ledger & Analytics',
    description: 'Real-time ledger inquiry service offering full-text search, categorisation, and exportable statements for account holders.',
    currentStatus: 'PROPOSED',
    firstRecordedDate: '2024-05-25',
    lastModifiedDate: '2024-05-25',
    aliases: ['Ledger History', 'Account Statements'],
    relatedPeople: ['Vikram Patel'],
    dependencies: ['Payment Gateway'],
    historicalEventCount: 1,
    sourceRecordIds: [record5Id],
    isSample: true,
  };
  db.saveFeature(featTx);

  const featNotif: Feature = {
    id: featNotifId,
    workspaceId: SAMPLE_WORKSPACE_ID,
    name: 'Notification System',
    module: 'Communications',
    description: 'Asynchronous event-driven push, SMS, and email notification pipeline delivering critical banking alerts and OTP codes.',
    currentStatus: 'IMPLEMENTED',
    firstRecordedDate: '2024-05-10',
    lastModifiedDate: '2024-05-25',
    aliases: ['Alerts Service', 'Push Dispatcher'],
    relatedPeople: ['Sarah Chen', 'Devin K'],
    dependencies: [],
    historicalEventCount: 2,
    sourceRecordIds: [record1Id, record5Id],
    isSample: true,
  };
  db.saveFeature(featNotif);

  // 3. Temporal Feature Events (Exact lifecycle requested in Section 19)
  const event1: FeatureEvent = {
    id: 'evt-otp-1-proposed',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featOtpId,
    featureName: 'OTP Verification',
    moduleName: 'Authentication & Security',
    eventType: 'FEATURE_PROPOSED',
    description: 'OTP Verification proposed with 300-second expiration window and SMS carrier integration.',
    previousState: 'None (New Capability)',
    newState: 'Proposed',
    eventDate: '2024-05-10',
    ingestionDate: '2024-05-10T10:15:00.000Z',
    person: 'Sarah Chen (Lead PM)',
    decisionStatus: 'Pending Review',
    reason: 'Required for compliant multi-factor step-up authentication on suspicious logins.',
    sourceRecordId: record1Id,
    evidenceText: 'Proposal 2: OTP Verification must be triggered upon login from unrecognized devices and before high-value transactions. OTP Expiration Specification: The one-time code validity window shall be set to 300 seconds (5 minutes).',
    confidence: 0.98,
    status: 'VALIDATED',
    createdAt: '2024-05-10T10:15:00.000Z',
    isSample: true,
  };
  db.saveFeatureEvent(event1);

  const event2: FeatureEvent = {
    id: 'evt-otp-2-approved',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featOtpId,
    featureName: 'OTP Verification',
    moduleName: 'Authentication & Security',
    eventType: 'FEATURE_APPROVED',
    description: 'Architecture review board approves OTP Verification design with Redis rate limiter.',
    previousState: 'Proposed',
    newState: 'Approved',
    eventDate: '2024-05-12',
    ingestionDate: '2024-05-12T14:30:00.000Z',
    person: 'Marcus Vance (Principal Architect)',
    decisionStatus: 'Approved',
    reason: 'Passed architectural scalability and latency constraints.',
    sourceRecordId: record2Id,
    evidenceText: 'OTP Verification specification approved with Redis-backed rate limiting (max 3 attempts per 15 minutes). Attendees: Marcus Vance, Elena Rostova, Sarah Chen.',
    confidence: 0.99,
    status: 'VALIDATED',
    createdAt: '2024-05-12T14:30:00.000Z',
    isSample: true,
  };
  db.saveFeatureEvent(event2);

  const event3: FeatureEvent = {
    id: 'evt-otp-3-implemented',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featOtpId,
    featureName: 'OTP Verification',
    moduleName: 'Authentication & Security',
    eventType: 'FEATURE_IMPLEMENTED',
    description: 'OTP Verification implemented and merged in GitHub Pull Request #104.',
    previousState: 'Approved',
    newState: 'Implemented',
    eventDate: '2024-05-18',
    ingestionDate: '2024-05-18T16:45:00.000Z',
    person: 'Devin K (Merged by Marcus Vance)',
    decisionStatus: 'Merged to Main',
    reason: 'Sprint 24 core milestone deliverable.',
    sourceRecordId: record3Id,
    evidenceText: 'Implements the core OTP generation, hashing with bcrypt, SMS dispatch pipeline, and verification endpoint /api/v1/auth/verify-otp. Merged by: Marcus Vance at 2024-05-18T16:42:00Z.',
    confidence: 0.99,
    status: 'VALIDATED',
    createdAt: '2024-05-18T16:45:00.000Z',
    isSample: true,
  };
  db.saveFeatureEvent(event3);

  const event4: FeatureEvent = {
    id: 'evt-otp-4-modified',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featOtpId,
    featureName: 'OTP Verification',
    moduleName: 'Authentication & Security',
    eventType: 'FEATURE_MODIFIED',
    description: 'OTP expiration time modified from 300s (5m) to 120s (2m) following security audit directive.',
    previousState: 'Implemented (300s validity window)',
    newState: 'Modified (120s validity window enforced)',
    eventDate: '2024-05-22',
    ingestionDate: '2024-05-22T11:00:00.000Z',
    person: 'Rachel Wei (CISO)',
    decisionStatus: 'Policy Mandate',
    reason: 'PCI-DSS 4.0 and NIST SP 800-63B financial compliance requirement.',
    sourceRecordId: record4Id,
    evidenceText: 'Modified requirement: OTP expiration time must be reduced immediately from 300 seconds to 120 seconds. Under financial regulatory guidelines, SMS OTPs must expire within 120 seconds.',
    confidence: 0.97,
    status: 'VALIDATED',
    createdAt: '2024-05-22T11:00:00.000Z',
    isSample: true,
  };
  db.saveFeatureEvent(event4);

  // Other feature events
  db.saveFeatureEvent({
    id: 'evt-auth-1',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featAuthId,
    featureName: 'User Authentication',
    moduleName: 'Authentication & Security',
    eventType: 'FEATURE_PROPOSED',
    description: 'User Authentication proposed for core banking app.',
    previousState: 'None',
    newState: 'Proposed',
    eventDate: '2024-05-10',
    ingestionDate: '2024-05-10T10:15:00.000Z',
    person: 'Sarah Chen',
    decisionStatus: 'Proposed',
    reason: 'Baseline user identification.',
    sourceRecordId: record1Id,
    evidenceText: 'Proposal 1: User Authentication must support email/password with OAuth2 and passkey fallbacks.',
    confidence: 0.95,
    status: 'VALIDATED',
    createdAt: '2024-05-10T10:15:00.000Z',
    isSample: true,
  });

  db.saveFeatureEvent({
    id: 'evt-auth-2',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featAuthId,
    featureName: 'User Authentication',
    moduleName: 'Authentication & Security',
    eventType: 'FEATURE_APPROVED',
    description: 'User Authentication architecture approved using JWT RS256.',
    previousState: 'Proposed',
    newState: 'Approved',
    eventDate: '2024-05-12',
    ingestionDate: '2024-05-12T14:30:00.000Z',
    person: 'Marcus Vance',
    decisionStatus: 'Approved',
    reason: 'Standard security compliance.',
    sourceRecordId: record2Id,
    evidenceText: 'User Authentication architecture approved for Phase 1 rollout using JWT with RS256 signing.',
    confidence: 0.98,
    status: 'VALIDATED',
    createdAt: '2024-05-12T14:30:00.000Z',
    isSample: true,
  });

  db.saveFeatureEvent({
    id: 'evt-auth-3',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featAuthId,
    featureName: 'User Authentication',
    moduleName: 'Authentication & Security',
    eventType: 'FEATURE_IMPLEMENTED',
    description: 'User Authentication core endpoints implemented.',
    previousState: 'Approved',
    newState: 'Implemented',
    eventDate: '2024-05-18',
    ingestionDate: '2024-05-18T16:45:00.000Z',
    person: 'Devin K',
    decisionStatus: 'Implemented',
    reason: 'Sprint 24 launch.',
    sourceRecordId: record3Id,
    evidenceText: 'Verified on staging environment alongside OTP service integration.',
    confidence: 0.96,
    status: 'VALIDATED',
    createdAt: '2024-05-18T16:45:00.000Z',
    isSample: true,
  });

  db.saveFeatureEvent({
    id: 'evt-pay-1',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featPaymentId,
    featureName: 'Payment Gateway',
    moduleName: 'Payments & Transfers',
    eventType: 'FEATURE_PROPOSED',
    description: 'Payment Gateway proposed with Stripe Enterprise integration.',
    previousState: 'None',
    newState: 'Proposed',
    eventDate: '2024-05-12',
    ingestionDate: '2024-05-12T14:30:00.000Z',
    person: 'Elena Rostova',
    decisionStatus: 'Proposed',
    reason: 'Payment rails support.',
    sourceRecordId: record2Id,
    evidenceText: 'Payment Gateway architecture proposed using Stripe Enterprise integration with ISO 20022 messaging standards.',
    confidence: 0.94,
    status: 'VALIDATED',
    createdAt: '2024-05-12T14:30:00.000Z',
    isSample: true,
  });

  db.saveFeatureEvent({
    id: 'evt-pay-2',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featPaymentId,
    featureName: 'Payment Gateway',
    moduleName: 'Payments & Transfers',
    eventType: 'FEATURE_APPROVED',
    description: 'Payment Gateway approved for dual-vendor fallback (Stripe + Adyen).',
    previousState: 'Proposed',
    newState: 'Approved',
    eventDate: '2024-05-25',
    ingestionDate: '2024-05-25T09:00:00.000Z',
    person: 'Vikram Patel',
    decisionStatus: 'Approved',
    reason: 'High availability redundant rails.',
    sourceRecordId: record5Id,
    evidenceText: 'Payment Gateway: Approved for dual-vendor fallback (Stripe + Adyen).',
    confidence: 0.98,
    status: 'VALIDATED',
    createdAt: '2024-05-25T09:00:00.000Z',
    isSample: true,
  });

  // 4. Decisions
  const decision1: Decision = {
    id: 'dec-1-otp-limiter',
    workspaceId: SAMPLE_WORKSPACE_ID,
    title: 'Redis-backed OTP Rate Limiting Specification',
    description: 'Enforce max 3 OTP attempts per 15-minute window to mitigate brute force enumeration.',
    status: 'APPROVED',
    decider: 'Marcus Vance (Principal Architect)',
    date: '2024-05-12',
    featureId: featOtpId,
    featureName: 'OTP Verification',
    sourceRecordId: record2Id,
    evidenceText: 'OTP Verification specification approved with Redis-backed rate limiting (max 3 attempts per 15 minutes).',
  };
  db.saveDecision(decision1);

  const decision2: Decision = {
    id: 'dec-2-otp-timeout-mod',
    workspaceId: SAMPLE_WORKSPACE_ID,
    title: 'Strict 120-Second OTP Validity Enactment',
    description: 'Override PRD 300s window to adhere strictly to PCI-DSS 4.0 standard.',
    status: 'RESOLVED',
    decider: 'Rachel Wei (CISO)',
    date: '2024-05-22',
    featureId: featOtpId,
    featureName: 'OTP Verification',
    sourceRecordId: record4Id,
    evidenceText: 'Modified requirement: OTP expiration time must be reduced immediately from 300 seconds to 120 seconds.',
  };
  db.saveDecision(decision2);

  // 5. Conflicts
  const conflict1: ConflictItem = {
    id: 'cnf-otp-window',
    workspaceId: SAMPLE_WORKSPACE_ID,
    featureId: featOtpId,
    featureName: 'OTP Verification',
    title: 'Conflicting OTP Expiration Window: 300s vs 120s',
    conflictingStatements: [
      {
        statement: 'PRD states OTP expiration validity window is 300 seconds (5 minutes) for network tolerance.',
        sourceRecordId: record1Id,
        sourceName: 'PRD-2024-Authentication-v1.0.md',
        date: '2024-05-10',
        evidenceText: 'The one-time code validity window shall be set to 300 seconds (5 minutes) to ensure optimal user experience over unstable mobile carrier networks.',
      },
      {
        statement: 'CISO Security Directive mandates 120 seconds (2 minutes) max expiration under PCI-DSS 4.0.',
        sourceRecordId: record4Id,
        sourceName: 'SEC-AUDIT-2024-05-22.md',
        date: '2024-05-22',
        evidenceText: 'Under financial regulatory guidelines (PCI-DSS 4.0 and NIST SP 800-63B), SMS OTPs must expire within 120 seconds (2 minutes).',
      },
    ],
    reason: 'Product team prioritized user completion rates on slow networks, whereas Security Audit enforced non-negotiable regulatory compliance.',
    status: 'REVIEWED',
    resolutionNote: 'The 120-second threshold supersedes earlier PRD specifications as per CISO security directive. Telemetry indicates 98.4% of users verify within 45 seconds.',
    resolvedAt: '2024-05-23T10:00:00.000Z',
    resolvedBy: 'Alex Morgan',
    createdAt: '2024-05-22T11:15:00.000Z',
  };
  db.saveConflict(conflict1);

  // 6. Activity Logs
  const logs: Array<Omit<ActivityLog, 'id'>> = [
    {
      workspaceId: SAMPLE_WORKSPACE_ID,
      type: 'SECURITY_MODIFICATION',
      title: 'OTP Expiration Reduced to 120s',
      description: 'Rachel Wei applied PCI-DSS compliance update on OTP Verification.',
      featureId: featOtpId,
      featureName: 'OTP Verification',
      source: 'MANUAL',
      timestamp: '2024-05-22T11:00:00.000Z',
      status: 'WARNING',
    },
    {
      workspaceId: SAMPLE_WORKSPACE_ID,
      type: 'PR_MERGE',
      title: 'GitHub PR #104 Merged to Main',
      description: 'Devin K merged implementation of OTP Verification module.',
      featureId: featOtpId,
      featureName: 'OTP Verification',
      source: 'GITHUB',
      timestamp: '2024-05-18T16:45:00.000Z',
      status: 'SUCCESS',
    },
    {
      workspaceId: SAMPLE_WORKSPACE_ID,
      type: 'FEATURE_APPROVAL',
      title: 'Architecture Board Signed Off Auth & OTP',
      description: 'Marcus Vance approved User Authentication and OTP Verification designs.',
      featureId: featAuthId,
      featureName: 'User Authentication',
      source: 'SYSTEM',
      timestamp: '2024-05-12T14:30:00.000Z',
      status: 'SUCCESS',
    },
    {
      workspaceId: SAMPLE_WORKSPACE_ID,
      type: 'DOCUMENT_UPLOAD',
      title: 'PRD-2024-Authentication-v1.0.md Ingested',
      description: 'Gemini AI extracted 4 temporal feature events from document.',
      source: 'GEMINI_AI',
      timestamp: '2024-05-10T10:15:00.000Z',
      status: 'INFO',
    },
  ];
  logs.forEach((l) => db.addActivityLog(l));

  // 7. Integrations
  const githubInt: IntegrationConnection = {
    id: 'int-github',
    workspaceId: SAMPLE_WORKSPACE_ID,
    provider: 'GITHUB',
    name: 'GitHub Webhook (Production Repo)',
    isConnected: true,
    config: {
      repository: 'smartbank-io/banking-core-api',
      webhookUrl: 'http://localhost:3001/api/webhooks/github',
      webhookSecret: 'aevora_webhook_secret_dev',
    },
    lastSyncAt: '2024-05-25T14:00:00.000Z',
    lastEventAt: '2024-05-18T16:45:00.000Z',
    statusText: 'Active & Listening to pull_request, push events',
    error: null,
  };
  db.saveIntegration(githubInt);

  const jiraInt: IntegrationConnection = {
    id: 'int-jira',
    workspaceId: SAMPLE_WORKSPACE_ID,
    provider: 'JIRA',
    name: 'Atlassian Jira Software',
    isConnected: false,
    config: {
      projectKey: 'BANK',
    },
    lastSyncAt: null,
    lastEventAt: null,
    statusText: 'Not connected - Enter Jira API Token & Host URL in settings to activate',
    error: null,
  };
  db.saveIntegration(jiraInt);

  const driveInt: IntegrationConnection = {
    id: 'int-gdrive',
    workspaceId: SAMPLE_WORKSPACE_ID,
    provider: 'GOOGLE_DRIVE',
    name: 'Google Drive Document Sync',
    isConnected: false,
    config: {},
    lastSyncAt: null,
    lastEventAt: null,
    statusText: 'Not connected - OAuth2 Service Account configuration required',
    error: null,
  };
  db.saveIntegration(driveInt);

  // 8. Notifications
  db.addNotification({
    workspaceId: SAMPLE_WORKSPACE_ID,
    title: 'Policy Change on OTP Verification',
    message: 'OTP timeout adjusted to 120s per SEC-AUDIT-2024-05-22.md finding.',
    type: 'FEATURE_MODIFIED',
    link: '/timeline',
  });
  db.addNotification({
    workspaceId: SAMPLE_WORKSPACE_ID,
    title: 'Conflict Flagged: Expiration Window',
    message: 'PRD-2024 specifies 300s while Security Audit specifies 120s.',
    type: 'CONFLICT_DETECTED',
    link: '/conflicts',
  });
  db.addNotification({
    workspaceId: SAMPLE_WORKSPACE_ID,
    title: 'New Feature Approved: Payment Gateway',
    message: 'Dual-vendor architecture signed off by Vikram Patel.',
    type: 'APPROVAL',
    link: '/features',
  });

  return workspace;
}
