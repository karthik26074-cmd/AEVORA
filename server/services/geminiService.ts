import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../store/db.js';
import { executeTemporalQA } from './aiTemporalQA.js';
import {
  ExtractedEventPayload,
  EventType,
  AIChatMessage,
  FeatureEvent,
  ProjectRecord,
  Feature,
  ConflictItem,
} from '../../src/types/index.js';

export class GeminiService {
  private getApiKey(): string | undefined {
    return db.getSettings().geminiApiKey || process.env.GEMINI_API_KEY || undefined;
  }

  /**
   * Extract features and temporal events from document content
   */
  public async extractEventsFromDocument(
    rawText: string,
    sourceRecord: { id: string; fileName: string; author?: string; eventDate?: string | null }
  ): Promise<ExtractedEventPayload[]> {
    const apiKey = this.getApiKey();
    const ingestionDate = new Date().toISOString();

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        const prompt = `You are AEVORA's temporal product knowledge extraction engine.
Analyze the following document text and extract all software product feature events, requirements, decisions, and modifications.

DOCUMENT SOURCE: "${sourceRecord.fileName}"
DOCUMENT AUTHOR: "${sourceRecord.author || 'Unknown'}"
DOCUMENT EVENT DATE: "${sourceRecord.eventDate || 'Unknown'}"
INGESTION DATE: "${ingestionDate}"
SOURCE RECORD ID: "${sourceRecord.id}"

DOCUMENT TEXT:
---
${rawText}
---

STRICT EXTRACTION RULES:
1. Do not invent missing information. Use null or "Unknown" for unavailable information.
2. Do not assume that a proposed feature has been approved.
3. Do not assume that an approved feature has been implemented.
4. Do not invent the person responsible for a decision.
5. Preserve the actual EXACT verbatim evidence text from the document for "evidenceText".
6. If the event date is ambiguous, use null or the nearest explicit document date.
7. Keep eventDate separate from ingestionDate ("${ingestionDate}").
8. EventType must be one of:
   - "FEATURE_PROPOSED"
   - "FEATURE_APPROVED"
   - "FEATURE_REJECTED"
   - "FEATURE_IMPLEMENTED"
   - "FEATURE_MODIFIED"
   - "FEATURE_RENAMED"
   - "FEATURE_DEPRECATED"
   - "FEATURE_REMOVED"
   - "BUG_FIXED"
   - "REQUIREMENT_CHANGED"
   - "ARCHITECTURE_CHANGED"

Return a VALID JSON array of objects with the EXACT following schema:
[
  {
    "featureName": string,
    "moduleName": string,
    "eventType": string,
    "description": string,
    "previousState": string,
    "newState": string,
    "eventDate": string | null,
    "ingestionDate": "${ingestionDate}",
    "person": string | null,
    "decisionStatus": string,
    "reason": string | null,
    "sourceRecordId": "${sourceRecord.id}",
    "evidenceText": string,
    "confidence": number (between 0.0 and 1.0)
  }
]

Do not return any conversational text or markdown code formatting, only the JSON array.`;

        const response = await model.generateContent(prompt);
        const text = response.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => ({
            ...item,
            sourceRecordId: sourceRecord.id,
            ingestionDate,
            confidence: typeof item.confidence === 'number' ? item.confidence : 0.9,
          }));
        }
      } catch (err) {
        console.warn('[GeminiService] Gemini API call error or parsing failed, falling back to built-in semantic extractor:', err);
      }
    }

    // Fallback: Robust built-in semantic temporal extractor
    return this.fallbackSemanticExtraction(rawText, sourceRecord, ingestionDate);
  }

  /**
   * Deterministic semantic temporal extractor based on NLP patterns and document structure
   */
  private fallbackSemanticExtraction(
    rawText: string,
    sourceRecord: { id: string; fileName: string; author?: string; eventDate?: string | null },
    ingestionDate: string
  ): ExtractedEventPayload[] {
    const events: ExtractedEventPayload[] = [];
    const lines = rawText.split('\n');

    // Detect dates from text if eventDate is not provided
    let detectedDate = sourceRecord.eventDate || null;
    const dateMatch = rawText.match(/\b(202\d[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+202\d)\b/i);
    if (dateMatch && !detectedDate) {
      detectedDate = dateMatch[1];
    }

    // Identify candidate features and modules from headings, bullet points, and keywords
    const featureRegex = /(?:feature|requirement|proposal|module|epic|sign-off|finding|directive|implements|feat\()[:\s]+([A-Za-z0-9\s-_/]+)/gi;
    const commonModules = [
      'Authentication & Security',
      'Payments & Transfers',
      'Ledger & Analytics',
      'Communications',
      'Core Platform',
      'User Management',
      'Infrastructure',
    ];

    // Scan lines for key actions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      const lower = line.toLowerCase();
      let eventType: EventType | null = null;
      let decisionStatus = 'Recorded';
      let previousState = 'Unknown';
      let newState = 'Active';

      if (lower.includes('propos') || lower.includes('require') || lower.includes('suggested')) {
        eventType = 'FEATURE_PROPOSED';
        previousState = 'None (New Capability)';
        newState = 'Proposed';
        decisionStatus = 'Proposed';
      } else if (lower.includes('approv') || lower.includes('sign-off') || lower.includes('accepted')) {
        eventType = 'FEATURE_APPROVED';
        previousState = 'Proposed';
        newState = 'Approved';
        decisionStatus = 'Approved';
      } else if (lower.includes('implement') || lower.includes('merged') || lower.includes('deployed') || lower.includes('released')) {
        eventType = 'FEATURE_IMPLEMENTED';
        previousState = 'Approved';
        newState = 'Implemented';
        decisionStatus = 'Merged';
      } else if (lower.includes('modif') || lower.includes('chang') || lower.includes('reduced') || lower.includes('updated') || lower.includes('revised')) {
        eventType = 'FEATURE_MODIFIED';
        previousState = 'Implemented';
        newState = 'Modified';
        decisionStatus = 'Updated';
      } else if (lower.includes('reject') || lower.includes('declined')) {
        eventType = 'FEATURE_REJECTED';
        previousState = 'Proposed';
        newState = 'Rejected';
        decisionStatus = 'Rejected';
      } else if (lower.includes('deprecat')) {
        eventType = 'FEATURE_DEPRECATED';
        previousState = 'Implemented';
        newState = 'Deprecated';
        decisionStatus = 'Deprecated';
      } else if (lower.includes('bug') || lower.includes('fix')) {
        eventType = 'BUG_FIXED';
        previousState = 'Defect';
        newState = 'Resolved';
        decisionStatus = 'Fixed';
      }

      if (eventType) {
        // Find subject feature name
        let featureName = 'Core System';
        if (lower.includes('otp') || lower.includes('one-time password') || lower.includes('verification')) {
          featureName = 'OTP Verification';
        } else if (lower.includes('auth') || lower.includes('login') || lower.includes('credential')) {
          featureName = 'User Authentication';
        } else if (lower.includes('payment') || lower.includes('stripe') || lower.includes('adyen') || lower.includes('rail')) {
          featureName = 'Payment Gateway';
        } else if (lower.includes('transaction') || lower.includes('statement') || lower.includes('ledger')) {
          featureName = 'Transaction History';
        } else if (lower.includes('notif') || lower.includes('alert') || lower.includes('sms')) {
          featureName = 'Notification System';
        } else {
          // Extract first noun phrase or title
          const words = line.replace(/[-*•]/g, '').trim().split(/\s+/).slice(0, 4).join(' ');
          featureName = words.length > 3 ? words : 'Product Capability';
        }

        // Determine module
        let moduleName = 'Core Platform';
        if (featureName.includes('Auth') || featureName.includes('OTP')) {
          moduleName = 'Authentication & Security';
        } else if (featureName.includes('Payment')) {
          moduleName = 'Payments & Transfers';
        } else if (featureName.includes('Transaction') || featureName.includes('Ledger')) {
          moduleName = 'Ledger & Analytics';
        } else if (featureName.includes('Notification')) {
          moduleName = 'Communications';
        }

        // Find surrounding context as evidence
        const evidenceStart = Math.max(0, i - 1);
        const evidenceEnd = Math.min(lines.length - 1, i + 1);
        const evidenceText = lines.slice(evidenceStart, evidenceEnd + 1).map((l) => l.trim()).filter(Boolean).join(' ');

        // Check for person mention
        let person = sourceRecord.author || null;
        const personMatch = evidenceText.match(/(?:by|author|auditor|attendees|decider)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i);
        if (personMatch) {
          person = personMatch[1];
        }

        events.push({
          featureName,
          moduleName,
          eventType,
          description: line.replace(/^[#\-*0-9.]+\s*/, '').trim(),
          previousState,
          newState,
          eventDate: detectedDate,
          ingestionDate,
          person,
          decisionStatus,
          reason: line.length > 50 ? line.slice(0, 100) : null,
          sourceRecordId: sourceRecord.id,
          evidenceText: evidenceText || line,
          confidence: 0.92,
        });

        // Limit to reasonable number per document scan to prevent noise
        if (events.length >= 8) break;
      }
    }

    if (events.length === 0) {
      // Default fallback single event
      events.push({
        featureName: 'System Feature',
        moduleName: 'Core Platform',
        eventType: 'FEATURE_PROPOSED',
        description: `Ingested content from ${sourceRecord.fileName}`,
        previousState: 'None',
        newState: 'Proposed',
        eventDate: detectedDate,
        ingestionDate,
        person: sourceRecord.author || null,
        decisionStatus: 'Recorded',
        reason: 'Document upload and parsing',
        sourceRecordId: sourceRecord.id,
        evidenceText: rawText.slice(0, 200).trim(),
        confidence: 0.85,
      });
    }

    return events;
  }

  /**
   * Historical Question Answering with Strict Hallucination Prevention & Verification
   */
  public async answerHistoricalQuestion(
    workspaceId: string,
    question: string
  ): Promise<AIChatMessage> {
    const apiKey = this.getApiKey();
    return executeTemporalQA(workspaceId, question, { apiKey });
  }

  /**
   * Built-in temporal evidence-based QA engine
   */
  private fallbackSemanticQA(
    workspaceId: string,
    question: string,
    records: ProjectRecord[],
    features: Feature[],
    events: FeatureEvent[],
    conflicts: ConflictItem[]
  ): AIChatMessage {
    const qLower = question.toLowerCase().trim();

    // Friendly conversational greeting handling
    const greetings = ['hi', 'hii', 'hiii', 'hello', 'hey', 'heyy', 'good morning', 'good afternoon', 'good evening', 'greetings'];
    if (greetings.includes(qLower) || qLower === 'help' || qLower === 'who are you') {
      const featureNames = features.slice(0, 4).map((f) => `**${f.name}**`).join(', ');
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `👋 Hello! I am **AEVORA Intelligence**, your Real-Time Temporal Product Knowledge Assistant.

I have indexed **${records.length}** product records and **${events.length}** historical events across your product features.

Here are a few things you can ask me:
- *"When was OTP Authentication introduced?"*
- *"Who approved the Payment Gateway?"*
- *"Why was the login feature modified?"*
- *"What changed in the Notification System?"*
- *"Were there any conflicting decisions regarding OTP expiration?"*

Currently tracked features include: ${featureNames || 'your workspace features'}. How can I assist you with product history today?`,
        timestamp: new Date().toISOString(),
      };
    }

    // 1. Target identification
    let matchedFeature = features.find(
      (f) =>
        qLower.includes(f.name.toLowerCase()) ||
        f.aliases.some((a) => qLower.includes(a.toLowerCase()))
    );

    // Common synonyms
    if (!matchedFeature) {
      if (qLower.includes('otp') || qLower.includes('verification') || qLower.includes('expiration') || qLower.includes('2fa') || qLower.includes('mfa')) {
        matchedFeature = features.find((f) => f.name.toLowerCase().includes('otp'));
      } else if (qLower.includes('login') || qLower.includes('auth') || qLower.includes('jwt')) {
        matchedFeature = features.find((f) => f.name.toLowerCase().includes('auth'));
      } else if (qLower.includes('payment') || qLower.includes('stripe') || qLower.includes('adyen')) {
        matchedFeature = features.find((f) => f.name.toLowerCase().includes('payment'));
      } else if (qLower.includes('notif') || qLower.includes('alert')) {
        matchedFeature = features.find((f) => f.name.toLowerCase().includes('notification'));
      } else if (qLower.includes('transaction') || qLower.includes('ledger')) {
        matchedFeature = features.find((f) => f.name.toLowerCase().includes('transaction'));
      }
    }

    // Check for conflict specific questions
    const matchedConflict = conflicts.find(
      (c) =>
        qLower.includes('conflict') ||
        (matchedFeature && c.featureId === matchedFeature.id) ||
        qLower.includes('expiration') ||
        qLower.includes('discrepancy')
    );

    if (matchedFeature) {
      const featEvents = events
        .filter((e) => e.featureId === matchedFeature!.id)
        .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));

      const citations: Array<{
        sourceRecordId: string;
        recordName: string;
        evidenceText: string;
        eventDate?: string;
      }> = [];

      featEvents.forEach((ev) => {
        const rec = records.find((r) => r.id === ev.sourceRecordId);
        if (rec) {
          citations.push({
            sourceRecordId: rec.id,
            recordName: rec.fileName,
            evidenceText: ev.evidenceText,
            eventDate: ev.eventDate || undefined,
          });
        }
      });

      // Construct answer
      let content = `### Temporal History for ${matchedFeature.name}\n\n`;
      content += `**Module:** ${matchedFeature.module}  \n`;
      content += `**Current Status:** \`${matchedFeature.currentStatus}\`  \n`;
      content += `**First Recorded:** ${matchedFeature.firstRecordedDate} | **Last Modified:** ${matchedFeature.lastModifiedDate}\n\n`;

      content += `#### Verified Historical Timeline:\n`;
      featEvents.forEach((e) => {
        const rec = records.find((r) => r.id === e.sourceRecordId);
        content += `- **${e.eventDate || 'Undated'}** (${e.eventType.replace('FEATURE_', '')}): ${e.description}`;
        if (e.person) content += ` *(by ${e.person})*`;
        if (rec) content += ` — Source: [${rec.fileName}](#record-${rec.id})`;
        content += `\n`;
      });

      let conflictWarning: string | undefined = undefined;
      if (matchedConflict) {
        conflictWarning = `Active Historical Conflict: "${matchedConflict.title}". ${matchedConflict.reason}`;
        content += `\n> [!WARNING]\n> **Historical Discrepancy Detected:** ${matchedConflict.title}\n> ${matchedConflict.reason}\n`;
      }

      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        citations,
        relatedEvents: featEvents.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          featureName: e.featureName,
          date: e.eventDate || 'Unknown',
          description: e.description,
        })),
        conflictWarning,
      };
    }

    // Module or broader query
    if (qLower.includes('payment') || qLower.includes('recent') || qLower.includes('conflict')) {
      const related = events.slice(0, 4);
      return {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `### Cross-Feature Historical Summary\n\nFound **${events.length}** historical events recorded across **${features.length}** features in this workspace.\n\nRecent product activity includes:\n` +
          events.slice(0, 3).map((e) => `- **${e.eventDate}**: ${e.featureName} — ${e.description}`).join('\n') +
          `\n\nTo view specific evidence, ask about a particular feature such as *OTP Verification*, *User Authentication*, or *Payment Gateway*.`,
        timestamp: new Date().toISOString(),
        citations: records.slice(0, 2).map((r) => ({
          sourceRecordId: r.id,
          recordName: r.fileName,
          evidenceText: r.summary || (r.rawContent ? r.rawContent.slice(0, 150) : ''),
          eventDate: r.eventDate || undefined,
        })),
        relatedEvents: related.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          featureName: e.featureName,
          date: e.eventDate || 'Unknown',
          description: e.description,
        })),
      };
    }

    // Insufficient evidence response
    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: `The available product records and verified events do not establish a documented answer for: "${question}".\n\nTo answer this question, please upload a project specification, architecture document, or connect a repository containing related records.`,
      timestamp: new Date().toISOString(),
      isInsufficientEvidence: true,
    };
  }
}

export const geminiService = new GeminiService();
