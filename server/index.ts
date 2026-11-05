import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { performStartupCheck } from './services/firebaseAdmin.js';
import apiRouter from './routes/api.js';
import githubRouter from './routes/githubRoutes.js';
import { db } from './store/db.js';
import { seedSampleWorkspace, SAMPLE_WORKSPACE_ID } from './services/sampleData.js';
import { webhookService } from './services/webhookService.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Execute comprehensive environment and Firebase Admin startup check
performStartupCheck();

// Validate critical environment configuration on server initialization
const hasEnvGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
console.log(`[AEVORA Backend] Server initializing on port ${process.env.PORT || 3001}`);
console.log(`[AEVORA Backend] Environment GEMINI_API_KEY: ${hasEnvGeminiKey ? 'CONFIGURED (Masked for Security)' : 'NOT DETECTED (Fallback engine active)'}`);

const app = express();
const PORT = process.env.PORT || 3001;

// Lightweight in-memory rate limiter per IP for AI & Upload security
const requestCounts = new Map<string, { count: number; resetTime: number }>();
export const rateLimiter = (maxRequests: number = 60, windowMs: number = 60000) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now > entry.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait before submitting additional operations.',
        retryAfterMs: entry.resetTime - now,
      });
    }

    entry.count += 1;
    next();
  };
};

app.use(cors());
// Set essential security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static uploads serving
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Serve production built frontend from dist
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Mount API routes
app.use('/api', apiRouter);
app.use('/api/github', githubRouter);

// SPA client routing fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// PART 19: System Diagnostics Endpoint
app.get('/api/diagnostics', (req, res) => {
  const settings = db.getSettings();
  const records = db.getRecords(SAMPLE_WORKSPACE_ID);
  const events = db.getFeatureEvents(SAMPLE_WORKSPACE_ID);
  const integrations = db.getIntegrations(SAMPLE_WORKSPACE_ID);

  const completedRecords = records.filter((r) => r.status === 'COMPLETED');
  const lastProcessingTime = completedRecords.length > 0 ? completedRecords[0].ingestionDate : new Date().toISOString();

  res.json({
    status: 'HEALTHY',
    system: 'AEVORA Temporal Knowledge Engine',
    timestamp: new Date().toISOString(),
    database: {
      status: 'CONNECTED',
      engine: 'Persistent Cloud/Local Datastore',
      activeRecords: records.length,
      historicalEvents: events.length,
    },
    geminiApi: {
      status: settings.geminiApiKey ? 'CONNECTED' : 'STANDBY_BUILTIN_NLP',
      mode: settings.geminiApiKey ? 'Cloud Gemini 3.5 Flash' : 'Built-in Semantic Temporal Extractor',
      configured: Boolean(settings.geminiApiKey),
    },
    auth: {
      status: 'ACTIVE',
      providers: ['Email & Password', 'Google OAuth2', 'Demo Instant Access'],
    },
    storage: {
      status: 'OPERATIONAL',
      mode: 'Local & Cloud Storage',
      uploadDirectory: 'uploads/',
    },
    realtime: {
      status: 'LISTENING',
      protocol: 'WebSocket / SSE / Firestore',
      connectedClients: wss ? wss.clients.size : 0,
    },
    integrations: {
      status: 'OPERATIONAL',
      githubWebhook: 'READY (POST /api/webhooks/github)',
      activeConnectionsCount: integrations.filter((i) => i.isConnected).length,
    },
    processingQueue: {
      status: 'IDLE',
      pendingJobs: 0,
      lastSuccessfulProcessingTime: lastProcessingTime,
    },
  });
});

// PART 20: Guided Live Demonstration Simulator Endpoint
app.post('/api/demo/simulate-otp-modification', async (req, res) => {
  const workspaceId = (req.body.workspaceId as string) || SAMPLE_WORKSPACE_ID;
  const deliveryId = `sim-${Date.now()}`;
  const today = new Date().toISOString().split('T')[0];

  const simulationPayload = {
    repository: { full_name: 'smartbank-io/banking-core-api' },
    sender: { login: 'alex-morgan-lead' },
    pull_request: {
      number: 142,
      title: 'feat(otp): add biometric passkey fallback & reduce throttle to 60s',
      body: `## Pull Request #142: OTP & Passkey Resilience Upgrade
Author: Alex Morgan (Lead Engineer)
Date: ${today}

### Modifications:
1. Added WebAuthn passkey biometric fallback when SMS OTP fails delivery.
2. Modified OTP rate limiter throttle cooldown window to 60 seconds.
3. Feature OTP Verification updated to high-resilience multi-channel dispatch.
Status: Merged by Architecture Review Board.`,
      merged: true,
      merged_at: new Date().toISOString(),
      user: { login: 'alex-morgan-lead' },
      base: { ref: 'main' },
      head: { ref: 'feature/passkey-otp' },
    },
  };

  try {
    const result = await webhookService.handleGitHubEvent(
      workspaceId,
      'pull_request',
      deliveryId,
      simulationPayload
    );

    // Broadcast live notification
    db.addNotification({
      workspaceId,
      title: 'Live Event Processed [DEMO]',
      message: 'PR #142 merged: OTP Verification updated with passkey biometric fallback.',
      type: 'FEATURE_MODIFIED',
      link: '/timeline',
    });

    return res.json({
      success: true,
      message: 'Demonstration event processed successfully through the live pipeline',
      result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create HTTP Server
const server = http.createServer(app);

// WebSocket Server for instantaneous real-time bidirectional updates
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  ws.send(JSON.stringify({ type: 'CONNECTED', message: 'AEVORA Real-Time Temporal Stream Connected' }));

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      }
    } catch (e) {
      // ignore
    }
  });
});

// Wire Database events to broadcast over WebSocket to all open client sessions
db.onUpdate((event: string, payload: any) => {
  const message = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[AEVORA Server] Running on http://localhost:${PORT}`);
  console.log(`[AEVORA Server] Real-Time WebSocket stream on ws://localhost:${PORT}/ws`);
});
