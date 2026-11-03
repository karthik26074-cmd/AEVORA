# AEVORA — AI-Enabled Evolution & Versioned Organizational Record Architecture

> *"Every change recorded. Every decision remembered. Every answer supported by evidence."*

AEVORA is an enterprise AI-powered temporal product knowledge platform that consolidates authorized project records across documentation, code repositories, issue trackers, and team decisions, transforming them into a historically organized, evidence-backed knowledge system.

---

## 🌟 Key Capabilities

- **Grounded AI Extraction (Google Gemini):** Understands PRDs, RFCs, meeting notes, tickets, commits, and pull requests to identify features, requirements, and decisions with verbatim evidence quotations.
- **Append-Only Feature Timeline:** Full chronological lifecycles tracking proposals, architecture approvals, pull request merges, security audit directives, and modifications across 10 distinct lifecycle states.
- **Temporal State Comparison:** Compare feature states between two arbitrary dates to view exact deltas and intermediate decisions.
- **Interactive Knowledge Graph:** Interactive visual topology of Features, Modules, People, Decisions, Records, and Pull Requests with zoom, pan, category filtering, and inspector drawer.
- **AEVORA Intelligence & Voice Assistant:** Historical conversational AI providing evidence-grounded answers with clickable source citations, uncertainty marking, speech-to-text input, and natural language page navigation.
- **Decisions & Conflict Detection:** Identifies contradictory specifications (e.g., timeout windows, approval discrepancies) and provides an audit trail for architectural resolution.
- **Live Real-Time Event Stream:** Powered by WebSockets, delivering instant multi-tab updates upon webhook delivery or document ingestion.
- **GitHub Webhook Integration:** Secure HMAC-SHA256 receiver with delivery ID deduplication.
- **Built-in System Diagnostics:** Real-time health monitoring of database persistence, Gemini API connectivity, auth, storage, and processing queues.
- **Demo Workspace & Production Isolation:** Explicitly labeled sample workspace (`isSample: true`) for guided evaluation; all new user workspaces start completely fresh with zero fabricated data.

---

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Run Application
```bash
npm start
```
- **Web App (Vite):** `http://localhost:5173`
- **Backend API & WebSockets:** `http://localhost:3001`

### 3. Build for Production
```bash
npm run build
```

---

## 📚 Technical Documentation

For detailed architecture diagrams, database schemas, API specs, and configuration guides, refer to [docs/TECHNICAL_DOCUMENTATION.md](./docs/TECHNICAL_DOCUMENTATION.md).
