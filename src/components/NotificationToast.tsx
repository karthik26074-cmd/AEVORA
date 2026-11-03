import React, { useState, useEffect } from 'react';
import { ExternalLink, X, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { EvolyraNotification } from '../types';

interface NotificationToastProps {
  notification: EvolyraNotification | null;
  onDismiss: () => void;
  onSaveReason: (sourceId: string, reason: string) => Promise<boolean>;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onSaveReason,
}) => {
  const [reasonInput, setReasonInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const needsReason = notification ? Boolean(notification.needs_reason) : false;

  // Auto-dismiss after 8s ONLY IF needs_reason is false
  useEffect(() => {
    if (!notification || needsReason) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);

    return () => clearTimeout(timer);
  }, [notification, needsReason, onDismiss]);

  // Reset state when new notification appears
  useEffect(() => {
    setReasonInput('');
    setSaveSuccess(false);
    setErrorMsg(null);
  }, [notification?.id]);

  if (!notification) return null;

  const actorInitials = (notification.actor || 'GH')
    .slice(0, 2)
    .toUpperCase();

  const charCount = reasonInput.trim().length;
  const isReasonValid = charCount >= 10 && charCount <= 500;

  const handleSave = async () => {
    if (!isReasonValid || isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);

    const targetSourceId =
      notification.event_ids && notification.event_ids.length > 0
        ? notification.event_ids[0]
        : notification.id;

    try {
      const ok = await onSaveReason(targetSourceId, reasonInput.trim());
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => {
          onDismiss();
        }, 1500);
      } else {
        setErrorMsg('Failed to save reason. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording reason.');
    } finally {
      setIsSaving(false);
    }
  };

  const commitLink =
    notification.commit_url ||
    notification.compare_url ||
    (notification.repo ? `https://github.com/${notification.repo}` : null);

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-full p-4 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-elevated transform transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none"
    >
      {/* Toast Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar / Initials */}
          <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {actorInitials}
          </div>
          <div>
            <h4 className="text-xs font-bold text-brand-dark dark:text-white leading-tight">
              {notification.title}
            </h4>
            <span className="text-[10px] text-brand-secondary font-mono">
              Just now • {notification.repo || 'Repository'}
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="text-brand-secondary hover:text-brand-dark dark:hover:text-white p-1 rounded-lg transition-colors"
          title="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>

      {/* First commit message / Body */}
      {notification.body && (
        <p className="text-xs text-brand-text/90 dark:text-gray-300 font-mono mt-2 pl-1 bg-brand-bg/50 dark:bg-brand-dark/50 p-2 rounded-xl border border-brand-border/40 truncate">
          "{notification.body}"
        </p>
      )}

      {/* Commit / Compare External Link */}
      {commitLink && (
        <div className="mt-2 text-right">
          <a
            href={commitLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary hover:underline"
          >
            <span>View on GitHub</span>
            <ExternalLink size={11} />
          </a>
        </div>
      )}

      {/* Inline Reason Capture Prompt */}
      {needsReason && !saveSuccess && (
        <div className="mt-3 pt-3 border-t border-brand-border/60 dark:border-brand-dark-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              Why was this changed?
            </label>
            <span
              className={`text-[10px] font-mono ${
                charCount > 0 && !isReasonValid
                  ? 'text-rose-500 font-bold'
                  : 'text-brand-secondary'
              }`}
            >
              {charCount} / 500
            </span>
          </div>

          <textarea
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            placeholder="e.g. Fixes the login timeout reported in #12"
            rows={2}
            className="w-full text-xs p-2.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-brand-dark dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
          />

          {errorMsg && (
            <div className="flex items-center gap-1 text-[11px] text-rose-500">
              <AlertCircle size={12} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl text-brand-secondary hover:text-brand-dark dark:hover:text-white transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isReasonValid || isSaving}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-brand-primary text-white hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
            >
              <Send size={12} />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Success Notification State */}
      {saveSuccess && (
        <div className="mt-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
          <CheckCircle2 size={14} />
          <span>Saved to history</span>
        </div>
      )}
    </div>
  );
};

