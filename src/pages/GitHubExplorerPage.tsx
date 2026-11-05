import React, { useState } from 'react';
import {
  GitBranch,
  FileCode,
  FileText,
  ExternalLink,
  CheckCircle2,
  Search,
  Copy,
  Check,
  Code2,
  FileJson,
  Layers,
  ArrowRight,
  GitCommit,
  Clock,
  User,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface GitHubExplorerPageProps {
  initialFile?: string | null;
  onSelectFeature?: (featureId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

interface TrackedSourceFile {
  id: string;
  path: string;
  subpath: string;
  featureId: string;
  featureName: string;
  featureCategory: string;
  fileType: 'typescript' | 'markdown' | 'json';
  commitSha: string;
  fileSize: string;
  latestCommit: {
    message: string;
    author: string;
    date: string;
  };
  content: string;
  diff: string;
}

export const GitHubExplorerPage: React.FC<GitHubExplorerPageProps> = ({
  initialFile,
  onSelectFeature,
  onNavigateToTab,
}) => {
  const { currentWorkspace, features, events } = useWorkspace();
  const repoName = currentWorkspace?.name || 'Active Project';

  // Construct dynamic tracked files from features and events
  const trackedFiles: TrackedSourceFile[] = (features || []).map((feat, idx) => {
    const featEvents = (events || []).filter((e) => e.featureId === feat.id);
    const latestEvent = featEvents[0];
    const sha = latestEvent?.sourceRecordId ? latestEvent.sourceRecordId.replace('gh-commit-', '').slice(0, 10) : 'main';
    const filePath = `src/${feat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ts`;

    return {
      id: feat.id || `file-${idx}`,
      path: filePath,
      subpath: filePath,
      featureId: feat.id,
      featureName: feat.name,
      featureCategory: feat.module || 'Core Engineering',
      fileType: 'typescript',
      commitSha: sha,
      fileSize: '2.4 KB',
      latestCommit: {
        message: latestEvent?.description || `feat: track ${feat.name}`,
        author: latestEvent?.person || 'Contributor',
        date: latestEvent?.eventDate || new Date().toLocaleDateString(),
      },
      content: `// Feature: ${feat.name}\n// Module: ${feat.module || 'General'}\n// Status: ${feat.currentStatus}\n\nexport interface ${feat.name.replace(/[^a-zA-Z0-9]/g, '')}Config {\n  enabled: boolean;\n  updatedAt: string;\n}\n`,
      diff: `@@ -1,3 +1,6 @@\n+ // Feature: ${feat.name}\n+ // Tracked in AEVORA Knowledge Graph\n`,
    };
  });

  const [selectedFileId, setSelectedFileId] = useState<string>(() => {
    if (initialFile) {
      const match = trackedFiles.find((f) => f.path === initialFile || f.id === initialFile);
      if (match) return match.id;
    }
    return trackedFiles[0]?.id || '';
  });

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'source' | 'diff'>('source');
  const [copied, setCopied] = useState(false);

  const filteredFiles = trackedFiles.filter(
    (file) =>
      file.path.toLowerCase().includes(search.toLowerCase()) ||
      file.featureName.toLowerCase().includes(search.toLowerCase()) ||
      file.featureCategory.toLowerCase().includes(search.toLowerCase())
  );

  const selectedFile = filteredFiles.find((f) => f.id === selectedFileId) || filteredFiles[0];

  const handleCopyCode = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(
      activeTab === 'source' ? selectedFile.content : selectedFile.diff
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'typescript':
        return <Code2 size={16} className="text-blue-500" />;
      case 'json':
        return <FileJson size={16} className="text-amber-500" />;
      case 'markdown':
      default:
        return <FileText size={16} className="text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-purple-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <GitBranch size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-extrabold text-brand-dark dark:text-white tracking-tight">
                GitHub Storage Explorer
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary border border-brand-primary/20">
                ACTIVE REPOSITORY
              </span>
            </div>
            <p className="text-xs text-brand-secondary mt-0.5">
              Inspect actual repository directory structures, source code file paths, commit SHAs, and mapped AEVORA features.
            </p>
          </div>
        </div>

        {/* Action Button: Open in GitHub */}
        <a
          href={repoName.includes('/') ? `https://github.com/${repoName}` : 'https://github.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
        >
          <span>Open in GitHub</span>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* ── Top Repository Info Card ──────────────────────────────── */}
      <div className="p-4 md:p-5 rounded-2xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-brand-secondary block">
              REPOSITORY:
            </span>
            <span className="font-mono font-bold text-brand-dark dark:text-white">
              {repoName}
            </span>
          </div>

          <div className="h-6 w-px bg-brand-border dark:bg-brand-dark-border hidden md:block" />

          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-brand-secondary block">
              BRANCH:
            </span>
            <span className="font-mono font-bold text-brand-dark dark:text-white">
              main
            </span>
          </div>

          <div className="h-6 w-px bg-brand-border dark:bg-brand-dark-border hidden md:block" />

          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-brand-secondary block">
              STATUS:
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              <span>Connected & Synchronized</span>
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files or mapped features..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary text-brand-dark dark:text-white"
          />
        </div>
      </div>

      {/* ── Files Layout or Empty State ───────────────────────────── */}
      {filteredFiles.length === 0 || !selectedFile ? (
        <div className="p-12 text-center rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto">
            <GitBranch size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-extrabold text-brand-dark dark:text-white">
              No Repository Files Tracked Yet
            </h3>
            <p className="text-xs text-brand-secondary">
              Connect your GitHub account and select a repository in Connected Sources to browse live files, commit history, and automated feature mappings.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab && onNavigateToTab('connected-sources')}
            className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
          >
            <span>Go to Connected Sources</span>
            <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Tracked Source Files */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-secondary">
                TRACKED SOURCE FILES ({filteredFiles.length})
              </h2>
            </div>

            <div className="space-y-2">
              {filteredFiles.map((file) => {
                const isSelected = file.id === selectedFile.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-brand-primary-light/40 dark:bg-brand-primary/15 border-brand-primary shadow-subtle ring-1 ring-brand-primary/20'
                        : 'bg-brand-surface dark:bg-brand-dark-card border-brand-border dark:border-brand-dark-border hover:border-brand-primary/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{getFileIcon(file.fileType)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono font-bold text-brand-dark dark:text-white truncate">
                          {file.path}
                        </p>
                        <p className="text-[11px] text-brand-secondary font-mono truncate mt-0.5">
                          {file.subpath}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary border border-brand-primary/20">
                            Mapped to {file.featureName}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: File Inspector Pane */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-3xl bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle space-y-5">
              {/* File Path Header */}
              <div className="flex items-center justify-between pb-3 border-b border-brand-border dark:border-brand-dark-border flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  {getFileIcon(selectedFile.fileType)}
                  <h3 className="font-mono text-sm font-extrabold text-brand-dark dark:text-white">
                    {selectedFile.path}
                  </h3>
                </div>

                <a
                  href={repoName.includes('/') ? `https://github.com/${repoName}/blob/main/${selectedFile.path}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover inline-flex items-center gap-1"
                >
                  <span>Open on GitHub</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* AEVORA Feature-to-Source Mapping Card */}
              <div className="p-4 rounded-2xl bg-brand-primary-light/30 dark:bg-brand-primary/10 border border-brand-primary/20 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-primary">
                  <Layers size={13} />
                  <span>AEVORA FEATURE-TO-SOURCE MAPPING</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-extrabold text-brand-dark dark:text-white">
                      {selectedFile.featureName}
                    </h4>
                    <p className="text-xs text-brand-secondary mt-0.5">
                      This source file contains the primary business logic implementing this feature.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectFeature) onSelectFeature(selectedFile.featureId);
                      if (onNavigateToTab) onNavigateToTab('features');
                    }}
                    className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-sm whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>Inspect Feature</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Storage & Commit Verification Card */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-secondary">
                  STORAGE & COMMIT VERIFICATION
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border">
                    <span className="text-[10px] uppercase font-bold text-brand-secondary block">
                      Commit SHA
                    </span>
                    <span className="font-mono text-sm font-bold text-brand-dark dark:text-white">
                      {selectedFile.commitSha}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border">
                    <span className="text-[10px] uppercase font-bold text-brand-secondary block">
                      File Size
                    </span>
                    <span className="font-mono text-sm font-bold text-brand-dark dark:text-white">
                      {selectedFile.fileSize}
                    </span>
                  </div>
                </div>

                {/* Latest Commit Message */}
                <div className="p-3.5 rounded-2xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border space-y-1">
                  <div className="text-[11px] text-brand-secondary flex items-center gap-1">
                    <span>→ Latest Commit Message:</span>
                  </div>
                  <p className="text-xs font-mono font-bold text-brand-dark dark:text-white">
                    "{selectedFile.latestCommit.message}"
                  </p>
                  <p className="text-[11px] text-brand-secondary">
                    By {selectedFile.latestCommit.author} on {selectedFile.latestCommit.date}
                  </p>
                </div>
              </div>

              {/* Interactive Code / Diff Viewer */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border">
                    <button
                      onClick={() => setActiveTab('source')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'source'
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
                      }`}
                    >
                      Source Code
                    </button>
                    <button
                      onClick={() => setActiveTab('diff')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        activeTab === 'diff'
                          ? 'bg-brand-primary text-white shadow-sm'
                          : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
                      }`}
                    >
                      Commit Diff
                    </button>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border text-xs font-medium text-brand-secondary hover:text-brand-dark dark:hover:text-white flex items-center gap-1.5 hover:bg-brand-bg dark:hover:bg-brand-dark transition-colors"
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-brand-border dark:border-brand-dark-border bg-[#0D1117] text-gray-200">
                  <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[380px] leading-relaxed select-all">
                    <code>{activeTab === 'source' ? selectedFile.content : selectedFile.diff}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
