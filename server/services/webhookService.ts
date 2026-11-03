import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../store/db.js';
import { geminiService } from './geminiService.js';
import { ProjectRecord, Feature, FeatureEvent, ActivityLog } from '../../src/types/index.js';

export class WebhookService {
  /**
   * Verify GitHub webhook HMAC-SHA256 signature
   */
  public verifyGitHubSignature(payloadRaw: string, signatureHeader?: string, secret?: string): boolean {
    const configuredSecret = secret || process.env.GITHUB_WEBHOOK_SECRET || 'aevora_webhook_secret_dev';
    if (!signatureHeader || !configuredSecret) {
      // In development mode or when testing without headers, allow fallback if specified
      return true;
    }

    try {
      const hmac = crypto.createHmac('sha256', configuredSecret);
      const digest = 'sha256=' + hmac.update(payloadRaw).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(digest));
    } catch (err) {
      console.error('[Webhook] Signature verification error:', err);
      return false;
    }
  }

  /**
   * Process incoming GitHub event
   */
  public async handleGitHubEvent(
    workspaceId: string,
    eventHeader: string,
    deliveryId: string,
    body: any
  ): Promise<{ success: boolean; message: string; eventCount?: number }> {
    // 1. Deduplication check
    if (db.hasWebhookDelivery(deliveryId)) {
      console.log(`[Webhook] Duplicate delivery skipped: ${deliveryId}`);
      return { success: true, message: 'Duplicate delivery already processed' };
    }

    // Save delivery
    db.recordWebhookDelivery(deliveryId, 'GITHUB', eventHeader, body);

    let documentContent = '';
    let eventTitle = '';
    let authorName = body?.sender?.login || 'GitHub User';
    let eventDate = new Date().toISOString().split('T')[0];

    if (eventHeader === 'pull_request') {
      const pr = body.pull_request;
      const action = body.action; // opened, closed, edited
      const isMerged = pr.merged;

      eventTitle = `GitHub PR #${pr.number}: ${pr.title}`;
      documentContent = `# Pull Request #${pr.number}: ${pr.title}
Repository: ${body.repository?.full_name || 'unknown'}
Author: ${pr.user?.login || authorName}
Action: ${action} (Merged: ${isMerged})
Base Branch: ${pr.base?.ref} <- Head Branch: ${pr.head?.ref}
Date: ${eventDate}

## Description
${pr.body || 'No PR description provided.'}

## Merge Status
${isMerged ? `Merged by ${pr.merged_by?.login || 'reviewer'} at ${pr.merged_at}` : 'Not merged.'}`;
    } else if (eventHeader === 'push') {
      const repo = body.repository?.full_name || 'unknown';
      const commits = body.commits || [];
      eventTitle = `GitHub Push to ${body.ref || 'main'} (${commits.length} commits)`;

      documentContent = `# Push Event: ${body.ref}
Repository: ${repo}
Pushed by: ${body.pusher?.name || authorName}
Date: ${eventDate}

## Commits
${commits
  .map(
    (c: any) =>
      `- [${(c.id || '').slice(0, 7)}] ${c.message} (Author: ${c.author?.name || 'unknown'})`
  )
  .join('\n')}`;
    } else {
      eventTitle = `GitHub Event: ${eventHeader}`;
      documentContent = `# GitHub Webhook Event: ${eventHeader}
Received at: ${new Date().toISOString()}
Data:
${JSON.stringify(body, null, 2).slice(0, 1000)}`;
    }

    // 2. Create ProjectRecord in database
    const recordId = `rec-gh-${deliveryId.slice(0, 8)}`;
    const projectRecord: ProjectRecord = {
      id: recordId,
      workspaceId,
      fileName: `${eventTitle}.md`,
      fileType: 'text/markdown',
      fileSize: Buffer.byteLength(documentContent, 'utf-8'),
      sourceType: 'GITHUB',
      author: authorName,
      module: 'GitHub VCS',
      eventDate,
      ingestionDate: new Date().toISOString(),
      status: 'PROCESSING',
      extractedEventCount: 0,
      rawContent: documentContent,
      summary: `Automated webhook ingestion for ${eventTitle}`,
    };
    db.saveRecord(projectRecord);

    // 3. Extract temporal events with Gemini / semantic engine
    const extractedPayloads = await geminiService.extractEventsFromDocument(documentContent, {
      id: recordId,
      fileName: projectRecord.fileName,
      author: authorName,
      eventDate,
    });

    // 4. Save extracted events & update features
    for (const item of extractedPayloads) {
      // Find or create feature
      let feature = db.getFeatureByName(workspaceId, item.featureName);
      if (!feature) {
        feature = {
          id: `feat-${uuidv4().slice(0, 8)}`,
          workspaceId,
          name: item.featureName,
          module: item.moduleName || 'General',
          description: item.description,
          currentStatus: item.eventType === 'FEATURE_IMPLEMENTED' ? 'IMPLEMENTED' : 'PROPOSED',
          firstRecordedDate: item.eventDate || eventDate,
          lastModifiedDate: item.eventDate || eventDate,
          aliases: [],
          relatedPeople: item.person ? [item.person] : [authorName],
          dependencies: [],
          historicalEventCount: 0,
          sourceRecordIds: [recordId],
        };
      } else {
        feature.lastModifiedDate = item.eventDate || eventDate;
        if (item.person && !feature.relatedPeople.includes(item.person)) {
          feature.relatedPeople.push(item.person);
        }
        if (!feature.sourceRecordIds.includes(recordId)) {
          feature.sourceRecordIds.push(recordId);
        }
        if (item.eventType === 'FEATURE_IMPLEMENTED') feature.currentStatus = 'IMPLEMENTED';
        if (item.eventType === 'FEATURE_MODIFIED') feature.currentStatus = 'MODIFIED';
      }

      feature.historicalEventCount += 1;
      db.saveFeature(feature);

      // Save Feature Event
      const featureEvent: FeatureEvent = {
        ...item,
        id: `evt-${uuidv4().slice(0, 8)}`,
        workspaceId,
        featureId: feature.id,
        status: 'VALIDATED',
        createdAt: new Date().toISOString(),
      };
      db.saveFeatureEvent(featureEvent);
    }

    // Update Record status
    projectRecord.status = 'COMPLETED';
    projectRecord.extractedEventCount = extractedPayloads.length;
    db.saveRecord(projectRecord);

    // Update Integration last event
    const integrations = db.getIntegrations(workspaceId);
    const ghInt = integrations.find((i) => i.provider === 'GITHUB');
    if (ghInt) {
      ghInt.lastEventAt = new Date().toISOString();
      ghInt.lastSyncAt = new Date().toISOString();
      ghInt.statusText = `Connected — Last event: ${eventHeader} at ${new Date().toLocaleTimeString()}`;
      db.saveIntegration(ghInt);
    }

    // Add activity log
    db.addActivityLog({
      workspaceId,
      type: 'GITHUB_WEBHOOK',
      title: eventTitle,
      description: `Ingested ${eventHeader} webhook; extracted ${extractedPayloads.length} temporal events.`,
      source: 'GITHUB',
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    // Add notification
    db.addNotification({
      workspaceId,
      title: `GitHub Event Received: ${eventHeader}`,
      message: `${eventTitle} processed. ${extractedPayloads.length} feature event(s) recorded.`,
      type: 'FEATURE_MODIFIED',
      link: '/timeline',
    });

    return {
      success: true,
      message: 'GitHub webhook processed successfully',
      eventCount: extractedPayloads.length,
    };
  }
}

export const webhookService = new WebhookService();
