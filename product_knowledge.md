# EVOLYRA Product Knowledge Base

## 1. What EVOLYRA Is
EVOLYRA (AI-Enabled Evolution & Versioned Organizational Record Architecture) is an AI-powered temporal product intelligence platform. It acts as an institutional memory system that tracks how software features evolve over time, when requirements change, who made decisions, and which original records support every claim.

## 2. The Problem It Solves
Modern software development knowledge is fragmented across pull requests, issue trackers, architecture documents, and chat threads. When team members leave or projects scale, organizations suffer from institutional amnesia: nobody knows why a decision was made, who approved it, or when a feature changed. EVOLYRA unifies these disparate records into a single, historically versioned, verifiable knowledge base.

## 3. How EVOLYRA Works
EVOLYRA ingests development events and documentation through a multi-step pipeline:
1. Ingestion: Receives webhook payloads from GitHub (issues, pull requests, comments) and text/document notes.
2. Extraction: Analyzes events to extract entity names, lifecycle state transitions, actors, timestamps, and quotes.
3. Quote Verification: Verifies that quoted text reflects verbatim excerpts from the source document or webhook payload.
4. Entity Resolution for Renames: Tracks feature identity across name changes using old_name and new_name linkages so historical queries resolve regardless of whether the old or new name is used.
5. Append-Only Store: Persists records in SQLite (events.db) with two timestamps: event_date (when the event occurred) and ingested_at (when EVOLYRA recorded it). Records use unique source_ids and are never updated or deleted.
6. Conflict and Gap Detection: Identifies contradictions between specifications and merged code, flagging discrepancies for review.
7. Timeline Generation: Organizes discrete lifecycle milestones chronologically.
8. Cited Q&A: Answers user questions strictly using retrieved database records with verified citations (source_id, event_date, quote, evidence_url).

## 4. Lifecycle Statuses
EVOLYRA models features through explicit lifecycle states:
- proposed: A feature requirement, issue, or specification submitted for review.
- approved: A feature proposal or architectural decision ratified by reviewers or technical leads.
- implemented: Code merged into the codebase via pull requests or verified commits.
- rejected: A proposed feature or change declined or abandoned.
- removed: A capability deleted or deprecated out of the product.
- renamed: An entity title updated with old_name and new_name preserved for audit continuity.
- modified: A requirement or implementation adjusted after initial implementation or approval.

## 5. How It Differs From Git History and Search
- Git History: Git tracks line-by-line file diffs and commit hashes. It does not understand product concepts, feature lifecycles, or decisions made outside code repositories.
- Code Search: Keyword search finds literal string matches across documents, but cannot sequence cause-and-effect, resolve feature renames, or detect specification gaps.
- EVOLYRA: Constructs a temporal knowledge graph linking specifications, tickets, commits, and decisions with verifiable citations and state progression.

## 6. How Accuracy Is Protected
EVOLYRA provides accurate records and protects accuracy through:
- Verbatim Source Quotes: Every claim references exact text extracted from source documents or webhooks.
- Verifiable Citations: Every answer provides source_id, event_date, quote, and evidence_url matching events.db rows.
- No Hallucination Fallback: If no matching events exist in the database, the system returns "I couldn't find any record about that in the connected project history" rather than speculating.
- Conservative Merging: Entities are never merged solely on superficial name similarity. A single identity across renames requires explicit old_name/new_name evidence.

## 7. Current Limitations
- Supported Ingestion Sources: Currently supports live GitHub issues, pull requests, issue comments, and local project documents.
- Planned Connectors: Direct connectors for Jira Cloud, Google Drive folders, and automated private-repo polling are planned, but not yet implemented.
- Extraction Context: LLM extraction can occasionally miss subtle domain context in unstructured documents; all extracted records carry source quotes for human review.
- Confidence Flag: The confidence attribute is an internal heuristic review flag, not a calibrated statistical probability.

## 8. Tech Stack
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, Recharts, DOMPurify, and marked.
- Backend APIs: Python FastAPI (webhook ingestion, SQLite storage, chat assistant) and Node.js Express (REST API, node:sqlite).
- Datastore: SQLite (events.db) with append-only events table and unique source_id constraints.
- AI Model: Google Gemini 3.5 Flash running at Temperature 0 with strict JSON output schemas.
- Security: HMAC-SHA256 GitHub webhook signature verification, sliding-window rate limiting (20 req/min), and 500-character input limits.

## 9. Frequently Asked Questions (FAQs)
1. Does EVOLYRA support Jira integration today?
No. Direct Jira connectors are planned. Currently, EVOLYRA supports GitHub issues, pull requests, and comments.

2. Does EVOLYRA predict future product delivery dates?
No. EVOLYRA is an archival record system. Records show what happened in the past, not what will happen in the future.

3. How does EVOLYRA handle feature renames?
When an event records a rename, EVOLYRA links old_name and new_name in events.db. Queries matching either name return the complete history.

4. How is data persisted?
Data is persisted in an append-only SQLite database (events.db) with unique source_id values that prevent duplicate entries.

5. What happens when records conflict?
EVOLYRA highlights the discrepancy with citations for each conflicting record rather than silently picking one.

6. What AI model powers the EVOLYRA assistant?
EVOLYRA uses Google Gemini 3.5 Flash with Temperature 0, restricted strictly to retrieved context.

7. Can EVOLYRA assist with general programming, math, or weather?
No. The assistant is strictly scope-guarded to EVOLYRA and its recorded project history. All other queries receive a polite refusal.

8. How does EVOLYRA protect against prompt injection?
User messages and event texts are treated strictly as data, prompt-injection patterns are intercepted without calling the LLM, and the system prompt forbids altering its role or rules.
