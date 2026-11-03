import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../store/db.js';
import {
  AIChatMessage,
  FeatureEvent,
  ProjectRecord,
  Feature,
  StructuredAIAnswer,
  StructuredTimelineEvent,
} from '../../src/types/index.js';

// ============================================================================
// AEVORA STRICT TEMPORAL VERIFICATION & QA ENGINE
// ============================================================================

export const KNOWN_STATUS_WORDS = [
  'proposed',
  'approved',
  'implemented',
  'modified',
  'renamed',
  'rejected',
  'removed',
  'deprecated',
  'under_review',
  'in_development',
  'closed',
  'merged',
] as const;

/**
 * 1. RETRIEVAL
 * Query the events table for matching events (entity incl. aliases, date range, status).
 * If none match, return null/empty and do NOT call the LLM.
 */
export function retrieveEventsForQuestion(
  workspaceId: string,
  question: string
): {
  matchedEvents: FeatureEvent[];
  matchedFeature?: Feature;
  matchedStatus?: string;
  matchedDateRange?: { start?: string; end?: string; year?: string };
} {
  const qLower = question.toLowerCase().trim();
  const allEvents = db.getFeatureEvents(workspaceId);
  const allFeatures = db.getFeatures(workspaceId);

  // 1. Entity & Alias Matching
  let matchedFeature: Feature | undefined;

  for (const f of allFeatures) {
    if (qLower.includes(f.name.toLowerCase())) {
      matchedFeature = f;
      break;
    }
    if (f.aliases && f.aliases.some((a) => qLower.includes(a.toLowerCase()))) {
      matchedFeature = f;
      break;
    }
  }

  // Synonym & Substring Matching for common product capabilities
  if (!matchedFeature) {
    if (
      qLower.includes('otp') ||
      qLower.includes('two-factor') ||
      qLower.includes('2fa') ||
      qLower.includes('sms verification') ||
      qLower.includes('one-time password')
    ) {
      matchedFeature = allFeatures.find((f) => f.name.toLowerCase().includes('otp'));
    } else if (
      qLower.includes('payment') ||
      qLower.includes('gateway') ||
      qLower.includes('stripe') ||
      qLower.includes('adyen')
    ) {
      matchedFeature = allFeatures.find((f) => f.name.toLowerCase().includes('payment'));
    } else if (
      qLower.includes('transaction') ||
      qLower.includes('reconciliation') ||
      qLower.includes('ledger')
    ) {
      matchedFeature = allFeatures.find((f) => f.name.toLowerCase().includes('transaction') || f.name.toLowerCase().includes('ledger'));
    } else if (
      qLower.includes('passkey') ||
      qLower.includes('biometric') ||
      qLower.includes('webauthn') ||
      qLower.includes('fido2')
    ) {
      matchedFeature = allFeatures.find((f) => f.name.toLowerCase().includes('passkey') || f.name.toLowerCase().includes('biometric'));
    } else if (
      qLower.includes('notification') ||
      qLower.includes('alerts') ||
      qLower.includes('push')
    ) {
      matchedFeature = allFeatures.find((f) => f.name.toLowerCase().includes('notification'));
    } else if (
      qLower.includes('login') ||
      qLower.includes('jwt') ||
      qLower.includes('user auth')
    ) {
      matchedFeature = allFeatures.find((f) => f.name.toLowerCase().includes('auth'));
    }
  }

  // 1b. Project / Workspace Overview Detection
  const isProjectSummaryQuery =
    /^(summarise|summarize)\b/i.test(qLower) ||
    (/\b(summarise|summarize|summary|overview|about|describe)\b/i.test(qLower) &&
      /\b(project|workspace|product|platform|system|application|app|all features|features)\b/i.test(qLower)) ||
    /\b(what features|list features|all features|what is this project|tell me about this project)\b/i.test(qLower);

  if (!matchedFeature && isProjectSummaryQuery) {
    const ws = db.getWorkspaceById(workspaceId);
    matchedFeature = {
      id: ws?.id || 'ws-project-overview',
      workspaceId,
      name: ws?.name || 'Smart Banking Platform',
      module: 'Core Platform',
      description: ws?.productDescription || 'Enterprise retail banking web and mobile application suite with real-time payments, biometric auth, and ledger analytics.',
      currentStatus: 'IN_DEVELOPMENT',
      firstRecordedDate: '2024-05-10',
      lastModifiedDate: '2024-06-01',
      aliases: ['Banking Core', 'Platform'],
      relatedPeople: ['Alex Morgan'],
      dependencies: [],
      historicalEventCount: allEvents.length,
      sourceRecordIds: [],
    };
  }

  // 2. Status Detection
  let matchedStatus: string | undefined;
  for (const statusWord of KNOWN_STATUS_WORDS) {
    const cleanWord = statusWord.replace(/_/g, ' ');
    if (new RegExp(`\\b${cleanWord}\\b`, 'i').test(qLower)) {
      matchedStatus = statusWord;
      break;
    }
  }

  // 3. Date / Year Detection
  const yearMatch = qLower.match(/\b(20\d\d)\b/);
  const isoDateMatch = qLower.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const matchedDateRange = {
    year: yearMatch ? yearMatch[1] : undefined,
    start: isoDateMatch ? isoDateMatch[1] : undefined,
  };

  // 4. Candidate Retrieval
  let candidates: FeatureEvent[] = [];

  if (matchedFeature) {
    if (matchedFeature.id === 'ws-project-overview' || matchedFeature.id === workspaceId) {
      // For project overview, include all feature events across workspace sorted chronologically
      candidates = [...allEvents].sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));
    } else {
      candidates = allEvents.filter(
        (e) =>
          e.featureId === matchedFeature!.id ||
          e.featureName.toLowerCase() === matchedFeature!.name.toLowerCase()
      );
    }
  } else {
    // Keyword extraction from question (strip standard stop words)
    const stopWords = new Set([
      'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how',
      'did', 'was', 'were', 'is', 'are', 'the', 'this', 'that', 'these',
      'those', 'for', 'with', 'about', 'tell', 'show', 'give', 'feature',
      'product', 'system', 'history', 'event', 'record', 'status', 'decision',
      'engine',
    ]);
    const words = qLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stopWords.has(w));

    if (words.length > 0) {
      candidates = allEvents.filter((e) => {
        const text = `${e.featureName} ${e.description} ${e.evidenceText} ${e.reason || ''} ${e.person || ''}`.toLowerCase();
        const eventWords = new Set(text.split(/[^a-z0-9]+/));
        return words.some((w) => eventWords.has(w));
      });
    }
  }

  // Filter by date range if specified
  if (matchedDateRange.year || matchedDateRange.start) {
    const dateFiltered = candidates.filter((e) => {
      if (!e.eventDate) return false;
      if (matchedDateRange.start && !e.eventDate.includes(matchedDateRange.start)) {
        return false;
      }
      if (matchedDateRange.year && !e.eventDate.startsWith(matchedDateRange.year)) {
        return false;
      }
      return true;
    });
    if (dateFiltered.length > 0) {
      candidates = dateFiltered;
    }
  }

  // Filter or prioritize by status if specified
  if (matchedStatus && candidates.length > 0) {
    const statusNormalized = matchedStatus.replace(/_/g, '').toLowerCase();
    const statusFiltered = candidates.filter((e) => {
      const s = `${e.newState || ''} ${e.status || ''} ${e.eventType || ''}`.toLowerCase().replace(/[^a-z]/g, '');
      return s.includes(statusNormalized);
    });
    if (statusFiltered.length > 0) {
      candidates = statusFiltered;
    }
  }

  return {
    matchedEvents: candidates,
    matchedFeature,
    matchedStatus,
    matchedDateRange,
  };
}

/**
 * 2. VERIFICATION & FACT CHECKING
 * Extract every date (YYYY-MM-DD and common formats) and every status word from the LLM summary.
 * Each must exist in the selected events.
 * Verify event_ids exist and belong to the query results.
 */
export function verifySummaryAndEventIds(
  summary: string,
  eventIds: string[],
  retrievedEvents: FeatureEvent[]
): {
  isValid: boolean;
  error?: string;
  verifiedEventIds: string[];
} {
  const retrievedIdSet = new Set(retrievedEvents.map((e) => e.id));

  // (c) An invented event_id is rejected
  const hasInventedIds = (eventIds || []).some((id) => !retrievedIdSet.has(id));
  const validEventIds = (eventIds || []).filter((id) => retrievedIdSet.has(id));

  if (hasInventedIds || validEventIds.length === 0) {
    return {
      isValid: false,
      error: `Invented or missing event_ids: [${(eventIds || []).join(', ')}]. All event_ids must strictly match retrieved events.`,
      verifiedEventIds: validEventIds.length > 0 ? validEventIds : retrievedEvents.map((e) => e.id),
    };
  }

  const selectedEvents = retrievedEvents.filter((e) => validEventIds.includes(e.id));

  // Extract dates from summary
  const isoDates = summary.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  const years = summary.match(/\b(19\d\d|20\d\d)\b/g) || [];

  // Month names pattern e.g. "May 10, 2024", "10 May 2024", "May 2024"
  const monthNamesRegex = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+\d{1,2}(?:st|nd|rd|th)?)?,?\s+\d{4}\b/gi;
  const textualDates = summary.match(monthNamesRegex) || [];

  // Compute allowed date representations from selected events
  const allowedIsoDates = new Set<string>();
  const allowedYears = new Set<string>();
  const allowedTextualDates = new Set<string>();

  selectedEvents.forEach((e) => {
    if (e.eventDate) {
      allowedIsoDates.add(e.eventDate); // "2024-05-10"
      const y = e.eventDate.slice(0, 4);
      allowedYears.add(y); // "2024"

      try {
        const d = new Date(e.eventDate);
        if (!isNaN(d.getTime())) {
          allowedTextualDates.add(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toLowerCase());
          allowedTextualDates.add(d.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toLowerCase());
          allowedTextualDates.add(d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase());
        }
      } catch {}
    }
  });

  // Verify ISO dates
  for (const iso of isoDates) {
    if (!allowedIsoDates.has(iso)) {
      return {
        isValid: false,
        error: `Date "${iso}" in summary does not exist in the selected database events.`,
        verifiedEventIds: validEventIds,
      };
    }
  }

  // Verify textual dates
  for (const td of textualDates) {
    const tdLower = td.toLowerCase().replace(/,/g, '');
    let matched = false;
    for (const allowed of allowedTextualDates) {
      if (tdLower.includes(allowed.replace(/,/g, '')) || allowed.includes(tdLower)) {
        matched = true;
        break;
      }
    }
    if (!matched && !Array.from(allowedIsoDates).some((iso) => tdLower.includes(iso))) {
      return {
        isValid: false,
        error: `Date "${td}" in summary does not exist in the selected database events.`,
        verifiedEventIds: validEventIds,
      };
    }
  }

  // Verify 4-digit years
  for (const y of years) {
    if (!allowedYears.has(y)) {
      return {
        isValid: false,
        error: `Year "${y}" in summary does not exist in the selected database events.`,
        verifiedEventIds: validEventIds,
      };
    }
  }

  // Verify Status Words
  const allowedStatuses = new Set<string>();
  selectedEvents.forEach((e) => {
    if (e.newState) allowedStatuses.add(e.newState.toLowerCase().replace(/[^a-z]/g, ''));
    if (e.previousState) allowedStatuses.add(e.previousState.toLowerCase().replace(/[^a-z]/g, ''));
    if (e.status) allowedStatuses.add(e.status.toLowerCase().replace(/[^a-z]/g, ''));
    if (e.decisionStatus) allowedStatuses.add(e.decisionStatus.toLowerCase().replace(/[^a-z]/g, ''));
    if (e.eventType) {
      allowedStatuses.add(e.eventType.toLowerCase().replace('feature_', '').replace(/[^a-z]/g, ''));
    }
  });

  const summaryLower = summary.toLowerCase();
  for (const statusWord of KNOWN_STATUS_WORDS) {
    const cleanWord = statusWord.replace(/_/g, ' ');
    const regex = new RegExp(`\\b${cleanWord}\\b`, 'i');
    if (regex.test(summaryLower)) {
      const normalized = statusWord.replace(/_/g, '');
      const isAllowed = Array.from(allowedStatuses).some(
        (s) => s.includes(normalized) || normalized.includes(s)
      );
      if (!isAllowed) {
        return {
          isValid: false,
          error: `Status word "${statusWord}" in summary does not exist in the selected database events.`,
          verifiedEventIds: validEventIds,
        };
      }
    }
  }

  return {
    isValid: true,
    verifiedEventIds: validEventIds,
  };
}

/**
 * 3. ANSWER ASSEMBLY IN CODE
 * Build timeline (date, status badge, actor, source file, verbatim quote) directly
 * from selected event rows, sorted by event_date.
 * Compute First recorded, Last event and Current status from those rows.
 */
export function assembleAnswerInCode(
  selectedEvents: FeatureEvent[],
  records: ProjectRecord[],
  verifiedSummary: string | null,
  entityNameOverride?: string
): StructuredAIAnswer {
  // Sort events chronologically by eventDate ascending
  const sorted = [...selectedEvents].sort((a, b) =>
    (a.eventDate || '').localeCompare(b.eventDate || '')
  );

  const firstRecorded = sorted[0]?.eventDate || 'N/A';
  const lastEvent = sorted[sorted.length - 1]?.eventDate || 'N/A';
  const latestEvent = sorted[sorted.length - 1];

  let currentStatus = 'RECORDED';
  if (latestEvent) {
    currentStatus =
      latestEvent.newState ||
      latestEvent.status ||
      latestEvent.eventType.replace('FEATURE_', '');
  }

  const entityName = entityNameOverride || sorted[0]?.featureName || 'Product Feature';

  // Build timeline items strictly from database rows
  const timeline: StructuredTimelineEvent[] = sorted.map((e) => {
    const record = records.find((r) => r.id === e.sourceRecordId);
    return {
      id: e.id,
      eventDate: e.eventDate || 'Unknown',
      status: e.newState || e.status || e.eventType.replace('FEATURE_', ''),
      actor: e.person || record?.author || 'Team Member',
      sourceFile: record?.fileName || 'Source Document',
      sourceRecordId: e.sourceRecordId,
      quote: e.evidenceText || e.description,
      description: e.description,
    };
  });

  // Build citations from matched records
  const sourceRecordIds = Array.from(new Set(sorted.map((e) => e.sourceRecordId)));
  const citations = sourceRecordIds.map((recId) => {
    const rec = records.find((r) => r.id === recId);
    const ev = sorted.find((e) => e.sourceRecordId === recId);
    return {
      sourceRecordId: recId,
      recordName: rec?.fileName || 'Verified Record',
      evidenceText: ev?.evidenceText || ev?.description || '',
      eventDate: ev?.eventDate || rec?.eventDate || undefined,
    };
  });

  return {
    entityName,
    currentStatus,
    firstRecorded,
    lastEvent, // Strictly "Last event"
    summary: verifiedSummary,
    timeline,
    citations,
    noRecordFound: false,
  };
}

/**
 * Main Controller: Answer historical questions strictly preventing hallucinations
 */
export async function executeTemporalQA(
  workspaceId: string,
  question: string,
  options?: {
    apiKey?: string;
    mockLlmCaller?: (prompt: string) => Promise<{ event_ids: string[]; summary: string }>;
  }
): Promise<AIChatMessage> {
  const records = db.getRecords(workspaceId);

  // ── STEP 1: RETRIEVAL ─────────────────────────────────────────────────────
  const retrieval = retrieveEventsForQuestion(workspaceId, question);

  // If none match, return "No record found for this question." and do NOT call the LLM
  if (!retrieval.matchedEvents || retrieval.matchedEvents.length === 0) {
    return {
      id: `msg-${uuidv4()}`,
      role: 'assistant',
      content: 'No record found for this question.',
      timestamp: new Date().toISOString(),
      structuredAnswer: {
        noRecordFound: true,
        currentStatus: 'NONE',
        firstRecorded: 'N/A',
        lastEvent: 'N/A',
        summary: null,
        timeline: [],
        citations: [],
      },
    };
  }

  const retrievedEvents = retrieval.matchedEvents;

  // ── STEP 2: LLM CALL ──────────────────────────────────────────────────────
  // Send only the retrieved events, each with its id. Ask model for JSON only:
  // {"event_ids": [...], "summary": "one or two sentences"}. Temperature 0.
  const formatEventContext = (evList: FeatureEvent[]) =>
    evList
      .map(
        (e) =>
          `[Event ID: ${e.id}]\nDate: ${e.eventDate || 'Unknown'}\nFeature: ${e.featureName}\nStatus: ${e.newState || e.status || e.eventType}\nActor: ${e.person || 'Unknown'}\nDescription: ${e.description}\nEvidence: "${e.evidenceText || e.description}"`
      )
      .join('\n\n');

  const buildPrompt = (errorFeedback?: string) => `You are AEVORA's strict temporal verification assistant.
Your task is to answer the user question using ONLY the provided events below.

RETRIEVED EVENTS:
${formatEventContext(retrievedEvents)}

USER QUESTION: "${question}"
${errorFeedback ? `\nPREVIOUS ATTEMPT FAILED VERIFICATION: ${errorFeedback}\nEnsure every date, person name, and status in your summary strictly matches the provided events.\n` : ''}

STRICT RULES:
1. Use ONLY the provided events above.
2. Never state a date, name, or status that is not in them.
3. If the events do not answer the question, say so.
4. Return JSON only: {"event_ids": [...], "summary": "one or two sentences"}.

JSON SCHEMA:
{
  "event_ids": ["string"],
  "summary": "one or two sentences"
}`;

  let selectedEventIds: string[] = [];
  let summaryText: string | null = null;

  const apiKey = options?.apiKey || db.getSettings().geminiApiKey || process.env.GEMINI_API_KEY;

  if (options?.mockLlmCaller) {
    // Used by test harness
    const prompt1 = buildPrompt();
    const res1 = await options.mockLlmCaller(prompt1);
    const ver1 = verifySummaryAndEventIds(res1.summary, res1.event_ids, retrievedEvents);

    if (ver1.isValid) {
      selectedEventIds = ver1.verifiedEventIds;
      summaryText = res1.summary;
    } else {
      // Retry once with error message
      const prompt2 = buildPrompt(ver1.error);
      const res2 = await options.mockLlmCaller(prompt2);
      const ver2 = verifySummaryAndEventIds(res2.summary, res2.event_ids, retrievedEvents);
      if (ver2.isValid) {
        selectedEventIds = ver2.verifiedEventIds;
        summaryText = res2.summary;
      } else {
        // If it still fails, drop the summary and show the code-built timeline only
        selectedEventIds = ver2.verifiedEventIds;
        summaryText = null;
      }
    }
  } else if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      });

      // Call 1
      const p1 = buildPrompt();
      const r1 = await model.generateContent(p1);
      const t1 = r1.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const json1 = JSON.parse(t1);

      const ver1 = verifySummaryAndEventIds(json1.summary || '', json1.event_ids || [], retrievedEvents);
      if (ver1.isValid) {
        selectedEventIds = ver1.verifiedEventIds;
        summaryText = json1.summary;
      } else {
        // Retry once with error feedback
        const p2 = buildPrompt(ver1.error);
        const r2 = await model.generateContent(p2);
        const t2 = r2.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const json2 = JSON.parse(t2);

        const ver2 = verifySummaryAndEventIds(json2.summary || '', json2.event_ids || [], retrievedEvents);
        if (ver2.isValid) {
          selectedEventIds = ver2.verifiedEventIds;
          summaryText = json2.summary;
        } else {
          // Still failed: drop the summary!
          selectedEventIds = ver2.verifiedEventIds;
          summaryText = null;
        }
      }
    } catch (err) {
      console.warn('[TemporalQA] Gemini invocation error, assembling from code-verified events:', err);
      selectedEventIds = retrievedEvents.map((e) => e.id);
      summaryText = null;
    }
  } else {
    // No API key: Deterministic code-built summary strictly using database fields
    selectedEventIds = retrievedEvents.map((e) => e.id);
    const sorted = [...retrievedEvents].sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));
    const fDate = sorted[0]?.eventDate;
    const lDate = sorted[sorted.length - 1]?.eventDate;
    if (retrieval.matchedFeature && retrieval.matchedFeature.id.includes('project')) {
      const distinctFeatures = Array.from(new Set(retrievedEvents.map((e) => e.featureName)));
      summaryText = `${retrieval.matchedFeature.name} consists of ${distinctFeatures.length} core features, first recorded on ${fDate} and last updated on ${lDate}.`;
    } else {
      const featName = sorted[0]?.featureName;
      summaryText = `${featName} was first recorded on ${fDate} and last updated on ${lDate}.`;
    }
  }

  // ── STEP 3: ANSWER ASSEMBLY IN CODE ───────────────────────────────────────
  const finalEvents = retrievedEvents.filter((e) => selectedEventIds.includes(e.id));
  const eventsToAssemble = finalEvents.length > 0 ? finalEvents : retrievedEvents;

  const structuredAnswer = assembleAnswerInCode(
    eventsToAssemble,
    records,
    summaryText,
    retrieval.matchedFeature?.name
  );

  return {
    id: `msg-${uuidv4()}`,
    role: 'assistant',
    content: structuredAnswer.summary || `Timeline assembled from ${structuredAnswer.timeline.length} verified events.`,
    timestamp: new Date().toISOString(),
    structuredAnswer,
  };
}
