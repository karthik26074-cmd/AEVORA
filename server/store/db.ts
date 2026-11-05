import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
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

const DB_FILE = path.resolve(process.cwd(), 'data', 'aevora-db.json');

export interface DatabaseSchema {
  users: User[];
  workspaces: Workspace[];
  records: ProjectRecord[];
  features: Feature[];
  featureEvents: FeatureEvent[];
  decisions: Decision[];
  conflicts: ConflictItem[];
  activityLogs: ActivityLog[];
  integrations: IntegrationConnection[];
  notifications: NotificationItem[];
  webhookDeliveries: Array<{
    id: string;
    deliveryId: string;
    provider: string;
    eventType: string;
    receivedAt: string;
    payload: any;
  }>;
  settings: {
    geminiApiKey?: string;
    firebaseConfig?: {
      apiKey?: string;
      authDomain?: string;
      projectId?: string;
      storageBucket?: string;
    };
  };
}

class Database {
  private data: DatabaseSchema;
  private listeners: Array<(event: string, payload: any) => void> = [];

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Error reading db file, initializing fresh store:', err);
    }

    return {
      users: [],
      workspaces: [],
      records: [],
      features: [],
      featureEvents: [],
      decisions: [],
      conflicts: [],
      activityLogs: [],
      integrations: [],
      notifications: [],
      webhookDeliveries: [],
      settings: {
        geminiApiKey: process.env.GEMINI_API_KEY || '',
      },
    };
  }

  public save(): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to persist db file:', err);
    }
  }

  public onUpdate(callback: (event: string, payload: any) => void) {
    this.listeners.push(callback);
  }

  public broadcast(event: string, payload: any) {
    this.listeners.forEach((cb) => {
      try {
        cb(event, payload);
      } catch (err) {
        console.error('[DB] Listener broadcast error:', err);
      }
    });
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }
  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }
  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }
  public saveUser(user: User): User {
    const existing = this.data.users.findIndex((u) => u.id === user.id);
    if (existing >= 0) {
      this.data.users[existing] = user;
    } else {
      this.data.users.push(user);
    }
    this.save();
    return user;
  }

  // --- Workspaces ---
  public getWorkspaces(userId?: string): Workspace[] {
    if (!userId) return this.data.workspaces;
    return this.data.workspaces.filter((w) => w.ownerId === userId || w.isSample);
  }
  public getWorkspaceById(id: string): Workspace | undefined {
    return this.data.workspaces.find((w) => w.id === id);
  }
  public saveWorkspace(workspace: Workspace): Workspace {
    const idx = this.data.workspaces.findIndex((w) => w.id === workspace.id);
    if (idx >= 0) {
      this.data.workspaces[idx] = workspace;
    } else {
      this.data.workspaces.push(workspace);
    }
    this.save();
    this.broadcast('WORKSPACE_UPDATED', workspace);
    return workspace;
  }

  // --- Project Records ---
  public getRecords(workspaceId: string): ProjectRecord[] {
    return this.data.records.filter((r) => r.workspaceId === workspaceId);
  }
  public getRecordById(id: string): ProjectRecord | undefined {
    return this.data.records.find((r) => r.id === id);
  }
  public saveRecord(record: ProjectRecord): ProjectRecord {
    const idx = this.data.records.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      this.data.records[idx] = record;
    } else {
      this.data.records.unshift(record);
    }
    this.save();
    this.broadcast('RECORD_UPDATED', record);
    return record;
  }
  public deleteRecord(id: string, workspaceId: string): boolean {
    const idx = this.data.records.findIndex((r) => r.id === id && r.workspaceId === workspaceId);
    if (idx >= 0) {
      this.data.records.splice(idx, 1);
      // Remove connected events
      this.data.featureEvents = this.data.featureEvents.filter((e) => e.sourceRecordId !== id);
      this.save();
      this.broadcast('RECORD_DELETED', { id, workspaceId });
      return true;
    }
    return false;
  }

  // --- Features ---
  public getFeatures(workspaceId: string): Feature[] {
    return this.data.features.filter((f) => f.workspaceId === workspaceId);
  }
  public getFeatureById(id: string): Feature | undefined {
    return this.data.features.find((f) => f.id === id);
  }
  public getFeatureByName(workspaceId: string, name: string): Feature | undefined {
    const norm = name.trim().toLowerCase();
    return this.data.features.find(
      (f) =>
        f.workspaceId === workspaceId &&
        (f.name.toLowerCase() === norm || f.aliases.some((a) => a.toLowerCase() === norm))
    );
  }
  public saveFeature(feature: Feature): Feature {
    const idx = this.data.features.findIndex((f) => f.id === feature.id);
    if (idx >= 0) {
      this.data.features[idx] = feature;
    } else {
      this.data.features.unshift(feature);
    }
    this.save();
    this.broadcast('FEATURE_UPDATED', feature);
    return feature;
  }

  // --- Feature Events ---
  public getFeatureEvents(workspaceId: string, featureId?: string): FeatureEvent[] {
    return this.data.featureEvents.filter(
      (e) => e.workspaceId === workspaceId && (!featureId || e.featureId === featureId)
    );
  }
  public saveFeatureEvent(event: FeatureEvent): FeatureEvent {
    const idx = this.data.featureEvents.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      this.data.featureEvents[idx] = event;
    } else {
      this.data.featureEvents.push(event);
    }
    this.save();
    this.broadcast('EVENT_CREATED', event);
    return event;
  }

  public saveFeatureEvents(events: FeatureEvent[]): FeatureEvent[] {
    if (!events.length) return [];
    for (const event of events) {
      const idx = this.data.featureEvents.findIndex((e) => e.id === event.id);
      if (idx >= 0) {
        this.data.featureEvents[idx] = event;
      } else {
        this.data.featureEvents.push(event);
      }
    }
    this.save();
    events.forEach((e) => this.broadcast('EVENT_CREATED', e));
    return events;
  }

  // --- Decisions ---
  public getDecisions(workspaceId: string): Decision[] {
    return this.data.decisions.filter((d) => d.workspaceId === workspaceId);
  }
  public saveDecision(decision: Decision): Decision {
    const idx = this.data.decisions.findIndex((d) => d.id === decision.id);
    if (idx >= 0) {
      this.data.decisions[idx] = decision;
    } else {
      this.data.decisions.unshift(decision);
    }
    this.save();
    this.broadcast('DECISION_UPDATED', decision);
    return decision;
  }

  // --- Conflicts ---
  public getConflicts(workspaceId: string): ConflictItem[] {
    return this.data.conflicts.filter((c) => c.workspaceId === workspaceId);
  }
  public saveConflict(conflict: ConflictItem): ConflictItem {
    const idx = this.data.conflicts.findIndex((c) => c.id === conflict.id);
    if (idx >= 0) {
      this.data.conflicts[idx] = conflict;
    } else {
      this.data.conflicts.unshift(conflict);
    }
    this.save();
    this.broadcast('CONFLICT_UPDATED', conflict);
    return conflict;
  }

  // --- Activity Logs ---
  public getActivityLogs(workspaceId: string, limit = 50): ActivityLog[] {
    return this.data.activityLogs
      .filter((a) => a.workspaceId === workspaceId)
      .slice(0, limit);
  }
  public addActivityLog(log: Omit<ActivityLog, 'id'>): ActivityLog {
    const fullLog: ActivityLog = {
      ...log,
      id: uuidv4(),
    };
    this.data.activityLogs.unshift(fullLog);
    // Keep max 200 logs per workspace
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 500);
    }
    this.save();
    this.broadcast('ACTIVITY_LOGGED', fullLog);
    return fullLog;
  }

  // --- Integrations ---
  public getIntegrations(workspaceId: string): IntegrationConnection[] {
    return this.data.integrations.filter((i) => i.workspaceId === workspaceId);
  }
  public saveIntegration(integration: IntegrationConnection): IntegrationConnection {
    const idx = this.data.integrations.findIndex(
      (i) => i.workspaceId === integration.workspaceId && i.provider === integration.provider
    );
    if (idx >= 0) {
      this.data.integrations[idx] = integration;
    } else {
      this.data.integrations.push(integration);
    }
    this.save();
    this.broadcast('INTEGRATION_UPDATED', integration);
    return integration;
  }

  // --- Notifications ---
  public getNotifications(workspaceId: string): NotificationItem[] {
    return this.data.notifications.filter((n) => n.workspaceId === workspaceId);
  }
  public addNotification(notification: Omit<NotificationItem, 'id' | 'read' | 'timestamp'>): NotificationItem {
    const item: NotificationItem = {
      ...notification,
      id: uuidv4(),
      read: false,
      timestamp: new Date().toISOString(),
    };
    this.data.notifications.unshift(item);
    this.save();
    this.broadcast('NOTIFICATION_ADDED', item);
    return item;
  }
  public markNotificationAsRead(id: string, workspaceId: string): boolean {
    const item = this.data.notifications.find((n) => n.id === id && n.workspaceId === workspaceId);
    if (item) {
      item.read = true;
      this.save();
      this.broadcast('NOTIFICATION_READ', { id, workspaceId });
      return true;
    }
    return false;
  }
  public markAllNotificationsAsRead(workspaceId: string): boolean {
    this.data.notifications.forEach((n) => {
      if (n.workspaceId === workspaceId) n.read = true;
    });
    this.save();
    this.broadcast('NOTIFICATIONS_ALL_READ', { workspaceId });
    return true;
  }

  // --- Webhook Deliveries (Deduplication) ---
  public hasWebhookDelivery(deliveryId: string): boolean {
    return this.data.webhookDeliveries.some((d) => d.deliveryId === deliveryId);
  }
  public recordWebhookDelivery(deliveryId: string, provider: string, eventType: string, payload: any) {
    this.data.webhookDeliveries.unshift({
      id: uuidv4(),
      deliveryId,
      provider,
      eventType,
      receivedAt: new Date().toISOString(),
      payload,
    });
    if (this.data.webhookDeliveries.length > 200) {
      this.data.webhookDeliveries = this.data.webhookDeliveries.slice(0, 200);
    }
    this.save();
  }

  // --- Settings ---
  public getSettings() {
    return this.data.settings;
  }
  public updateSettings(settings: Partial<DatabaseSchema['settings']>) {
    this.data.settings = {
      ...this.data.settings,
      ...settings,
    };
    this.save();
    this.broadcast('SETTINGS_UPDATED', this.data.settings);
    return this.data.settings;
  }

  // --- Reset/Clear workspace data ---
  public clearWorkspaceData(workspaceId: string) {
    this.data.records = this.data.records.filter((r) => r.workspaceId !== workspaceId);
    this.data.features = this.data.features.filter((f) => f.workspaceId !== workspaceId);
    this.data.featureEvents = this.data.featureEvents.filter((e) => e.workspaceId !== workspaceId);
    this.data.decisions = this.data.decisions.filter((d) => d.workspaceId !== workspaceId);
    this.data.conflicts = this.data.conflicts.filter((c) => c.workspaceId !== workspaceId);
    this.data.activityLogs = this.data.activityLogs.filter((a) => a.workspaceId !== workspaceId);
    this.data.notifications = this.data.notifications.filter((n) => n.workspaceId !== workspaceId);
    this.save();
    this.broadcast('WORKSPACE_CLEARED', { workspaceId });
  }
}

export const db = new Database();
