# AEVORA — Technical Architecture & Product Documentation

> **Tagline:** Every change recorded. Every decision remembered. Every answer supported by evidence.  
> **Definition:** AI-Enabled Evolution & Versioned Organizational Record Architecture  
> **Brand Identity:** Enterprise SaaS, deep navy `#181A2B`, refined primary violet `#7668F5`, success teal `#1C9B78`, clean typography (Inter / JetBrains Mono).

---

## 1. Executive Product Overview

**AEVORA** is an enterprise-grade AI-powered Temporal Product Knowledge Platform designed to solve a fundamental problem in software engineering: **the loss of architectural context, product feature history, and decision rationale over time**.

As software evolves across months and years:
- Requirements shift across PRDs, tickets, and slack threads.
- Specifications are superseded by security audits or regulatory directives.
- Engineers and product managers change roles, leaving institutional amnesia.
- Static wikis and documentation drift out of date relative to actual code and releases.

AEVORA continuously ingests documents (PRDs, meeting notes, tickets, architecture reviews) and streams live VCS events (GitHub pushes, pull requests, and merges). Powered by server-side **Google Gemini AI** and deterministic temporal NLP extractors, AEVORA identifies features, constructs an immutable, append-only historical lifecycle, resolves contradictions, visualizes interconnected knowledge topologies, and answers historical questions using verbatim evidence citations.

---

## 2. System Architecture

AEVORA is constructed as a modern decoupled full-stack architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AEVORA CLIENT APPLICATION                         │
│   React 18 + TypeScript + Tailwind CSS + Lucide React + Recharts + WebSockets│
└───────────────▲─────────────────────────────────────────────▲───────────────┘
                │ HTTP REST API (/api/*)                      │ Live Events (/ws)
┌───────────────▼─────────────────────────────────────────────▼───────────────┐
│                           NODE.JS EXPRESS SERVER                            │
│  - Multer Ingestion Pipeline       - GitHub Webhook HMAC-SHA256 Receiver    │
│  - Temporal Schema Validator       - WebSocket Real-Time Broadcast Server   │
│  - System Health & Diagnostics     - Simulation & Guided Demo Runner        │
└───────────────▲─────────────────────────────────────────────▲───────────────┘
                │                                             │
┌───────────────▼──────────────┐             ┌────────────────▼───────────────┐
│     GOOGLE GEMINI AI API     │             │       DATA PERSISTENCE         │
│  - Gemini 3.5 Flash LLM      │             │  - Cloud Firestore Multi-Region│
│  - Temporal Event Extraction │             │  - Atomic Local Datastore      │
│  - Grounded Evidence QA      │             │  - File Storage (uploads/)     │
└──────────────────────────────┘             └────────────────────────────────┘
```

### Core Architecture Principles:
1. **Append-Only Event Trail:** Features retain stable permanent UUIDs. Historical events are never overwritten when a feature changes.
2. **Separation of Event Date vs. Ingestion Date:** The historical date when an event took place (`eventDate`) is strictly separated from the system ingestion timestamp (`ingestionDate`).
3. **Evidence Citations:** Every extracted event, decision, and AI answer stores direct verbatim quotations (`evidenceText`) linked back to the exact source document ID (`sourceRecordId`).
4. **Idempotent Webhooks:** Duplicate deliveries are eliminated using provider delivery IDs (`X-GitHub-Delivery`).
5. **Bidirectional Real-Time Synchronization:** Database updates immediately trigger WebSocket broadcasts to all open client sessions, ensuring instant multi-tab synchronization with zero page reload.

---

## 3. Database Schema & Data Models

### Collections:

#### 1. `workspaces`
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique workspace identifier (e.g. `ws-banking`) |
| `name` | `string` | Human-readable workspace name |
| `productName` | `string` | Subject product (e.g. `Smart Banking Platform`) |
| `productDescription` | `string` | Architectural overview and scope |
| `teamDetails` | `string` | Team members and responsibilities |
| `ownerId` | `string` | Creator user ID |
| `isSample` | `boolean` | Flag indicating demonstration data |

#### 2. `projectRecords`
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable record ID (e.g. `rec-prd-auth-v1`) |
| `workspaceId` | `string` | Owning workspace |
| `fileName` | `string` | Original file name (e.g. `PRD-2024-Auth.md`) |
| `fileType` | `string` | MIME type (markdown, txt, pdf, json, etc.) |
| `fileSize` | `number` | Size in bytes |
| `sourceType` | `'UPLOAD' \| 'GITHUB' \| 'JIRA' \| 'GOOGLE_DRIVE'` | Origin source platform |
| `author` | `string` | Document author or commit pusher |
| `eventDate` | `string \| null` | Date when document event occurred |
| `ingestionDate` | `string` | ISO timestamp when ingested |
| `status` | `'RECEIVED' \| 'PROCESSING' \| 'COMPLETED' \| 'FAILED'` | Pipeline extraction status |
| `extractedEventCount` | `number` | Total temporal events identified |
| `rawContent` | `string` | Full verbatim text content |

#### 3. `features`
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Permanent unique identity (e.g. `feat-otp`) |
| `workspaceId` | `string` | Owning workspace |
| `name` | `string` | Active feature name |
| `module` | `string` | Grouping module (e.g. `Authentication & Security`) |
| `description` | `string` | Scope and capability summary |
| `currentStatus` | `'PROPOSED' \| 'APPROVED' \| 'IMPLEMENTED' \| 'MODIFIED' \| 'DEPRECATED'` | Latest verified status |
| `firstRecordedDate` | `string` | Earliest recorded date in history |
| `lastModifiedDate` | `string` | Most recent modification date |
| `aliases` | `string[]` | Historical previous names / aliases |
| `relatedPeople` | `string[]` | Documented engineers and stakeholders |
| `dependencies` | `string[]` | Dependent feature names |
| `historicalEventCount`| `number` | Count of lifecycle milestones |

#### 4. `featureEvents` (Temporal Lifecycles)
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Milestone event identifier |
| `workspaceId` | `string` | Owning workspace |
| `featureId` | `string` | Target feature UUID |
| `featureName` | `string` | Subject feature name |
| `moduleName` | `string` | Module classification |
| `eventType` | `EventType` | e.g. `FEATURE_PROPOSED`, `FEATURE_APPROVED`, `FEATURE_IMPLEMENTED`, `FEATURE_MODIFIED` |
| `description` | `string` | Milestone explanation |
| `previousState` | `string` | State before this event |
| `newState` | `string` | State resulting from this event |
| `eventDate` | `string \| null` | Date event occurred |
| `ingestionDate` | `string` | System ingestion timestamp |
| `person` | `string \| null` | Person responsible or signatory |
| `decisionStatus` | `string` | Review or sign-off status |
| `sourceRecordId` | `string` | Origin document ID |
| `evidenceText` | `string` | Verbatim quotation supporting extraction |
| `confidence` | `number` | Confidence factor (0.0 to 1.0) |

#### 5. `conflicts`
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Conflict identifier |
| `workspaceId` | `string` | Owning workspace |
| `featureId` | `string` | Associated feature ID |
| `title` | `string` | Conflict summary (e.g. `OTP Window: 300s vs 120s`) |
| `conflictingStatements`| `Array<{ statement, sourceName, date, evidenceText }>` | Direct contradictory claims |
| `reason` | `string` | Root cause analysis |
| `status` | `'OPEN' \| 'REVIEWED' \| 'RESOLVED'` | Lifecycle status |
| `resolutionNote` | `string` | Official architectural reconciliation note |

---

## 4. Gemini AI Information Extraction Pipeline

When documents are uploaded or GitHub webhooks arrive:
1. Document text is extracted and normalized.
2. Structured prompt is dispatched to Google Gemini 3.5 Flash with strict anti-hallucination rules:
   - Never invent dates or people.
   - Do not treat proposals as approvals.
   - Do not treat approvals as implementations.
   - Preserve verbatim evidence text.
   - Maintain eventDate separate from ingestionDate.
3. Extracted JSON is validated against the `ExtractedEventPayload` schema.
4. If the feature exists, its alias table, modification date, and event count update. If new, a permanent identity is created.
5. All connected views update via WebSocket broadcast.

---

## 5. API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Email/password sign-in |
| `POST` | `/api/auth/register` | Register user account |
| `POST` | `/api/auth/demo` | Instant demo login as Alex Morgan |
| `GET` | `/api/workspaces` | List authorized workspaces |
| `POST` | `/api/workspaces` | Create product workspace |
| `POST` | `/api/workspaces/seed-sample` | Re-seed sample data |
| `GET` | `/api/records` | List ingested documents |
| `POST` | `/api/records/upload` | Upload & extract documents (multipart) |
| `POST` | `/api/records/:id/re-extract` | Trigger Gemini re-extraction |
| `DELETE`| `/api/records/:id` | Delete record and remove connected events |
| `GET` | `/api/features` | List features with aliases and modules |
| `POST` | `/api/features` | Register feature entity |
| `PUT` | `/api/features/:id` | Update feature or record rename |
| `GET` | `/api/timeline` | Filter temporal events |
| `GET` | `/api/timeline/compare` | Compare feature state at Date A vs Date B |
| `GET` | `/api/graph` | Generate nodes and edges topology |
| `POST` | `/api/ai/ask` | Grounded temporal QA with citations |
| `GET` | `/api/conflicts` | List contradictory statements |
| `POST` | `/api/conflicts/:id/resolve`| Resolve conflict with resolution note |
| `GET` | `/api/activity` | Live chronological audit stream |
| `POST` | `/api/webhooks/github` | Ingest GitHub PR and push events |
| `GET` | `/api/diagnostics` | System health and subsystem status |
| `POST` | `/api/demo/simulate-otp-modification` | Trigger guided live demonstration |

---

## 6. GitHub Webhook Setup Guide

1. Navigate to **Integrations** in AEVORA.
2. In your GitHub Repository:
   - Go to **Settings > Webhooks > Add webhook**.
   - **Payload URL:** `http://<your-host>:3001/api/webhooks/github?workspaceId=<your-workspace-id>`
   - **Content type:** `application/json`
   - **Secret:** `aevora_webhook_secret_dev` (or configured secret)
   - **Events:** Select *Pushes* and *Pull requests*.
3. Test connectivity by clicking **Test Webhook Ping** in AEVORA.

---

## 7. Deployment Instructions

### Local Development:
```bash
# 1. Install dependencies
npm install

# 2. Run both backend server and frontend concurrently
npm start

# Or in separate terminals:
npm run server  # Runs Express on port 3001
npm run dev     # Runs Vite on port 5173
```

### Production Build:
```bash
npm run build
```
Built output is placed in `dist/`.
