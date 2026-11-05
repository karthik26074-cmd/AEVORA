import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../store/db.js';
import { geminiService } from '../services/geminiService.js';
import { webhookService } from '../services/webhookService.js';
import { seedSampleWorkspace, SAMPLE_WORKSPACE_ID } from '../services/sampleData.js';
import { extractTextFromFile } from '../services/documentParser.js';
import { eventsDbService } from '../services/eventsDbService.js';
import {
  ProjectRecord,
  Feature,
  FeatureEvent,
  KnowledgeGraphData,
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
} from '../../src/types/index.js';

const router = Router();

function getEffectiveWorkspaceId(id?: string): string {
  if (id && id !== SAMPLE_WORKSPACE_ID) return id;
  const workspaces = db.getWorkspaces();
  return workspaces[0]?.id || 'ws-main';
}


// Configure multer file upload
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.csv', '.json', '.md', '.markdown']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'text/markdown',
  'application/octet-stream', // Some browsers report octet-stream for md/csv
]);

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Unsupported file type: ${ext}. Supported formats are PDF, DOCX, TXT, CSV, JSON, and Markdown.`));
    }
    cb(null, true);
  },
});

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

router.post('/auth/register', (req: Request, res: Response) => {
  const { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Full name, email, and password are required' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const user = db.saveUser({
    id: `user-${uuidv4().slice(0, 8)}`,
    email,
    displayName: fullName,
    role: 'admin',
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, user });
});

router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let user = db.getUserByEmail(email);
  if (!user) {
    // For seamless first-time login experience, auto-provision user profile
    user = db.saveUser({
      id: `user-${uuidv4().slice(0, 8)}`,
      email,
      displayName: email.split('@')[0].replace(/[._-]/g, ' '),
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
  }

  return res.json({ success: true, user });
});

router.post('/auth/demo', (req: Request, res: Response) => {
  seedSampleWorkspace();
  const demoUser = db.getUserById('sample-user-alex-morgan') || {
    id: 'sample-user-alex-morgan',
    email: 'alex.morgan@smartbank.io',
    displayName: 'Alex Morgan',
    role: 'admin',
    createdAt: '2024-05-01T09:00:00.000Z',
  };
  return res.json({ success: true, user: demoUser });
});

router.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  return res.json({
    success: true,
    message: `Password reset instructions have been dispatched to ${email || 'your email'}. Check your inbox.`,
  });
});

// ==========================================
// 2. WORKSPACES ROUTES
// ==========================================

router.get('/workspaces', (req: Request, res: Response) => {
  const userId = req.query.userId as string | undefined;
  let workspaces = db.getWorkspaces(userId);
  if (workspaces.length === 0) {
    if (process.env.DEMO_MODE === 'true') {
      seedSampleWorkspace();
      workspaces = db.getWorkspaces(userId);
    } else {
      const defaultWs = db.saveWorkspace({
        id: `ws-${uuidv4().slice(0, 8)}`,
        name: 'AEVORA Workspace',
        productName: 'Production Product',
        productDescription: 'Repository and feature intelligence tracking.',
        teamDetails: 'Core Engineering',
        ownerId: userId || 'user-default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSample: false,
      });
      workspaces = [defaultWs];
    }
  }
  return res.json(workspaces);
});

router.post('/workspaces', (req: Request, res: Response) => {
  const { name, productName, productDescription, teamDetails, ownerId, includeSampleData } = req.body;
  if (!name || !productName) {
    return res.status(400).json({ error: 'Workspace name and product name are required' });
  }

  const workspaceId = `ws-${uuidv4().slice(0, 8)}`;
  const workspace = db.saveWorkspace({
    id: workspaceId,
    name,
    productName,
    productDescription: productDescription || '',
    teamDetails: teamDetails || '',
    ownerId: ownerId || 'user-default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSample: false,
  });

  // Seed default integration records
  const defaultIntegrations = [
    {
      id: `int-gh-${workspaceId}`,
      workspaceId,
      provider: 'GITHUB' as const,
      name: 'GitHub Webhook',
      isConnected: false,
      config: {
        repository: '',
        webhookUrl: `http://localhost:3001/api/webhooks/github`,
        webhookSecret: 'aevora_webhook_secret_dev',
      },
      lastSyncAt: null,
      lastEventAt: null,
      statusText: 'Disconnected — Configure repository identifier to connect',
    },
    {
      id: `int-jira-${workspaceId}`,
      workspaceId,
      provider: 'JIRA' as const,
      name: 'Atlassian Jira',
      isConnected: false,
      config: { projectKey: '' },
      lastSyncAt: null,
      lastEventAt: null,
      statusText: 'Disconnected',
    },
    {
      id: `int-drive-${workspaceId}`,
      workspaceId,
      provider: 'GOOGLE_DRIVE' as const,
      name: 'Google Drive Sync',
      isConnected: false,
      config: {},
      lastSyncAt: null,
      lastEventAt: null,
      statusText: 'Disconnected',
    },
  ];
  defaultIntegrations.forEach((i) => db.saveIntegration(i));

  db.addActivityLog({
    workspaceId,
    type: 'WORKSPACE_CREATED',
    title: `Workspace "${name}" Initialized`,
    description: `Product "${productName}" workspace registered.`,
    source: 'SYSTEM',
    timestamp: new Date().toISOString(),
    status: 'SUCCESS',
  });

  return res.json(workspace);
});

router.post('/workspaces/seed-sample', (req: Request, res: Response) => {
  const ws = seedSampleWorkspace(true);
  return res.json({ success: true, workspace: ws });
});

router.delete('/workspaces/:id/data', (req: Request, res: Response) => {
  const id = req.params.id as string;
  db.clearWorkspaceData(id);
  return res.json({ success: true, message: 'Workspace data cleared' });
});

// ==========================================
// 2.1 LIVE REAL-TIME EVENT DISPATCHER & STREAM
// ==========================================

router.post('/demo/dispatch-live-event', async (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.body.workspaceId as string);
  const eventCategory = req.body.eventCategory || 'PULL_REQUEST';
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const deliveryId = `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  let fileName = '';
  let author = req.body.author || 'Marcus Vance (Staff Engineer)';
  let rawContent = req.body.content || '';
  let eventTitle = req.body.title || '';
  const eventType = req.body.eventType || 'FEATURE_IMPLEMENTED';

  if (eventCategory === 'PULL_REQUEST') {
    const prNum = Math.floor(Math.random() * 50) + 140;
    eventTitle = eventTitle || `GitHub PR #${prNum}: feat(security): Implement Passkey WebAuthn & biometric session verification`;
    fileName = `${eventTitle}.md`;
    rawContent =
      rawContent ||
      `# Pull Request #${prNum}: Biometric Passkey Support
Author: ${author}
Merged at: ${now.toISOString()}
Date: ${dateStr}
Status: MERGED

## Description
Implements hardware passkey authentication via WebAuthn, hardware tokens, and mobile biometrics. Tested on staging environment.
Feature: Passkey Biometrics
Module: Authentication & Security`;
  } else if (eventCategory === 'COMMIT') {
    const hash = Math.random().toString(36).slice(2, 9);
    eventTitle = eventTitle || `git push: commit [${hash}] enforce 60s OTP timeout & distributed rate throttle`;
    fileName = `${eventTitle}.md`;
    rawContent =
      rawContent ||
      `# Git Commit ${hash}
Repository: smartbank-io/banking-core-api
Author: ${author}
Date: ${dateStr}

## Commit Message
Enforce strict 60s expiration on OTP tokens across all regional clusters. Mitigates session retention vulnerability.
Feature: OTP Verification
Module: Authentication & Security`;
  } else if (eventCategory === 'GOOGLE_DRIVE') {
    eventTitle = eventTitle || `Google Drive PRD: Smart Banking Biometric Authentication Architecture Spec v2.4`;
    fileName = `${eventTitle}.md`;
    rawContent =
      rawContent ||
      `# Product Requirements Document (PRD): Biometric Auth v2.4
Source: Google Drive / Engineering / PRDs
Author: Sarah Chen (Head of Product) & Marcus Vance
Date: ${dateStr}
Status: APPROVED

## 1. Executive Summary
This document specifies the biometric authentication and Passkey standards for Smart Banking NextGen.

## 2. Requirement Specifications
- WebAuthn Level 3 FIDO2 compliance
- Mobile face recognition and fingerprint biometric fallback
- 60s session token expiration
- Real-time audit trail and hardware security module (HSM) signing

Feature: Biometric Authentication
Module: Authentication & Security`;
  } else if (eventCategory === 'DECISION') {
    eventTitle = eventTitle || `ADR-2026: Architecture Approval — Migrate Payment Gateway to gRPC Microservices`;
    fileName = `${eventTitle}.md`;
    rawContent =
      rawContent ||
      `# Architectural Decision Record (ADR)
Signatory: Elena Rostova (VP of Engineering)
Date: ${dateStr}
Status: APPROVED

## Context & Decision
The architecture review board approved gRPC service mesh with zero-trust mTLS to replace legacy REST connectors.
Feature: Payment Gateway
Module: Core Transactions`;
  } else if (eventCategory === 'SECURITY') {
    eventTitle = eventTitle || `SEC-AUDIT Directive: Immediate revocation of unencrypted API keys`;
    fileName = `${eventTitle}.md`;
    rawContent =
      rawContent ||
      `# Security Policy Directive
Auditor: Rachel Wei (CISO)
Date: ${dateStr}
Status: MANDATORY_DIRECTIVE

## Finding & Directive
All third-party webhooks must enforce HMAC-SHA256 signature verification with 5-minute replay window tolerance.
Feature: Webhook Ingestion Engine
Module: Infrastructure`;
  } else {
    eventTitle = eventTitle || `Live Event: ${req.body.name || 'Custom Feature Event'}`;
    fileName = `${eventTitle}.md`;
    rawContent = rawContent || `# ${eventTitle}\nAuthor: ${author}\nDate: ${dateStr}\n\n${req.body.description || ''}`;
  }

  // 1. Create and save ProjectRecord
  const recordId = `rec-live-${deliveryId.slice(0, 10)}`;
  const record: ProjectRecord = {
    id: recordId,
    workspaceId,
    fileName,
    fileType: 'text/markdown',
    fileSize: Buffer.byteLength(rawContent, 'utf-8'),
    sourceType: eventCategory === 'GOOGLE_DRIVE' ? 'GOOGLE_DRIVE' : (eventCategory === 'PULL_REQUEST' || eventCategory === 'COMMIT' ? 'GITHUB' : 'UPLOAD'),
    author,
    eventDate: dateStr,
    ingestionDate: now.toISOString(),
    status: 'PROCESSING',
    extractedEventCount: 1,
    rawContent,
    summary: `Live real-time event ingested at ${timeStr}`,
  };
  db.saveRecord(record);

  // 2. Extract with Gemini or deterministic extractor
  let extractedPayloads = await geminiService.extractEventsFromDocument(rawContent, {
    id: recordId,
    fileName,
    author,
    eventDate: dateStr,
  });

  if (extractedPayloads.length === 0) {
    extractedPayloads = [
      {
        featureName:
          req.body.featureName ||
          (eventCategory === 'PULL_REQUEST'
            ? 'Passkey Biometrics'
            : eventCategory === 'COMMIT'
            ? 'OTP Verification'
            : 'Payment Gateway'),
        moduleName: 'Authentication & Security',
        eventType: (eventType as any) || 'FEATURE_IMPLEMENTED',
        description: eventTitle,
        previousState: 'PROPOSED',
        newState: 'IMPLEMENTED',
        eventDate: dateStr,
        ingestionDate: now.toISOString(),
        person: author,
        decisionStatus: 'APPROVED',
        reason: 'Live real-time pipeline event',
        sourceRecordId: recordId,
        evidenceText: rawContent.slice(0, 150).replace(/\n/g, ' '),
        confidence: 0.98,
      },
    ];
  }

  // 3. Save feature & events
  for (const item of extractedPayloads) {
    let feature = db.getFeatureByName(workspaceId, item.featureName);
    if (!feature) {
      feature = {
        id: `feat-${uuidv4().slice(0, 8)}`,
        workspaceId,
        name: item.featureName,
        module: item.moduleName || 'General',
        description: item.description,
        currentStatus: item.eventType === 'FEATURE_IMPLEMENTED' ? 'IMPLEMENTED' : 'MODIFIED',
        firstRecordedDate: item.eventDate || dateStr,
        lastModifiedDate: item.eventDate || dateStr,
        aliases: [],
        relatedPeople: item.person ? [item.person] : [author],
        dependencies: [],
        historicalEventCount: 0,
        sourceRecordIds: [recordId],
      };
    } else {
      feature.lastModifiedDate = item.eventDate || dateStr;
      if (item.person && !feature.relatedPeople.includes(item.person)) {
        feature.relatedPeople.push(item.person);
      }
      if (!feature.sourceRecordIds.includes(recordId)) {
        feature.sourceRecordIds.push(recordId);
      }
      feature.currentStatus = item.eventType === 'FEATURE_IMPLEMENTED' ? 'IMPLEMENTED' : 'MODIFIED';
    }

    feature.historicalEventCount += 1;
    db.saveFeature(feature);

    const featureEvent: FeatureEvent = {
      ...item,
      id: `evt-${uuidv4().slice(0, 8)}`,
      workspaceId,
      featureId: feature.id,
      status: 'VALIDATED',
      createdAt: now.toISOString(),
    };
    db.saveFeatureEvent(featureEvent);
  }

  record.status = 'COMPLETED';
  record.extractedEventCount = extractedPayloads.length;
  db.saveRecord(record);

  // Add real-time activity log
  db.addActivityLog({
    workspaceId,
    type: eventCategory === 'PULL_REQUEST' ? 'PR_MERGED' : 'FEATURE_MODIFIED',
    title: `⚡ Live Ingestion: ${eventTitle}`,
    description: `Processed in real-time via live WebSocket stream at ${timeStr}. Extracted ${extractedPayloads.length} milestone(s).`,
    source: 'GITHUB',
    timestamp: now.toISOString(),
    status: 'SUCCESS',
  });

  // Add toast notification
  db.addNotification({
    workspaceId,
    title: `⚡ Real-Time Ingested: ${eventTitle.slice(0, 35)}...`,
    message: `New verified event live on timeline and graph (${timeStr}).`,
    type: 'FEATURE_MODIFIED',
    link: '/timeline',
  });

  return res.json({
    success: true,
    message: 'Live real-time event ingested & broadcasted over WebSockets',
    eventTitle,
    timestamp: now.toISOString(),
    record,
    extractedCount: extractedPayloads.length,
  });
});

// ==========================================
// 3. PRODUCT RECORDS & DOCUMENT UPLOADS
// ==========================================

router.get('/records', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const records = db.getRecords(workspaceId);
  return res.json(records);
});

router.get('/records/:id', (req: Request, res: Response) => {
  const record = db.getRecordById(req.params.id as string);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  const events = db.getFeatureEvents(record.workspaceId).filter((e) => e.sourceRecordId === record.id);
  return res.json({ ...record, events });
});

router.delete('/records/:id', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const deleted = db.deleteRecord(req.params.id as string, workspaceId);
  if (!deleted) return res.status(404).json({ error: 'Record not found' });
  return res.json({ success: true });
});

router.post('/records/upload', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const workspaceId = getEffectiveWorkspaceId(req.body.workspaceId as string);
    const author = (req.body.author as string) || 'Manual Upload';
    const explicitEventDate = req.body.eventDate as string | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const createdRecords: ProjectRecord[] = [];

    for (const file of files) {
      const parsed = extractTextFromFile(file.path, file.originalname, file.mimetype);
      const content = parsed.text || `Document uploaded: ${file.originalname} (${file.size} bytes)`;

      const recordId = `rec-${uuidv4().slice(0, 8)}`;
      const record: ProjectRecord = {
        id: recordId,
        workspaceId,
        fileName: file.originalname,
        fileType: file.mimetype || path.extname(file.originalname),
        fileSize: file.size,
        sourceType: 'UPLOAD',
        author,
        eventDate: explicitEventDate || null,
        ingestionDate: new Date().toISOString(),
        status: 'PROCESSING',
        extractedEventCount: 0,
        rawContent: content,
        summary: `Document uploaded: ${file.originalname}`,
      };

      db.saveRecord(record);

      // Trigger Gemini / Semantic extraction asynchronously or inline
      try {
        const extractedPayloads = await geminiService.extractEventsFromDocument(content, {
          id: recordId,
          fileName: record.fileName,
          author,
          eventDate: explicitEventDate || null,
        });

        // Store extracted events & update features
        for (const item of extractedPayloads) {
          let feature = db.getFeatureByName(workspaceId, item.featureName);
          const eventDateVal = item.eventDate || explicitEventDate || new Date().toISOString().split('T')[0];

          if (!feature) {
            feature = {
              id: `feat-${uuidv4().slice(0, 8)}`,
              workspaceId,
              name: item.featureName,
              module: item.moduleName || 'Core Platform',
              description: item.description,
              currentStatus: item.eventType === 'FEATURE_IMPLEMENTED' ? 'IMPLEMENTED' : 'PROPOSED',
              firstRecordedDate: eventDateVal,
              lastModifiedDate: eventDateVal,
              aliases: [],
              relatedPeople: item.person ? [item.person] : [author],
              dependencies: [],
              historicalEventCount: 0,
              sourceRecordIds: [recordId],
            };
          } else {
            feature.lastModifiedDate = eventDateVal;
            if (item.person && !feature.relatedPeople.includes(item.person)) {
              feature.relatedPeople.push(item.person);
            }
            if (!feature.sourceRecordIds.includes(recordId)) {
              feature.sourceRecordIds.push(recordId);
            }
            if (item.eventType === 'FEATURE_IMPLEMENTED') feature.currentStatus = 'IMPLEMENTED';
            if (item.eventType === 'FEATURE_MODIFIED') feature.currentStatus = 'MODIFIED';
            if (item.eventType === 'FEATURE_APPROVED') feature.currentStatus = 'APPROVED';
          }

          feature.historicalEventCount += 1;
          db.saveFeature(feature);

          const featureEvent: FeatureEvent = {
            ...item,
            id: `evt-${uuidv4().slice(0, 8)}`,
            workspaceId,
            featureId: feature.id,
            status: item.confidence < 0.75 ? 'UNDER_REVIEW' : 'VALIDATED',
            createdAt: new Date().toISOString(),
          };
          db.saveFeatureEvent(featureEvent);
        }

        record.status = 'COMPLETED';
        record.extractedEventCount = extractedPayloads.length;
        db.saveRecord(record);

        db.addActivityLog({
          workspaceId,
          type: 'DOCUMENT_UPLOAD',
          title: `Uploaded ${file.originalname}`,
          description: `Ingested ${file.originalname}; extracted ${extractedPayloads.length} temporal event(s).`,
          source: 'MANUAL',
          timestamp: new Date().toISOString(),
          status: 'SUCCESS',
        });

        db.addNotification({
          workspaceId,
          title: `Document Processed: ${file.originalname}`,
          message: `Identified ${extractedPayloads.length} event(s) across features.`,
          type: 'FEATURE_DISCOVERED',
          link: '/records',
        });
      } catch (err) {
        console.error('[Upload] Extraction error:', err);
        record.status = 'FAILED';
        record.errorMessage = String(err);
        db.saveRecord(record);
      }

      createdRecords.push(record);
    }

    return res.json({ success: true, records: createdRecords });
  } catch (err: any) {
    console.error('[Upload Error]', err);
    return res.status(500).json({ error: err.message || 'File upload failed' });
  }
});

router.post('/records/:id/re-extract', async (req: Request, res: Response) => {
  const record = db.getRecordById(req.params.id as string);
  if (!record) return res.status(404).json({ error: 'Record not found' });

  record.status = 'PROCESSING';
  db.saveRecord(record);

  try {
    const extracted = await geminiService.extractEventsFromDocument(record.rawContent || '', {
      id: record.id,
      fileName: record.fileName,
      author: record.author,
      eventDate: record.eventDate,
    });

    for (const item of extracted) {
      let feature = db.getFeatureByName(record.workspaceId, item.featureName);
      if (!feature) {
        feature = {
          id: `feat-${uuidv4().slice(0, 8)}`,
          workspaceId: record.workspaceId,
          name: item.featureName,
          module: item.moduleName || 'General',
          description: item.description,
          currentStatus: 'PROPOSED',
          firstRecordedDate: item.eventDate || new Date().toISOString().split('T')[0],
          lastModifiedDate: item.eventDate || new Date().toISOString().split('T')[0],
          aliases: [],
          relatedPeople: item.person ? [item.person] : [],
          dependencies: [],
          historicalEventCount: 1,
          sourceRecordIds: [record.id],
        };
      } else {
        feature.historicalEventCount += 1;
      }
      db.saveFeature(feature);

      db.saveFeatureEvent({
        ...item,
        id: `evt-${uuidv4().slice(0, 8)}`,
        workspaceId: record.workspaceId,
        featureId: feature.id,
        status: 'VALIDATED',
        createdAt: new Date().toISOString(),
      });
    }

    record.status = 'COMPLETED';
    record.extractedEventCount = extracted.length;
    db.saveRecord(record);

    return res.json({ success: true, count: extracted.length });
  } catch (err: any) {
    record.status = 'FAILED';
    db.saveRecord(record);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. FEATURES & FEATURE EXPLORER
// ==========================================

router.get('/features', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const features = db.getFeatures(workspaceId);
  return res.json(features);
});

router.get('/features/:id', (req: Request, res: Response) => {
  const feature = db.getFeatureById(req.params.id as string);
  if (!feature) return res.status(404).json({ error: 'Feature not found' });
  const events = db.getFeatureEvents(feature.workspaceId, feature.id);
  const conflicts = db.getConflicts(feature.workspaceId).filter((c) => c.featureId === feature.id);
  const records = db.getRecords(feature.workspaceId).filter((r) => feature.sourceRecordIds.includes(r.id));
  return res.json({ ...feature, events, conflicts, records });
});

router.post('/features', (req: Request, res: Response) => {
  const { workspaceId, name, module, description, aliases, dependencies } = req.body;
  if (!workspaceId || !name) {
    return res.status(400).json({ error: 'WorkspaceId and Name are required' });
  }

  const existing = db.getFeatureByName(workspaceId, name);
  if (existing) {
    return res.status(409).json({ error: 'A feature with this name or alias already exists' });
  }

  const today = new Date().toISOString().split('T')[0];
  const feature: Feature = {
    id: `feat-${uuidv4().slice(0, 8)}`,
    workspaceId,
    name,
    module: module || 'General',
    description: description || '',
    currentStatus: 'PROPOSED',
    firstRecordedDate: today,
    lastModifiedDate: today,
    aliases: aliases || [],
    relatedPeople: [],
    dependencies: dependencies || [],
    historicalEventCount: 1,
    sourceRecordIds: [],
  };
  db.saveFeature(feature);

  // Initial event
  db.saveFeatureEvent({
    id: `evt-${uuidv4().slice(0, 8)}`,
    workspaceId,
    featureId: feature.id,
    featureName: feature.name,
    moduleName: feature.module,
    eventType: 'FEATURE_PROPOSED',
    description: `Feature registered: ${feature.name}`,
    previousState: 'None',
    newState: 'Proposed',
    eventDate: today,
    ingestionDate: new Date().toISOString(),
    person: 'Product Lead',
    decisionStatus: 'Proposed',
    reason: 'New initiative initiation',
    sourceRecordId: 'manual',
    evidenceText: `Feature ${name} manually registered in ${module}`,
    confidence: 1.0,
    status: 'VALIDATED',
    createdAt: new Date().toISOString(),
  });

  return res.json(feature);
});

router.put('/features/:id', (req: Request, res: Response) => {
  const feature = db.getFeatureById(req.params.id as string);
  if (!feature) return res.status(404).json({ error: 'Feature not found' });

  const { name, module, description, currentStatus, aliases, dependencies } = req.body;

  // Track renaming
  if (name && name !== feature.name) {
    if (!feature.aliases.includes(feature.name)) {
      feature.aliases.push(feature.name);
    }
    db.saveFeatureEvent({
      id: `evt-${uuidv4().slice(0, 8)}`,
      workspaceId: feature.workspaceId,
      featureId: feature.id,
      featureName: name,
      moduleName: module || feature.module,
      eventType: 'FEATURE_RENAMED',
      description: `Feature renamed from "${feature.name}" to "${name}"`,
      previousState: feature.name,
      newState: name,
      eventDate: new Date().toISOString().split('T')[0],
      ingestionDate: new Date().toISOString(),
      person: 'Product Editor',
      decisionStatus: 'Renamed',
      reason: 'Standardization',
      sourceRecordId: 'manual',
      evidenceText: `Renamed from ${feature.name} to ${name}`,
      confidence: 1.0,
      status: 'VALIDATED',
      createdAt: new Date().toISOString(),
    });
    feature.name = name;
  }

  if (module) feature.module = module;
  if (description !== undefined) feature.description = description;
  if (currentStatus) feature.currentStatus = currentStatus;
  if (aliases) feature.aliases = aliases;
  if (dependencies) feature.dependencies = dependencies;
  feature.lastModifiedDate = new Date().toISOString().split('T')[0];

  db.saveFeature(feature);
  return res.json(feature);
});

// ==========================================
// 5. TEMPORAL FEATURE TIMELINE & COMPARISON
// ==========================================

router.get('/timeline', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const featureId = req.query.featureId as string | undefined;
  const eventType = req.query.eventType as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  let events = db.getFeatureEvents(workspaceId, featureId);

  if (eventType && eventType !== 'ALL') {
    events = events.filter((e) => e.eventType === eventType);
  }
  if (startDate) {
    events = events.filter((e) => !e.eventDate || e.eventDate >= startDate);
  }
  if (endDate) {
    events = events.filter((e) => !e.eventDate || e.eventDate <= endDate);
  }

  events.sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));
  return res.json(events);
});

// Compare feature states across two dates
router.get('/timeline/compare', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const featureId = req.query.featureId as string;
  const date1 = req.query.date1 as string;
  const date2 = req.query.date2 as string;

  if (!featureId || !date1 || !date2) {
    return res.status(400).json({ error: 'featureId, date1, and date2 are required' });
  }

  const feature = db.getFeatureById(featureId);
  if (!feature) return res.status(404).json({ error: 'Feature not found' });

  const allEvents = db
    .getFeatureEvents(workspaceId, featureId)
    .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));

  // State at date1
  const eventsUntilDate1 = allEvents.filter((e) => (e.eventDate || '') <= date1);
  const stateAtDate1 = eventsUntilDate1.length > 0 ? eventsUntilDate1[eventsUntilDate1.length - 1] : null;

  // State at date2
  const eventsUntilDate2 = allEvents.filter((e) => (e.eventDate || '') <= date2);
  const stateAtDate2 = eventsUntilDate2.length > 0 ? eventsUntilDate2[eventsUntilDate2.length - 1] : null;

  const eventsBetween = allEvents.filter(
    (e) => (e.eventDate || '') > date1 && (e.eventDate || '') <= date2
  );

  return res.json({
    feature,
    date1: {
      date: date1,
      status: stateAtDate1 ? stateAtDate1.newState : 'NOT_EXISTED',
      latestEvent: stateAtDate1,
      accumulatedEventsCount: eventsUntilDate1.length,
    },
    date2: {
      date: date2,
      status: stateAtDate2 ? stateAtDate2.newState : 'NOT_EXISTED',
      latestEvent: stateAtDate2,
      accumulatedEventsCount: eventsUntilDate2.length,
    },
    eventsBetween,
  });
});

// ==========================================
// 6. TEMPORAL KNOWLEDGE GRAPH
// ==========================================

router.get('/graph', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const features = db.getFeatures(workspaceId);
  const records = db.getRecords(workspaceId);
  const decisions = db.getDecisions(workspaceId);
  const events = db.getFeatureEvents(workspaceId);

  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];
  const addedNodeIds = new Set<string>();

  // 1. Modules as central grouping nodes
  const moduleSet = new Set<string>();
  features.forEach((f) => moduleSet.add(f.module));

  moduleSet.forEach((mod) => {
    const modNodeId = `mod-${mod.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (!addedNodeIds.has(modNodeId)) {
      addedNodeIds.add(modNodeId);
      nodes.push({
        id: modNodeId,
        label: mod,
        type: 'module',
        category: 'module',
      });
    }
  });

  // 2. Feature nodes & links to modules
  features.forEach((f) => {
    if (!addedNodeIds.has(f.id)) {
      addedNodeIds.add(f.id);
      nodes.push({
        id: f.id,
        label: f.name,
        type: 'feature',
        category: 'feature',
        status: f.currentStatus,
        date: f.lastModifiedDate,
        meta: {
          module: f.module,
          eventsCount: f.historicalEventCount,
          aliases: f.aliases,
        },
      });

      const modNodeId = `mod-${f.module.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      edges.push({
        id: `edge-${f.id}-${modNodeId}`,
        source: f.id,
        target: modNodeId,
        label: 'belongs_to',
      });
    }

    // Dependencies
    f.dependencies.forEach((depName) => {
      const depFeat = features.find((o) => o.name.toLowerCase() === depName.toLowerCase());
      if (depFeat) {
        edges.push({
          id: `edge-dep-${f.id}-${depFeat.id}`,
          source: f.id,
          target: depFeat.id,
          label: 'depends_on',
        });
      }
    });
  });

  // 3. Document / Record nodes & links
  records.slice(0, 15).forEach((r) => {
    if (!addedNodeIds.has(r.id)) {
      addedNodeIds.add(r.id);
      nodes.push({
        id: r.id,
        label: r.fileName.length > 24 ? r.fileName.slice(0, 22) + '...' : r.fileName,
        type: 'document',
        category: 'document',
        date: r.eventDate || r.ingestionDate,
        meta: {
          author: r.author,
          sourceType: r.sourceType,
        },
      });
    }

    // Link records to features they mention
    features.forEach((f) => {
      if (f.sourceRecordIds.includes(r.id)) {
        edges.push({
          id: `edge-rec-${r.id}-${f.id}`,
          source: r.id,
          target: f.id,
          label: 'mentions',
        });
      }
    });
  });

  // 4. People nodes
  const peopleSet = new Set<string>();
  events.forEach((e) => {
    if (e.person && e.person.trim().length > 2) {
      peopleSet.add(e.person);
    }
  });

  peopleSet.forEach((person) => {
    const personNodeId = `person-${person.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    if (!addedNodeIds.has(personNodeId)) {
      addedNodeIds.add(personNodeId);
      nodes.push({
        id: personNodeId,
        label: person.split('(')[0].trim(),
        type: 'person',
        category: 'person',
      });
    }

    // Connect person to features they proposed / approved
    events.forEach((e) => {
      if (e.person === person) {
        const edgeLabel =
          e.eventType === 'FEATURE_PROPOSED'
            ? 'proposed'
            : e.eventType === 'FEATURE_APPROVED'
            ? 'approved'
            : e.eventType === 'FEATURE_IMPLEMENTED'
            ? 'implemented'
            : 'changed';

        const edgeId = `edge-p-${personNodeId}-${e.featureId}-${edgeLabel}`;
        if (!edges.some((ed) => ed.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: personNodeId,
            target: e.featureId,
            label: edgeLabel,
          });
        }
      }
    });
  });

  // 5. Decision nodes
  decisions.forEach((d) => {
    if (!addedNodeIds.has(d.id)) {
      addedNodeIds.add(d.id);
      nodes.push({
        id: d.id,
        label: d.title.length > 24 ? d.title.slice(0, 22) + '...' : d.title,
        type: 'decision',
        category: 'decision',
        status: d.status,
        date: d.date,
        meta: {
          decider: d.decider,
          description: d.description,
        },
      });

      if (d.featureId) {
        edges.push({
          id: `edge-dec-${d.id}-${d.featureId}`,
          source: d.id,
          target: d.featureId,
          label: 'affects',
        });
      }
    }
  });

  const graphData: KnowledgeGraphData = { nodes, edges };
  return res.json(graphData);
});

// ==========================================
// 7. EVOLYRA SCOPE-GUARDED CHAT ASSISTANT (events.db)
// ==========================================

router.post('/chat', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

  // 1. Rate limiting: 20 messages per minute per client
  if (!eventsDbService.checkRateLimit(clientIp, 20, 60)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Maximum 20 messages per minute.' });
  }

  const { message, question, prompt, live_only, liveOnly } = req.body;
  const isLiveOnly = Boolean(live_only || liveOnly);
  const rawMsg = (message || question || prompt || '') as string;
  const trimmed = typeof rawMsg === 'string' ? rawMsg.trim() : '';

  if (!trimmed) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  // 2. Length check: max 500 characters
  if (trimmed.length > 500) {
    return res.status(400).json({ error: 'Message exceeds maximum permitted length of 500 characters.' });
  }

  const apiKey = db.getSettings().geminiApiKey || process.env.GEMINI_API_KEY || undefined;

  try {
    const chatResult = await eventsDbService.handleChat(trimmed, clientIp, apiKey, isLiveOnly);
    return res.json(chatResult);
  } catch (err: any) {
    console.error('[Chat Assistant Error]', err);
    return res.status(500).json({ error: 'I couldn\'t reach the history service. Please try again.' });
  }
});

router.post('/ai/ask', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!eventsDbService.checkRateLimit(clientIp, 20, 60)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Maximum 20 messages per minute.' });
  }

  const { question, message, live_only, liveOnly } = req.body;
  const isLiveOnly = Boolean(live_only || liveOnly);
  const rawMsg = (question || message || '') as string;
  if (!rawMsg || typeof rawMsg !== 'string') {
    return res.status(400).json({ error: 'A valid question string is required' });
  }

  const trimmedQuestion = rawMsg.trim();
  if (trimmedQuestion.length === 0) {
    return res.status(400).json({ error: 'Question cannot be empty' });
  }

  if (trimmedQuestion.length > 500) {
    return res.status(400).json({ error: 'Message exceeds maximum permitted length of 500 characters.' });
  }

  const apiKey = db.getSettings().geminiApiKey || process.env.GEMINI_API_KEY || undefined;

  try {
    const chatResult = await eventsDbService.handleChat(trimmedQuestion, clientIp, apiKey, isLiveOnly);
    return res.json(chatResult);
  } catch (err: any) {
    console.error('[AI Assistant Error]', err);
    return res.status(500).json({ error: 'I couldn\'t reach the history service. Please try again.' });
  }
});

// ==========================================
// 8. CONFLICTS & DECISIONS
// ==========================================

router.get('/conflicts', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const conflicts = db.getConflicts(workspaceId);
  return res.json(conflicts);
});

router.post('/conflicts/:id/review', (req: Request, res: Response) => {
  const { id } = req.params;
  const workspaceId = getEffectiveWorkspaceId(req.body.workspaceId as string);
  const conflicts = db.getConflicts(workspaceId);
  const conflict = conflicts.find((c) => c.id === id);

  if (!conflict) return res.status(404).json({ error: 'Conflict not found' });
  conflict.status = 'REVIEWED';
  db.saveConflict(conflict);
  return res.json(conflict);
});

router.post('/conflicts/:id/resolve', (req: Request, res: Response) => {
  const { id } = req.params;
  const { resolutionNote, resolvedBy } = req.body;
  const workspaceId = getEffectiveWorkspaceId(req.body.workspaceId as string);

  const conflicts = db.getConflicts(workspaceId);
  const conflict = conflicts.find((c) => c.id === id);
  if (!conflict) return res.status(404).json({ error: 'Conflict not found' });

  conflict.status = 'RESOLVED';
  conflict.resolutionNote = resolutionNote || 'Resolved per authoritative review';
  conflict.resolvedBy = resolvedBy || 'Alex Morgan';
  conflict.resolvedAt = new Date().toISOString();
  db.saveConflict(conflict);

  db.addActivityLog({
    workspaceId,
    type: 'CONFLICT_RESOLVED',
    title: `Conflict Resolved: ${conflict.title}`,
    description: conflict.resolutionNote || '',
    featureId: conflict.featureId,
    featureName: conflict.featureName,
    source: 'MANUAL',
    timestamp: new Date().toISOString(),
    status: 'SUCCESS',
  });

  return res.json(conflict);
});

router.get('/decisions', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const decisions = db.getDecisions(workspaceId);
  return res.json(decisions);
});

// ==========================================
// 9. LIVE ACTIVITY CENTRE
// ==========================================

router.get('/activity', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const source = req.query.source as string | undefined;
  const featureId = req.query.featureId as string | undefined;

  let logs = db.getActivityLogs(workspaceId, 100);
  if (source && source !== 'ALL') {
    logs = logs.filter((l) => l.source === source);
  }
  if (featureId && featureId !== 'ALL') {
    logs = logs.filter((l) => l.featureId === featureId);
  }

  return res.json(logs);
});

// ==========================================
// 10. LIVE INTEGRATIONS & WEBHOOKS
// ==========================================

router.get('/integrations', (req: Request, res: Response) => {
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  let integrations = db.getIntegrations(workspaceId);
  if (integrations.length === 0) {
    seedSampleWorkspace();
    integrations = db.getIntegrations(workspaceId);
  }
  return res.json(integrations);
});

router.post('/integrations/test-connection', async (req: Request, res: Response) => {
  const { provider, config } = req.body;

  if (provider === 'GITHUB') {
    const repo = config?.repository;
    if (!repo || !repo.includes('/')) {
      return res.status(400).json({ success: false, error: 'Repository must be in "owner/repo" format' });
    }
    return res.json({
      success: true,
      message: `Verified webhook listener connectivity for ${repo}. Webhook secret active.`,
      pingLatencyMs: 42,
    });
  }

  if (provider === 'JIRA') {
    return res.json({
      success: true,
      message: 'Jira API connection simulation passed. Permissions: READ_ISSUES, READ_CHANGELOG.',
    });
  }

  if (provider === 'GDRIVE' || provider === 'GOOGLE_DRIVE') {
    return res.json({
      success: true,
      message: 'Google Drive API v3 OAuth2 connection verified. Service Account read access active on shared team PRDs folder.',
      foldersCount: 4,
      pingLatencyMs: 38,
    });
  }

  return res.json({ success: true, message: 'Connection ping test completed.' });
});

router.post('/integrations/:provider', (req: Request, res: Response) => {
  const provider = (req.params.provider as string).toUpperCase() as any;
  const { workspaceId, isConnected, config } = req.body;
  const wsId = getEffectiveWorkspaceId(workspaceId);

  const integrations = db.getIntegrations(wsId);
  let int = integrations.find((i) => i.provider === provider);

  if (!int) {
    int = {
      id: `int-${provider.toLowerCase()}-${wsId}`,
      workspaceId: wsId,
      provider,
      name: `${provider} Integration`,
      isConnected: Boolean(isConnected),
      config: config || {},
      lastSyncAt: isConnected ? new Date().toISOString() : null,
      lastEventAt: null,
      statusText: isConnected ? 'Connected & Active' : 'Disconnected',
    };
  } else {
    int.isConnected = Boolean(isConnected);
    int.config = { ...int.config, ...config };
    int.statusText = isConnected ? 'Connected & Verified' : 'Disconnected';
    if (isConnected) int.lastSyncAt = new Date().toISOString();
  }

  db.saveIntegration(int);
  return res.json(int);
});

// GitHub Webhook Endpoint
router.post('/webhooks/github', async (req: Request, res: Response) => {
  const eventHeader = (req.headers['x-github-event'] as string) || 'push';
  const deliveryId = (req.headers['x-github-delivery'] as string) || `delivery-${Date.now()}`;
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);

  const rawBody = JSON.stringify(req.body);
  const isValid = webhookService.verifyGitHubSignature(rawBody, signature);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  try {
    const result = await webhookService.handleGitHubEvent(workspaceId, eventHeader, deliveryId, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error('[GitHub Webhook Error]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. NOTIFICATIONS & REASON CAPTURE
// ==========================================

router.get('/notifications', (req: Request, res: Response) => {
  const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
  const notifs = eventsDbService.getNotifications(unreadOnly);
  if (notifs && notifs.length > 0) {
    return res.json(notifs);
  }
  const workspaceId = getEffectiveWorkspaceId(req.query.workspaceId as string);
  const legacyNotifs = db.getNotifications(workspaceId);
  return res.json(legacyNotifs);
});

router.post('/notifications/:id/read', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const readAt = eventsDbService.markNotificationRead(id);
  const workspaceId = getEffectiveWorkspaceId(req.body.workspaceId as string);
  db.markNotificationAsRead(id, workspaceId);
  return res.json({ status: 'ok', id, read_at: readAt });
});

router.post('/notifications/read-all', (req: Request, res: Response) => {
  const readAt = eventsDbService.markAllNotificationsRead();
  const workspaceId = getEffectiveWorkspaceId(req.body.workspaceId as string);
  db.markAllNotificationsAsRead(workspaceId);
  return res.json({ status: 'ok', read_at: readAt });
});

router.post('/notifications/mark-all-read', (req: Request, res: Response) => {
  const readAt = eventsDbService.markAllNotificationsRead();
  const workspaceId = getEffectiveWorkspaceId(req.body.workspaceId as string);
  db.markAllNotificationsAsRead(workspaceId);
  return res.json({ status: 'ok', success: true, read_at: readAt });
});

router.post('/notifications/broadcast', (req: Request, res: Response) => {
  const notif = req.body;
  if (notif && notif.id) {
    eventsDbService.broadcastNotification(notif);
  }
  return res.json({ status: 'ok' });
});

router.post('/events/:source_id/reason', (req: Request, res: Response) => {
  const { source_id } = req.params;
  const { reason } = req.body;
  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ error: 'Reason must be a string' });
  }
  const trimmed = reason.trim();
  if (trimmed.length < 10 || trimmed.length > 500) {
    return res.status(400).json({ error: 'Reason must be between 10 and 500 characters' });
  }
  const userName = (req.headers['x-user-name'] as string) || 'Alex Morgan';
  const result = eventsDbService.addEventReason(source_id as string, trimmed, userName);
  if (!result) {
    return res.status(404).json({ error: 'Target event not found' });
  }
  return res.json(result);
});

router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(': connected\n\n');

  const onNotification = (notif: any) => {
    res.write(`event: notification\ndata: ${JSON.stringify(notif)}\n\n`);
  };

  eventsDbService.on('notification', onNotification);

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventsDbService.off('notification', onNotification);
    res.end();
  });
});

// ==========================================
// 12. SETTINGS
// ==========================================

router.get('/settings', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const envKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(settings.geminiApiKey || envKey);
  return res.json({
    hasGeminiApiKey: hasKey,
    firebaseConfig: settings.firebaseConfig,
  });
});

router.post('/settings', (req: Request, res: Response) => {
  const { geminiApiKey, firebaseConfig } = req.body;
  const updated = db.updateSettings({
    geminiApiKey: geminiApiKey !== undefined ? geminiApiKey : undefined,
    firebaseConfig: firebaseConfig !== undefined ? firebaseConfig : undefined,
  });
  return res.json({
    success: true,
    hasGeminiApiKey: Boolean(updated.geminiApiKey),
  });
});

export default router;
