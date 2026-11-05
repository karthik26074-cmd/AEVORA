import { Router, Request, Response } from 'express';
import { githubService, GitHubApiError } from '../services/githubService.js';
import { requireFirebaseAuth } from '../services/firebaseAdmin.js';

const router = Router();

// Enforce verified Firebase ID token authentication across all GitHub routes.
// The user is taken ONLY from the verified token, never from query parameters, body, or headers.
router.use(requireFirebaseAuth);

// POST /api/github/connect - Store encrypted token and link account
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const activeUserId = req.user!.uid;
    const { token, workspaceId } = req.body;
    const activeWorkspaceId = workspaceId || 'default-workspace';

    if (!token) {
      return res.status(400).json({ error: 'GitHub access token is required' });
    }

    const result = await githubService.connectToken(activeUserId, activeWorkspaceId, token);
    return res.json(result);
  } catch (err: any) {
    const status = err instanceof GitHubApiError ? err.statusCode : 400;
    return res.status(status).json({
      error: err.message || 'Failed to connect GitHub account',
      code: err.code || 'CONNECT_FAILED',
    });
  }
});

// GET /api/github/status - Check connection status
router.get('/status', (req: Request, res: Response) => {
  try {
    const activeUserId = req.user!.uid;
    console.log(`[API /github/status] Received request for activeUserId: ${activeUserId}`);
    const status = githubService.getStatus(activeUserId);
    console.log(`[API /github/status] Status result:`, JSON.stringify(status));
    return res.json(status);
  } catch (err: any) {
    console.error(`[API /github/status] Error:`, err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/github/disconnect - Remove stored token
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const activeUserId = req.user!.uid;
    const result = await githubService.disconnect(activeUserId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/github/repos - Fetch user repositories from GitHub
router.get('/repos', async (req: Request, res: Response) => {
  try {
    const activeUserId = req.user!.uid;
    const result = await githubService.getUserRepos(activeUserId);
    return res.json(result);
  } catch (err: any) {
    const status = err instanceof GitHubApiError ? err.statusCode : (err.statusCode || 400);
    return res.status(status).json({
      error: err.message || 'Failed to fetch repositories',
      code: err.code || (status === 401 ? 'RECONNECT_REQUIRED' : 'GITHUB_ERROR'),
    });
  }
});

// POST /api/github/track - Track repository and configure webhook
router.post('/track', async (req: Request, res: Response) => {
  try {
    const activeUserId = req.user!.uid;
    const { repo_full_name, workspaceId } = req.body;
    const activeWorkspaceId = workspaceId || 'default-workspace';

    if (!repo_full_name) {
      return res.status(400).json({ error: 'repo_full_name is required' });
    }

    const result = await githubService.trackRepo(activeUserId, activeWorkspaceId, repo_full_name);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to track repository' });
  }
});

// POST /api/github/untrack - Stop tracking repository
router.post('/untrack', async (req: Request, res: Response) => {
  try {
    const activeUserId = req.user!.uid;
    const { repo_full_name } = req.body;

    if (!repo_full_name) {
      return res.status(400).json({ error: 'repo_full_name is required' });
    }

    const result = await githubService.untrackRepo(activeUserId, repo_full_name);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to untrack repository' });
  }
});

// POST /api/github/sync - Force sync recent commits & issues
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const activeUserId = req.user!.uid;
    const { repo_full_name, workspaceId } = req.body;
    const activeWorkspaceId = workspaceId || 'default-workspace';

    if (!repo_full_name) {
      return res.status(400).json({ error: 'repo_full_name is required' });
    }

    const count = await githubService.syncRepo(activeUserId, activeWorkspaceId, repo_full_name);
    return res.json({ success: true, repo: repo_full_name, synced_events: count });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to sync repository' });
  }
});

// POST /api/github/track-all - Track all user repositories
router.post('/track-all', async (req: Request, res: Response) => {
  try {
    const activeUserId = req.user!.uid;
    const { workspaceId } = req.body;
    const result = await githubService.trackAllRepos(activeUserId, workspaceId);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to track all repositories' });
  }
});

export default router;
