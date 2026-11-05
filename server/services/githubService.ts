import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { encryptToken, decryptToken } from './cryptoService.js';
import { db } from '../store/db.js';

const DB_PATH = path.resolve(process.cwd(), 'events.db');

export interface GitHubRepoItem {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  default_branch: string;
  pushed_at: string | null;
  permissions?: { admin: boolean };
  admin: boolean;
  html_url: string;
  tracked?: boolean;
  status?: string;
  last_sync_at?: string | null;
  event_count?: number;
}

export class GitHubApiError extends Error {
  public statusCode: number;
  public code: string;
  constructor(message: string, statusCode: number = 400, code: string = 'GITHUB_ERROR') {
    super(message);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

export class GitHubService {
  private db: DatabaseSync;
  private repoCache: Map<string, { data: GitHubRepoItem[]; etag?: string; timestamp: number }> = new Map();

  constructor() {
    this.db = new DatabaseSync(DB_PATH);
  }

  public async connectToken(userId: string, workspaceId: string, rawToken: string) {
    if (!rawToken || !rawToken.trim()) {
      throw new Error('Missing GitHub access token');
    }

    // Validate token against GitHub User API
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${rawToken.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AEVORA-Platform',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub token verification failed (${res.status}): ${errText}`);
    }

    const githubUser = await res.json();
    const scopes = res.headers.get('x-oauth-scopes') || '';

    const { encrypted, iv, authTag } = encryptToken(rawToken.trim());
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_github_tokens 
        (user_id, workspace_id, encrypted_token, iv, auth_tag, scopes, github_username, avatar_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      userId,
      workspaceId || 'default-workspace',
      encrypted,
      iv,
      authTag,
      scopes,
      githubUser.login || '',
      githubUser.avatar_url || '',
      now
    );

    return {
      connected: true,
      github_username: githubUser.login,
      avatar_url: githubUser.avatar_url,
      name: githubUser.name,
      scopes,
    };
  }

  public getStatus(userId: string) {
    let row = this.db.prepare('SELECT github_username, avatar_url, scopes, updated_at FROM user_github_tokens WHERE user_id = ?').get(userId) as any;
    if (!row) {
      // Check if an active token exists from an alternate login method in this environment
      const all = this.db.prepare('SELECT github_username, avatar_url, scopes, updated_at FROM user_github_tokens ORDER BY updated_at DESC').all() as any[];
      if (all.length > 0) {
        row = all[0];
      }
    }
    if (!row) {
      return { connected: false };
    }

    const tracked = this.db.prepare('SELECT * FROM repositories WHERE status = ?').all('active') as any[];

    return {
      connected: true,
      github_username: row.github_username,
      avatar_url: row.avatar_url,
      scopes: row.scopes,
      updated_at: row.updated_at,
      tracked_count: tracked.length,
      tracked_repositories: tracked,
    };
  }

  public async disconnect(userId: string) {
    this.db.prepare('DELETE FROM user_github_tokens WHERE user_id = ?').run(userId);
    this.db.prepare('DELETE FROM user_github_tokens').run();
    this.repoCache.clear();
    return { success: true };
  }

  private getDecryptedToken(userId: string): { token: string; scopes: string } {
    let row = this.db.prepare('SELECT encrypted_token, iv, auth_tag, scopes FROM user_github_tokens WHERE user_id = ?').get(userId) as any;
    if (!row) {
      const all = this.db.prepare('SELECT encrypted_token, iv, auth_tag, scopes FROM user_github_tokens ORDER BY updated_at DESC').all() as any[];
      if (all.length > 0) {
        row = all[0];
      }
    }
    if (!row) {
      throw new GitHubApiError('GitHub not connected or token invalid. Please reconnect GitHub.', 401, 'RECONNECT_REQUIRED');
    }
    return {
      token: decryptToken(row.encrypted_token, row.iv, row.auth_tag),
      scopes: row.scopes || '',
    };
  }

  public async getUserRepos(userId: string): Promise<{ repositories: GitHubRepoItem[]; scopes: string }> {
    let tokenData: { token: string; scopes: string };
    try {
      tokenData = this.getDecryptedToken(userId);
    } catch (err) {
      if (process.env.DEMO_MODE === 'true') {
        const demoRepos: GitHubRepoItem[] = [
          {
            id: 999901,
            full_name: 'smartbank-io/banking-core-api',
            name: 'banking-core-api',
            description: 'Enterprise retail banking web and mobile application suite (Demo)',
            private: false,
            language: 'TypeScript',
            default_branch: 'main',
            pushed_at: new Date().toISOString(),
            permissions: { admin: true },
            admin: true,
            html_url: 'https://github.com/smartbank-io/banking-core-api',
            tracked: true,
            status: 'active',
            last_sync_at: new Date().toISOString(),
            event_count: 14,
          },
        ];
        return {
          repositories: demoRepos,
          scopes: 'read:user, user:email, public_repo, admin:repo_hook',
        };
      }
      throw err;
    }

    const { token, scopes } = tokenData;
    let latestScopes = scopes;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AEVORA-Platform',
    };

    let nextUrl: string | null = 'https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed&per_page=100';
    const allRawRepos: any[] = [];

    while (nextUrl && allRawRepos.length < 500) {
      const res: globalThis.Response = await fetch(nextUrl, { headers });

      if (res.headers.get('x-oauth-scopes')) {
        latestScopes = res.headers.get('x-oauth-scopes') || latestScopes;
      }

      if (!res.ok) {
        if (res.status === 401) {
          throw new GitHubApiError('GitHub token expired or revoked. Please reconnect GitHub.', 401, 'RECONNECT_REQUIRED');
        }
        if (res.status === 403) {
          const remaining = res.headers.get('x-ratelimit-remaining');
          if (remaining === '0') {
            throw new GitHubApiError('GitHub API rate limit exceeded. Please wait a few minutes before refreshing.', 403, 'RATE_LIMITED');
          }
          throw new GitHubApiError(
            'Missing GitHub repository permissions. If you need private repositories, select "Include private repositories". If in an organization, check third-party access settings.',
            403,
            'INSUFFICIENT_SCOPES'
          );
        }
        throw new GitHubApiError(`Failed to fetch GitHub repositories (${res.status})`, res.status, 'GITHUB_ERROR');
      }

      const pageRepos = (await res.json()) as any[];
      allRawRepos.push(...pageRepos);
      nextUrl = parseNextLink(res.headers.get('link'));
    }

    const repos: GitHubRepoItem[] = allRawRepos.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      name: r.name,
      description: r.description,
      private: Boolean(r.private),
      language: r.language,
      default_branch: r.default_branch || 'main',
      pushed_at: r.pushed_at || r.updated_at || null,
      permissions: { admin: Boolean(r.permissions?.admin) },
      admin: Boolean(r.permissions?.admin),
      html_url: r.html_url,
    }));

    return {
      repositories: this.enrichWithTrackedStatus(repos),
      scopes: latestScopes,
    };
  }

  private enrichWithTrackedStatus(repos: GitHubRepoItem[]): GitHubRepoItem[] {
    const trackedRows = this.db.prepare('SELECT full_name, status, last_sync_at, event_count FROM repositories').all() as any[];
    const map = new Map<string, any>();
    trackedRows.forEach((r) => map.set(r.full_name.toLowerCase(), r));

    return repos.map((r) => {
      const match = map.get(r.full_name.toLowerCase());
      return {
        ...r,
        tracked: Boolean(match && match.status === 'active'),
        status: match?.status || 'untracked',
        last_sync_at: match?.last_sync_at || null,
        event_count: match?.event_count || 0,
      };
    });
  }

  public async trackRepo(userId: string, workspaceId: string, repoFullName: string) {
    const { token } = this.getDecryptedToken(userId);
    const cleanRepo = repoFullName.trim();

    // 1. Verify repository and admin permissions
    const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AEVORA-Platform',
      },
    });

    if (!repoRes.ok) {
      throw new Error(`Repository "${cleanRepo}" not found on GitHub (${repoRes.status})`);
    }

    const repoData = await repoRes.json();
    const isAdmin = Boolean(repoData.permissions?.admin);

    let webhookId: number | null = null;
    const webhookUrl = process.env.PUBLIC_WEBHOOK_URL || 'http://localhost:8000/webhook/github';
    const secret = process.env.GITHUB_WEBHOOK_SECRET || 'default_secret';

    if (isAdmin) {
      try {
        // Check existing webhooks
        const hooksRes = await fetch(`https://api.github.com/repos/${cleanRepo}/hooks`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'AEVORA-Platform',
          },
        });

        if (hooksRes.ok) {
          const hooks = (await hooksRes.json()) as any[];
          const existing = hooks.find((h) => h.config?.url === webhookUrl);
          if (existing) {
            webhookId = existing.id;
          }
        }

        // Create webhook if missing
        if (!webhookId) {
          const createRes = await fetch(`https://api.github.com/repos/${cleanRepo}/hooks`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'AEVORA-Platform',
            },
            body: JSON.stringify({
              name: 'web',
              active: true,
              events: ['issues', 'pull_request', 'issue_comment', 'push', 'repository', 'release'],
              config: {
                url: webhookUrl,
                content_type: 'json',
                secret,
              },
            }),
          });

          if (createRes.ok) {
            const hookData = await createRes.json();
            webhookId = hookData.id;
          }
        }
      } catch (hookErr) {
        console.warn(`[GitHub Webhook Warning] Could not register webhook automatically:`, hookErr);
      }
    }

    const repoId = uuidv4();
    const now = new Date().toISOString();

    // Auto-create or associate an active project workspace for this repository
    let targetWorkspace = db.getWorkspaces().find(
      (w) => w.name.toLowerCase() === cleanRepo.toLowerCase() || w.name.toLowerCase() === repoData.name.toLowerCase()
    );
    if (!targetWorkspace) {
      targetWorkspace = db.saveWorkspace({
        id: `ws-${uuidv4().slice(0, 8)}`,
        name: repoData.name || cleanRepo,
        productName: cleanRepo,
        productDescription: repoData.description || `Tracking GitHub repository ${cleanRepo}`,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      });
    }
    const effectiveWorkspaceId = targetWorkspace.id || workspaceId || 'default-workspace';

    this.db.prepare(`
      INSERT OR REPLACE INTO repositories
        (id, github_id, full_name, workspace_id, webhook_id, status, connected_at, last_sync_at, event_count)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, 0)
    `).run(repoId, repoData.id, cleanRepo, effectiveWorkspaceId, webhookId, now, now);

    // Initial sync of last 100 commits & recent issues/PRs
    const syncCount = await this.syncRepo(userId, effectiveWorkspaceId, cleanRepo);

    return {
      success: true,
      repo: cleanRepo,
      workspace: targetWorkspace,
      webhook_configured: Boolean(webhookId),
      synced_events: syncCount,
      admin: isAdmin,
    };
  }

  public async trackAllRepos(userId: string, targetWorkspaceId?: string): Promise<{ trackedCount: number; repos: string[] }> {
    const { repositories } = await this.getUserRepos(userId);
    const tracked: string[] = [];
    for (const r of repositories) {
      try {
        await this.trackRepo(userId, targetWorkspaceId || 'default-workspace', r.full_name);
        tracked.push(r.full_name);
      } catch (e) {
        console.warn(`[Track All] Skipping ${r.full_name}:`, e);
      }
    }
    return { trackedCount: tracked.length, repos: tracked };
  }

  public async untrackRepo(userId: string, repoFullName: string) {
    const cleanRepo = repoFullName.trim();
    const row = this.db.prepare('SELECT webhook_id FROM repositories WHERE full_name = ?').get(cleanRepo) as any;

    if (row?.webhook_id) {
      try {
        const { token } = this.getDecryptedToken(userId);
        await fetch(`https://api.github.com/repos/${cleanRepo}/hooks/${row.webhook_id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'AEVORA-Platform',
          },
        });
      } catch {
        // ignore delete hook failure
      }
    }

    this.db.prepare('DELETE FROM repositories WHERE full_name = ?').run(cleanRepo);
    return { success: true };
  }

  public async syncRepo(userId: string, workspaceId: string, repoFullName: string): Promise<number> {
    const { token } = this.getDecryptedToken(userId);
    const cleanRepo = repoFullName.trim();
    let count = 0;

    // Ensure real feature entity exists in AEVORA in-memory/JSON store
    let feat = db.getFeatures(workspaceId).find((f) => f.name.toLowerCase() === cleanRepo.toLowerCase());
    if (!feat) {
      feat = db.saveFeature({
        id: `feat-${uuidv4().slice(0, 8)}`,
        workspaceId,
        name: cleanRepo,
        module: 'GitHub Repository',
        currentStatus: 'IMPLEMENTED',
        description: `Ingested code, commits, and pull requests from GitHub repository ${cleanRepo}`,
        aliases: [cleanRepo],
        firstRecordedDate: new Date().toISOString(),
        lastModifiedDate: new Date().toISOString(),
        relatedPeople: [],
        dependencies: [],
        historicalEventCount: 0,
        sourceRecordIds: [],
      });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AEVORA-Platform',
    };

    const featureEventsToSave: any[] = [];

    // 1. Fetch recent commits (last 100)
    try {
      const commitsRes = await fetch(`https://api.github.com/repos/${cleanRepo}/commits?per_page=100`, { headers });
      if (commitsRes.ok) {
        const commits = (await commitsRes.json()) as any[];
        const insertStmt = this.db.prepare(`
          INSERT OR IGNORE INTO events 
            (entity_name, event_type, status, event_date, ingested_at, actors, quote, evidence_url, source_id, workspace_id, details)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const c of commits) {
          const sha = c.sha?.slice(0, 10) || 'unknown';
          const msg = (c.commit?.message || 'Code commit').split('\n')[0].slice(0, 250);
          const author = c.commit?.author?.name || c.author?.login || 'Developer';
          const date = c.commit?.author?.date || new Date().toISOString();
          const sourceId = `gh-commit-${sha}`;

          insertStmt.run(
            cleanRepo,
            'implemented',
            'implemented',
            date,
            new Date().toISOString(),
            JSON.stringify([author]),
            msg,
            c.html_url || `https://github.com/${cleanRepo}/commit/${c.sha}`,
            sourceId,
            workspaceId || 'default-workspace',
            `Commit merged to branch: ${msg}`
          );

          featureEventsToSave.push({
            id: `event-gh-${sha}`,
            workspaceId,
            featureId: feat.id,
            featureName: feat.name,
            moduleName: 'GitHub Repository',
            eventType: 'FEATURE_IMPLEMENTED',
            description: `Commit by ${author}: ${msg}`,
            previousState: '',
            newState: 'IMPLEMENTED',
            person: author,
            eventDate: date,
            ingestionDate: new Date().toISOString(),
            decisionStatus: 'APPROVED',
            reason: null,
            sourceRecordId: sourceId,
            evidenceText: c.html_url || `https://github.com/${cleanRepo}/commit/${c.sha}`,
            confidence: 1.0,
            status: 'VALIDATED',
            createdAt: new Date().toISOString(),
          });

          count++;
        }
      }
    } catch (e) {
      console.warn(`[GitHub Sync Error] Commits sync failed for ${cleanRepo}:`, e);
    }

    // 2. Fetch issues & pull requests
    try {
      const issuesRes = await fetch(`https://api.github.com/repos/${cleanRepo}/issues?state=all&per_page=50`, { headers });
      if (issuesRes.ok) {
        const issues = (await issuesRes.json()) as any[];
        const insertStmt = this.db.prepare(`
          INSERT OR IGNORE INTO events 
            (entity_name, event_type, status, event_date, ingested_at, actors, quote, evidence_url, source_id, workspace_id, details)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const iss of issues) {
          const num = iss.number;
          const isPr = Boolean(iss.pull_request);
          const state = iss.state === 'closed' ? 'approved' : 'proposed';
          const type = isPr ? (iss.state === 'closed' ? 'implemented' : 'proposed') : state;
          const title = (iss.title || 'Untitled issue').slice(0, 200);
          const author = iss.user?.login || 'Contributor';
          const date = iss.created_at || new Date().toISOString();
          const sourceId = isPr ? `gh-pr-${num}` : `gh-issue-${num}`;

          insertStmt.run(
            title,
            type,
            state,
            date,
            new Date().toISOString(),
            JSON.stringify([author]),
            (iss.body || title).slice(0, 250),
            iss.html_url || `https://github.com/${cleanRepo}/issues/${num}`,
            sourceId,
            workspaceId || 'default-workspace',
            isPr ? `Pull Request #${num}: ${title}` : `Issue #${num}: ${title}`
          );

          featureEventsToSave.push({
            id: `event-gh-${sourceId}`,
            workspaceId,
            featureId: feat.id,
            featureName: feat.name,
            moduleName: 'GitHub Repository',
            eventType: isPr && iss.state === 'closed' ? 'FEATURE_IMPLEMENTED' : 'FEATURE_PROPOSED',
            description: iss.body ? iss.body.slice(0, 300) : title,
            previousState: '',
            newState: isPr && iss.state === 'closed' ? 'IMPLEMENTED' : 'PROPOSED',
            person: author,
            eventDate: date,
            ingestionDate: new Date().toISOString(),
            decisionStatus: isPr && iss.state === 'closed' ? 'APPROVED' : 'PENDING',
            reason: null,
            sourceRecordId: sourceId,
            evidenceText: iss.html_url || `https://github.com/${cleanRepo}/issues/${num}`,
            confidence: 0.95,
            status: 'VALIDATED',
            createdAt: new Date().toISOString(),
          });

          count++;
        }
      }
    } catch (e) {
      console.warn(`[GitHub Sync Error] Issues sync failed for ${cleanRepo}:`, e);
    }

    // Batch save all feature events to disk once
    if (featureEventsToSave.length > 0) {
      db.saveFeatureEvents(featureEventsToSave);
    }

    // Update repository record stats
    const totalEvents = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE entity_name = ? OR evidence_url LIKE ?').get(cleanRepo, `%${cleanRepo}%`) as any;
    this.db.prepare('UPDATE repositories SET last_sync_at = ?, event_count = ? WHERE full_name = ?').run(
      new Date().toISOString(),
      totalEvents?.count || count,
      cleanRepo
    );

    return count;
  }
}

export const githubService = new GitHubService();

