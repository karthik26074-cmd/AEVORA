import React from 'react';
import { ArrowUpRight, AlignLeft } from 'lucide-react';
import { FeatureEvent, ProjectRecord } from '../types';

interface HistoryItem {
  id: string;
  date: string;
  action: 'Introduced' | 'Removed' | 'Renamed' | 'Modified' | 'Approved';
  status: 'implemented' | 'proposed' | 'rejected' | 'approved';
  quote: string;
  sourceId: string;
  sourceType: string;
}



interface RecentProjectHistoryProps {
  events?: FeatureEvent[];
  records?: ProjectRecord[];
  onViewFullTimeline: () => void;
}

export const RecentProjectHistory: React.FC<RecentProjectHistoryProps> = ({
  events = [],
  records = [],
  onViewFullTimeline,
}) => {
  // Convert real workspace events into history items
  const dynamicItems: HistoryItem[] = events
    .filter((e) => e && (e.description || e.featureName || e.evidenceText))
    .slice()
    .sort((a, b) => {
      const timeB = b.createdAt || b.ingestionDate || b.eventDate || '';
      const timeA = a.createdAt || a.ingestionDate || a.eventDate || '';
      return timeB.localeCompare(timeA);
    })
    .slice(0, 10)
    .map((e, idx) => {
      // Format date e.g. "Today" or "Oct 24"
      let formattedDate = 'Recent';
      if (e.eventDate || e.createdAt || e.ingestionDate) {
        const rawDate = e.eventDate || e.createdAt || e.ingestionDate || '';
        try {
          const dateOnly = rawDate.split('T')[0];
          const todayStr = new Date().toISOString().split('T')[0];
          if (dateOnly === todayStr) {
            formattedDate = 'Today';
          } else {
            const d = new Date(rawDate.includes('T') ? rawDate : `${rawDate}T12:00:00Z`);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
              formattedDate = dateOnly.slice(5);
            }
          }
        } catch {
          formattedDate = rawDate.slice(0, 10);
        }
      }

      // Determine action
      let action: HistoryItem['action'] = 'Introduced';
      if (e.eventType === 'FEATURE_RENAMED') action = 'Renamed';
      else if (e.eventType === 'FEATURE_MODIFIED' || e.eventType === 'REQUIREMENT_CHANGED')
        action = 'Modified';
      else if (e.eventType === 'FEATURE_REMOVED' || e.eventType === 'FEATURE_DEPRECATED')
        action = 'Removed';
      else if (e.eventType === 'FEATURE_APPROVED') action = 'Approved';
      else if (e.eventType === 'FEATURE_IMPLEMENTED') action = 'Introduced';
      else action = 'Introduced';

      // Determine status pill
      let status: HistoryItem['status'] = 'implemented';
      const dec = (e.decisionStatus || '').toLowerCase();
      if (e.eventType === 'FEATURE_REJECTED' || dec.includes('reject')) {
        status = 'rejected';
      } else if (e.eventType === 'FEATURE_APPROVED' || dec.includes('approv')) {
        status = 'approved';
      } else if (e.eventType === 'FEATURE_PROPOSED' || dec.includes('propos') || dec.includes('pending')) {
        status = 'proposed';
      } else {
        status = 'implemented';
      }

      // Source reference
      const rec = records.find((r) => r.id === e.sourceRecordId);
      let sourceId = `rec-${(e.id || '').slice(-3)}`;
      let sourceType = 'Verified Record';

      if (rec) {
        const fLower = rec.fileName.toLowerCase();
        if (fLower.includes('pr') || fLower.includes('pull') || rec.sourceType === 'GITHUB') {
          sourceId = rec.fileName.match(/pr-?\d+/i)?.[0]?.toLowerCase() || `pr-${rec.id.slice(-3)}`;
          sourceType = 'GitHub PR';
        } else if (fLower.includes('audit') || fLower.includes('sec')) {
          sourceId = `sec-${rec.id.slice(-3)}`;
          sourceType = 'Security Audit';
        } else if (fLower.includes('adr') || fLower.includes('architecture')) {
          sourceId = `adr-${rec.id.slice(-3)}`;
          sourceType = 'Architecture ADR';
        } else if (fLower.includes('meeting')) {
          sourceId = `meeting-${rec.id.slice(-3)}`;
          sourceType = 'Meeting Notes';
        } else {
          sourceId = `doc-${rec.id.slice(-3)}`;
          sourceType = rec.sourceType === 'GOOGLE_DRIVE' ? 'Google Docs' : 'PRD Spec';
        }
      } else if (e.featureName) {
        sourceId = `evt-${(e.id || '').slice(-3)}`;
        sourceType = 'Knowledge Graph';
      }

      // Clean, professional quote
      let rawText = e.description || e.evidenceText || e.featureName || '';
      // Strip markdown headers if any
      rawText = rawText.replace(/^#+\s+/gm, '').replace(/\n+/g, ' ').trim();
      if (rawText.length > 180) {
        rawText = rawText.slice(0, 177) + '...';
      }

      return {
        id: e.id || `hist-${idx}`,
        date: formattedDate,
        action,
        status,
        quote: rawText,
        sourceId,
        sourceType,
      };
    });

  // Use dynamic items from the active workspace data
  const itemsToDisplay = dynamicItems;

  const getStatusBadgeStyle = (status: HistoryItem['status']) => {
    switch (status) {
      case 'implemented':
        return 'bg-[#EAF5EF] text-[#1E7E4D] dark:bg-emerald-950/70 dark:text-emerald-300';
      case 'proposed':
        return 'bg-[#FDF4E8] text-[#A16207] dark:bg-amber-950/70 dark:text-amber-300';
      case 'rejected':
        return 'bg-[#FEE2E2] text-[#991B1B] dark:bg-rose-950/70 dark:text-rose-300';
      case 'approved':
        return 'bg-[#E0F2FE] text-[#0369A1] dark:bg-sky-950/70 dark:text-sky-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-brand-dark-card border border-brand-border/80 dark:border-brand-dark-border shadow-subtle">
      {/* Header */}
      <div className="flex items-start justify-between pb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-dark dark:text-white tracking-tight">
            Recent project history
          </h2>
          <p className="text-xs sm:text-sm text-brand-secondary mt-1">
            Events in their original context
          </p>
        </div>

        <button
          onClick={onViewFullTimeline}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs sm:text-sm font-semibold text-brand-dark dark:text-white hover:bg-brand-bg dark:hover:bg-brand-dark transition-all"
        >
          <span>Full timeline</span>
          <ArrowUpRight size={15} />
        </button>
      </div>

      {/* Timeline items list */}
      <div className="mt-2">
        {itemsToDisplay.length === 0 ? (
          <div className="py-8 text-center text-xs text-brand-secondary">
            No project history events recorded yet. Connect a GitHub repository or add a document to track feature evolution.
          </div>
        ) : (
          itemsToDisplay.map((item, index) => {
          const isLast = index === itemsToDisplay.length - 1;

          return (
            <div key={item.id} className="flex items-start group">
              {/* Left Column: Date */}
              <div className="w-14 sm:w-16 shrink-0 text-right pr-4 pt-0.5">
                <span className="text-xs sm:text-sm font-medium text-brand-secondary/80">
                  {item.date}
                </span>
              </div>

              {/* Center Column: Node Dot & Connecting Line */}
              <div className="relative flex flex-col items-center shrink-0 w-6 self-stretch">
                {/* Dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-[#1C9B78] ring-4 ring-[#1C9B78]/20 z-10 mt-1.5 shrink-0" />

                {/* Vertical connecting line */}
                {!isLast && (
                  <div className="w-[1.5px] bg-[#1C9B78]/25 dark:bg-[#1C9B78]/35 flex-1 my-1" />
                )}
              </div>

              {/* Right Column: Content */}
              <div className={`flex-1 pl-4 ${isLast ? 'pb-2' : 'pb-7'}`}>
                {/* Top Row: Action + Status Pill */}
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs sm:text-sm text-brand-dark dark:text-white">
                    {item.action}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${getStatusBadgeStyle(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Middle: Quoted Statement */}
                <p className="text-xs sm:text-sm text-brand-dark/90 dark:text-gray-200 mt-2 leading-relaxed">
                  “{item.quote}”
                </p>

                {/* Bottom: Source Reference */}
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-brand-secondary mt-2 font-mono">
                  <AlignLeft size={13} className="shrink-0 text-brand-secondary/70" />
                  <span>
                    {item.sourceId} · {item.sourceType}
                  </span>
                </div>
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
};
