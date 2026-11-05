export type EventType =
  | 'FEATURE_PROPOSED'
  | 'FEATURE_APPROVED'
  | 'FEATURE_REJECTED'
  | 'FEATURE_IMPLEMENTED'
  | 'FEATURE_MODIFIED'
  | 'FEATURE_RENAMED'
  | 'FEATURE_DEPRECATED'
  | 'FEATURE_REMOVED'
  | 'BUG_FIXED'
  | 'REQUIREMENT_CHANGED'
  | 'ARCHITECTURE_CHANGED';

export type FeatureStatus =
  | 'PROPOSED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_DEVELOPMENT'
  | 'IN_PROGRESS'
  | 'IMPLEMENTED'
  | 'MODIFIED'
  | 'RENAMED'
  | 'DEPRECATED'
  | 'REMOVED';

export type ProcessingStatus =
  | 'RECEIVED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'EXTRACTING'
  | 'UPDATING_HISTORY'
  | 'COMPLETED'
  | 'FAILED';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  productName: string;
  productDescription: string;
  teamDetails?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  isSample?: boolean;
}

export interface ProjectRecord {
  id: string;
  workspaceId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  sourceType: 'UPLOAD' | 'GITHUB' | 'JIRA' | 'GOOGLE_DRIVE';
  author?: string;
  module?: string;
  eventDate?: string | null;
  ingestionDate: string;
  status: ProcessingStatus;
  extractedEventCount: number;
  rawContent?: string;
  summary?: string;
  storageUrl?: string;
  isSample?: boolean;
  errorMessage?: string;
}

export interface ExtractedEventPayload {
  featureName: string;
  moduleName: string;
  eventType: EventType;
  description: string;
  previousState: string;
  newState: string;
  eventDate: string | null;
  ingestionDate: string;
  person: string | null;
  decisionStatus: string;
  reason: string | null;
  sourceRecordId: string;
  evidenceText: string;
  confidence: number;
}

export interface FeatureEvent extends ExtractedEventPayload {
  id: string;
  workspaceId: string;
  featureId: string;
  status: 'VALIDATED' | 'UNDER_REVIEW' | 'REJECTED';
  isSample?: boolean;
  createdAt: string;
}

export interface Feature {
  id: string;
  workspaceId: string;
  name: string;
  module: string;
  description: string;
  currentStatus: FeatureStatus;
  firstRecordedDate: string;
  lastModifiedDate: string;
  aliases: string[];
  relatedPeople: string[];
  dependencies: string[];
  historicalEventCount: number;
  isSample?: boolean;
  sourceRecordIds: string[];
}

export interface Decision {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  decider?: string | null;
  date: string;
  featureId?: string;
  featureName?: string;
  sourceRecordId?: string;
  evidenceText?: string;
}

export interface ConflictItem {
  id: string;
  workspaceId: string;
  featureId: string;
  featureName: string;
  title: string;
  conflictingStatements: Array<{
    statement: string;
    sourceRecordId: string;
    sourceName: string;
    date: string;
    evidenceText?: string;
  }>;
  reason: string;
  status: 'OPEN' | 'REVIEWED' | 'RESOLVED';
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  description: string;
  featureId?: string;
  featureName?: string;
  source: 'MANUAL' | 'GITHUB' | 'JIRA' | 'SYSTEM' | 'GEMINI_AI';
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
}

export interface IntegrationConnection {
  id: string;
  workspaceId: string;
  provider: 'GITHUB' | 'JIRA' | 'GOOGLE_DRIVE' | 'MANUAL';
  name: string;
  isConnected: boolean;
  config: {
    repository?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    projectKey?: string;
    folderId?: string;
    [key: string]: any;
  };
  lastSyncAt: string | null;
  lastEventAt: string | null;
  statusText: string;
  error?: string | null;
}

export interface EvolyraNotification {
  id: string;
  kind: string;
  repo?: string;
  title: string;
  body: string;
  actor: string;
  event_ids: string[];
  needs_reason: number;
  created_at: string;
  read_at?: string | null;
  delivery_id?: string;
  compare_url?: string;
  commit_url?: string;
}

export interface NotificationItem {
  id: string;
  workspaceId?: string;
  userId?: string;
  title: string;
  message: string;
  type?: 'FEATURE_DISCOVERED' | 'FEATURE_MODIFIED' | 'APPROVAL' | 'IMPLEMENTATION' | 'CONFLICT_DETECTED' | 'JOB_FAILED' | 'INTEGRATION' | string;
  read: boolean;
  timestamp: string;
  link?: string;
  repo?: string;
  needs_reason?: number;
  event_ids?: string[];
  actor?: string;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'feature' | 'module' | 'person' | 'decision' | 'document' | 'event' | 'ticket' | 'pr';
  category: string;
  status?: string;
  date?: string;
  meta?: any;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label:
    | 'belongs_to'
    | 'mentions'
    | 'proposed'
    | 'approved'
    | 'implemented'
    | 'modified'
    | 'changed'
    | 'affects'
    | 'depends_on';
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface StructuredTimelineEvent {
  id: string;
  eventDate: string;
  status: string;
  actor: string;
  sourceFile: string;
  sourceRecordId?: string;
  quote: string;
  description: string;
}

export interface StructuredAIAnswer {
  entityName?: string;
  currentStatus: string;
  firstRecorded: string;
  lastEvent: string; // explicitly "Last event" (not "Last Modified")
  summary?: string | null;
  timeline: StructuredTimelineEvent[];
  citations: Array<{
    sourceRecordId: string;
    recordName: string;
    evidenceText: string;
    eventDate?: string;
  }>;
  noRecordFound?: boolean;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  structuredAnswer?: StructuredAIAnswer;
  citations?: Array<{
    sourceRecordId: string;
    recordName: string;
    evidenceText: string;
    eventDate?: string;
    confidence?: number;
  }>;
  relatedEvents?: Array<{
    id: string;
    eventType: EventType;
    featureName: string;
    date: string;
    description: string;
  }>;
  conflictWarning?: string;
  isInsufficientEvidence?: boolean;
  intent?: 'greeting_or_help' | 'navigation' | 'product_question' | 'out_of_scope';
  reply?: string;
  example_questions?: string[];
  chatCitations?: Array<{
    source_id: string;
    event_date: string | null;
    quote: string | null;
    evidence_url: string | null;
    event_type?: string;
  }>;
  navigation?: { tab: string; label: string } | null;
  no_record_found?: boolean;
}
