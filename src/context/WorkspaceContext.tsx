import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  EvolyraNotification,
  AIChatMessage,
} from '../types';
import { useAuth } from './AuthContext';

interface WorkspaceStats {
  totalRecords: number;
  totalFeatures: number;
  totalEvents: number;
  recentlyModifiedFeatures: number;
  approvedDecisions: number;
  implementedFeatures: number;
  openConflicts: number;
  activeIntegrations: number;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  records: ProjectRecord[];
  features: Feature[];
  events: FeatureEvent[];
  conflicts: ConflictItem[];
  decisions: Decision[];
  activityLogs: ActivityLog[];
  integrations: IntegrationConnection[];
  notifications: NotificationItem[];
  stats: WorkspaceStats;
  unreadNotificationCount: number;
  activeToastNotification: EvolyraNotification | null;
  dismissToastNotification: () => void;
  promptReasonForNotification: (notif: EvolyraNotification) => void;
  addEventReason: (sourceId: string, reason: string) => Promise<boolean>;
  isLiveConnected: boolean;
  isLoading: boolean;
  selectWorkspace: (workspaceId: string) => void;
  createWorkspace: (payload: {
    name: string;
    productName: string;
    productDescription?: string;
    teamDetails?: string;
  }) => Promise<Workspace>;
  seedSampleData: () => Promise<void>;
  clearWorkspaceData: () => Promise<void>;
  uploadFiles: (files: File[] | FileList, author?: string, eventDate?: string) => Promise<{ success: boolean; error?: string }>;
  reExtractRecord: (recordId: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  deleteRecord: (recordId: string) => Promise<boolean>;
  createFeature: (data: Partial<Feature>) => Promise<Feature>;
  updateFeature: (id: string, data: Partial<Feature>) => Promise<Feature>;
  resolveConflict: (id: string, note: string, resolver: string) => Promise<void>;
  reviewConflict: (id: string) => Promise<void>;
  askAI: (question: string) => Promise<AIChatMessage>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  simulateDemoEvent: () => Promise<{ success: boolean; message: string }>;
  refreshData: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [records, setRecords] = useState<ProjectRecord[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [events, setEvents] = useState<FeatureEvent[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeToastNotification, setActiveToastNotification] = useState<EvolyraNotification | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Load initial workspaces
  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces${user ? `?userId=${user.id}` : ''}`);
      const data: Workspace[] = await res.json();
      setWorkspaces(data);

      const savedWsId = localStorage.getItem('aevora_active_ws') || localStorage.getItem('evolyra_active_ws');
      const matched = data.find((w) => w.id === savedWsId) || data[0] || null;
      setCurrentWorkspace(matched);
    } catch (err) {
      console.error('[Workspace] Error loading workspaces:', err);
    }
  }, [user]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // 2. Load workspace data whenever currentWorkspace changes
  const refreshData = useCallback(async () => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;

    try {
      const [recsRes, featsRes, evtsRes, confsRes, decsRes, actsRes, intsRes, notifsRes] =
        await Promise.all([
          fetch(`/api/records?workspaceId=${wsId}`).then((r) => r.json()),
          fetch(`/api/features?workspaceId=${wsId}`).then((r) => r.json()),
          fetch(`/api/timeline?workspaceId=${wsId}`).then((r) => r.json()),
          fetch(`/api/conflicts?workspaceId=${wsId}`).then((r) => r.json()),
          fetch(`/api/decisions?workspaceId=${wsId}`).then((r) => r.json()),
          fetch(`/api/activity?workspaceId=${wsId}`).then((r) => r.json()),
          fetch(`/api/integrations?workspaceId=${wsId}`).then((r) => r.json()),
          fetch(`/api/notifications?workspaceId=${wsId}`).then((r) => r.json()),
        ]);

      setRecords(recsRes || []);
      setFeatures(featsRes || []);
      setEvents(evtsRes || []);
      setConflicts(confsRes || []);
      setDecisions(decsRes || []);
      setActivityLogs(actsRes || []);
      setIntegrations(intsRes || []);
      setNotifications(notifsRes || []);
    } catch (err) {
      console.error('[Workspace] Error refreshing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace) {
      setIsLoading(true);
      refreshData();
    }
  }, [currentWorkspace, refreshData]);

  // 3. Real-Time WebSocket stream connection for instant sync across tabs & operations
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.port === '5173' ? 'localhost:3001' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    let ws: WebSocket | null = null;
    let retryTimer: any = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsLiveConnected(true);
          console.log('[AEVORA Real-Time] Connected to event stream');
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.event) {
              console.log(`[AEVORA Real-Time] Event received: ${data.event}`, data.payload);
              // Refresh active workspace entities
              refreshData();
            }
          } catch (err) {
            // ignore
          }
        };

        ws.onclose = () => {
          setIsLiveConnected(false);
          retryTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setIsLiveConnected(false);
          ws?.close();
        };
      } catch (err) {
        setIsLiveConnected(false);
        retryTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (ws) ws.close();
    };
  }, [refreshData]);

  // 4. SSE Stream for Live Notifications with Backoff Reconnect & Missed Fetch
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectDelay = 1000;
    let reconnectTimer: any = null;

    const fetchMissedNotifications = () => {
      fetch('/api/notifications')
        .then((r) => r.json())
        .then((notifs) => {
          if (Array.isArray(notifs)) {
            setNotifications((prev) => {
              const map = new Map<string, NotificationItem>();
              notifs.forEach((n: any) => {
                map.set(n.id, {
                  id: n.id,
                  workspaceId: currentWorkspace?.id || 'sample-workspace-smart-banking',
                  title: n.title,
                  message: n.body || n.message || '',
                  type: n.kind || 'INTEGRATION',
                  read: Boolean(n.read_at || n.read),
                  timestamp: n.created_at || n.timestamp || new Date().toISOString(),
                  link: n.link || '',
                  needs_reason: n.needs_reason,
                  event_ids: n.event_ids,
                  actor: n.actor,
                });
              });
              prev.forEach((n) => {
                if (!map.has(n.id)) map.set(n.id, n);
              });
              return Array.from(map.values());
            });
          }
        })
        .catch(() => {});
    };

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/stream');

        eventSource.onopen = () => {
          reconnectDelay = 1000;
          fetchMissedNotifications();
        };

        eventSource.addEventListener('notification', (e: MessageEvent) => {
          try {
            const raw = JSON.parse(e.data);
            const notifItem: NotificationItem = {
              id: raw.id,
              workspaceId: currentWorkspace?.id || 'sample-workspace-smart-banking',
              title: raw.title,
              message: raw.body || '',
              type: raw.kind || 'push',
              read: false,
              timestamp: raw.created_at || new Date().toISOString(),
              needs_reason: raw.needs_reason,
              event_ids: raw.event_ids,
              actor: raw.actor,
            };

            setNotifications((prev) => [notifItem, ...prev.filter((n) => n.id !== notifItem.id)]);
            setActiveToastNotification(raw);

            // Optional Desktop Notification if tab not focused
            if (
              localStorage.getItem('evolyra_desktop_notifs') === 'true' &&
              document.hidden &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification(raw.title || 'EVOLYRA Notification', {
                body: raw.body || '',
              });
            }
          } catch (err) {
            console.error('[SSE Notification error]', err);
          }
        });

        eventSource.onerror = () => {
          eventSource?.close();
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            connectSSE();
          }, reconnectDelay);
        };
      } catch {
        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connectSSE();
        }, reconnectDelay);
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) eventSource.close();
    };
  }, [currentWorkspace]);

  // Actions
  const selectWorkspace = (workspaceId: string) => {
    const found = workspaces.find((w) => w.id === workspaceId);
    if (found) {
      setCurrentWorkspace(found);
      localStorage.setItem('aevora_active_ws', found.id);
    }
  };

  const createWorkspace = async (payload: {
    name: string;
    productName: string;
    productDescription?: string;
    teamDetails?: string;
  }): Promise<Workspace> => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, ownerId: user?.id || 'demo-user' }),
    });
    const newWs: Workspace = await res.json();
    setWorkspaces((prev) => [newWs, ...prev]);
    setCurrentWorkspace(newWs);
    localStorage.setItem('aevora_active_ws', newWs.id);
    return newWs;
  };

  const seedSampleData = async () => {
    await fetch('/api/workspaces/seed-sample', { method: 'POST' });
    await loadWorkspaces();
    await refreshData();
  };

  const clearWorkspaceData = async () => {
    if (!currentWorkspace) return;
    await fetch(`/api/workspaces/${currentWorkspace.id}/data`, { method: 'DELETE' });
    await refreshData();
  };

  const uploadFiles = async (
    files: File[] | FileList,
    author = 'Product Team',
    eventDate?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentWorkspace) return { success: false, error: 'No active workspace' };
    const formData = new FormData();
    formData.append('workspaceId', currentWorkspace.id);
    formData.append('author', author);
    if (eventDate) formData.append('eventDate', eventDate);

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/records/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      await refreshData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const reExtractRecord = async (recordId: string) => {
    try {
      const res = await fetch(`/api/records/${recordId}/re-extract`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Re-extraction failed');
      await refreshData();
      return { success: true, count: data.count };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteRecord = async (recordId: string): Promise<boolean> => {
    if (!currentWorkspace) return false;
    const res = await fetch(`/api/records/${recordId}?workspaceId=${currentWorkspace.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await refreshData();
      return true;
    }
    return false;
  };

  const createFeature = async (data: Partial<Feature>): Promise<Feature> => {
    if (!currentWorkspace) throw new Error('No workspace selected');
    const res = await fetch('/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, workspaceId: currentWorkspace.id }),
    });
    const created = await res.json();
    await refreshData();
    return created;
  };

  const updateFeature = async (id: string, data: Partial<Feature>): Promise<Feature> => {
    const res = await fetch(`/api/features/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    await refreshData();
    return updated;
  };

  const resolveConflict = async (id: string, resolutionNote: string, resolvedBy: string) => {
    if (!currentWorkspace) return;
    await fetch(`/api/conflicts/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolutionNote, resolvedBy, workspaceId: currentWorkspace.id }),
    });
    await refreshData();
  };

  const reviewConflict = async (id: string) => {
    if (!currentWorkspace) return;
    await fetch(`/api/conflicts/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: currentWorkspace.id }),
    });
    await refreshData();
  };

  const askAI = async (question: string): Promise<AIChatMessage> => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || "I couldn't reach the history service. Please try again.");
    }
    const data = await res.json();
    return {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: data.reply || data.content || '',
      timestamp: new Date().toISOString(),
      intent: data.intent,
      reply: data.reply,
      example_questions: data.example_questions || [],
      chatCitations: data.citations || [],
      navigation: data.navigation,
      no_record_found: data.no_record_found,
      structuredAnswer: data.structuredAnswer,
    };
  };

  const markNotificationRead = async (id: string) => {
    if (!currentWorkspace) return;
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: currentWorkspace.id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = async () => {
    if (!currentWorkspace) return;
    await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: currentWorkspace.id }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const simulateDemoEvent = async (): Promise<{ success: boolean; message: string }> => {
    const wsId = currentWorkspace ? currentWorkspace.id : 'sample-workspace-smart-banking';
    const res = await fetch('/api/demo/simulate-otp-modification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId }),
    });
    const data = await res.json();
    await refreshData();
    return data;
  };

  // Calculated Stats
  const stats: WorkspaceStats = {
    totalRecords: records.length,
    totalFeatures: features.length,
    totalEvents: events.length,
    recentlyModifiedFeatures: features.filter(
      (f) => f.currentStatus === 'MODIFIED' || f.currentStatus === 'IN_PROGRESS'
    ).length || Math.min(features.length, 2),
    approvedDecisions: decisions.filter(
      (d) => d.status === 'APPROVED' || d.status === 'RESOLVED'
    ).length,
    implementedFeatures: features.filter((f) => f.currentStatus === 'IMPLEMENTED').length,
    openConflicts: conflicts.filter((c) => c.status === 'OPEN').length,
    activeIntegrations: integrations.filter((i) => i.isConnected).length,
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        records,
        features,
        events,
        conflicts,
        decisions,
        activityLogs,
        integrations,
        notifications,
        stats,
        unreadNotificationCount,
        isLiveConnected,
        isLoading,
        selectWorkspace,
        createWorkspace,
        seedSampleData,
        clearWorkspaceData,
        uploadFiles,
        reExtractRecord,
        deleteRecord,
        createFeature,
        updateFeature,
        resolveConflict,
        reviewConflict,
        askAI,
        markNotificationRead,
        markAllNotificationsRead,
        simulateDemoEvent,
        refreshData,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
};
