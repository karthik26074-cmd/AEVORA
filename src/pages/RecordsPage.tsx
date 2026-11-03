import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  X,
  Sparkles,
  Calendar,
  User,
  Layers,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ProjectRecord } from '../types';

export const RecordsPage: React.FC = () => {
  const { records, uploadFiles, deleteRecord, reExtractRecord, events } = useWorkspace();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<ProjectRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadEventDate, setUploadEventDate] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [reExtractingId, setReExtractingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    await uploadFiles(files, uploadAuthor || 'Product Team', uploadEventDate || undefined);
    setIsUploading(false);
    setUploadAuthor('');
    setUploadEventDate('');
  };

  const handleReExtract = async (rec: ProjectRecord) => {
    setReExtractingId(rec.id);
    await reExtractRecord(rec.id);
    setReExtractingId(null);
  };

  // Filter records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.fileName.toLowerCase().includes(search.toLowerCase()) ||
      (r.author && r.author.toLowerCase().includes(search.toLowerCase())) ||
      (r.module && r.module.toLowerCase().includes(search.toLowerCase()));
    const matchesSource = sourceFilter === 'ALL' || r.sourceType === sourceFilter;
    return matchesSearch && matchesSource;
  });

  // Events belonging to currently selected record
  const selectedRecordEvents = selectedRecord
    ? events.filter((e) => e.sourceRecordId === selectedRecord.id)
    : [];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-dark dark:text-white tracking-tight">
            Product Records
          </h1>
          <p className="text-xs text-brand-secondary mt-1">
            Original PRDs, meeting notes, tickets, commits, and pull requests with verified source evidence.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm transition-all"
        >
          <Upload size={14} />
          <span>Ingest New Documents</span>
        </button>
      </div>

      {/* Drag & Drop Ingestion Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`p-6 rounded-3xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center ${
          dragActive
            ? 'border-brand-primary bg-brand-primary-light/40 dark:bg-brand-primary/10'
            : 'border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.csv,.json,.md"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div className="w-12 h-12 rounded-2xl bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary flex items-center justify-center mb-3">
          <Upload size={22} className={isUploading ? 'animate-bounce' : ''} />
        </div>

        <h3 className="font-bold text-sm text-brand-dark dark:text-white">
          {isUploading ? 'Ingesting & Analyzing Document with Gemini AI...' : 'Drag & drop project files here'}
        </h3>
        <p className="text-xs text-brand-secondary mt-1 max-w-md">
          Supports Markdown (.md), Text (.txt), JSON, CSV, PDF, and DOCX documents.
        </p>

        {/* Optional Event Date & Author Metadata */}
        <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-xs">
            <User size={13} className="text-brand-secondary" />
            <input
              type="text"
              placeholder="Author (optional)"
              value={uploadAuthor}
              onChange={(e) => setUploadAuthor(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-brand-dark dark:text-white text-xs placeholder-brand-secondary w-28"
            />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg dark:bg-brand-dark text-xs">
            <Calendar size={13} className="text-brand-secondary" />
            <input
              type="date"
              value={uploadEventDate}
              onChange={(e) => setUploadEventDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-brand-dark dark:text-white text-xs"
              title="Event Date (kept separate from ingestion date)"
            />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-brand-primary/10 text-brand-primary text-xs font-semibold hover:bg-brand-primary/20"
          >
            Browse Local Files
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records by name, author, module..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card text-brand-text dark:text-white focus:outline-none focus:border-brand-primary"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
          {['ALL', 'UPLOAD', 'GITHUB', 'JIRA', 'GOOGLE_DRIVE'].map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0 ${
                sourceFilter === src
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border text-brand-secondary hover:text-brand-dark dark:hover:text-white'
              }`}
            >
              {src === 'ALL' ? 'All Sources' : src}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table / Cards */}
      <div className="bg-brand-surface dark:bg-brand-dark-card rounded-3xl border border-brand-border dark:border-brand-dark-border shadow-subtle overflow-hidden">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText size={32} className="mx-auto text-brand-secondary opacity-50" />
            <h4 className="font-bold text-sm text-brand-dark dark:text-white">No records found</h4>
            <p className="text-xs text-brand-secondary">
              Upload project documents or connect a repository to begin building temporal knowledge.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark/50 text-brand-secondary font-semibold">
                  <th className="py-3 px-4">Record Name</th>
                  <th className="py-3 px-4">Source Platform</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Event Date</th>
                  <th className="py-3 px-4">Ingestion Date</th>
                  <th className="py-3 px-4">Events Extracted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 dark:divide-brand-dark-border/60">
                {filteredRecords.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className="hover:bg-brand-bg/50 dark:hover:bg-brand-dark/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-brand-dark dark:text-white max-w-[220px] truncate">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-brand-primary flex-shrink-0" />
                        <span className="truncate">{r.fileName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-brand-bg dark:bg-brand-dark border border-brand-border dark:border-brand-dark-border text-brand-secondary font-bold">
                        {r.sourceType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-brand-secondary truncate max-w-[140px]">
                      {r.author || 'Product Team'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-brand-dark dark:text-gray-200">
                      {r.eventDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-brand-secondary">
                      {new Date(r.ingestionDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-brand-success bg-brand-success-light px-2 py-0.5 rounded-md">
                        {r.extractedEventCount} event(s)
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          r.status === 'COMPLETED'
                            ? 'bg-brand-success-light text-brand-success'
                            : r.status === 'FAILED'
                            ? 'bg-brand-error-light text-brand-error'
                            : 'bg-brand-warning-light text-brand-warning animate-pulse'
                        }`}
                      >
                        {r.status === 'COMPLETED' ? <CheckCircle size={11} /> : <Clock size={11} />}
                        <span>{r.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleReExtract(r)}
                          disabled={reExtractingId === r.id}
                          className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-primary hover:bg-brand-bg dark:hover:bg-brand-dark transition-colors"
                          title="Re-extract with Gemini"
                        >
                          <RefreshCw
                            size={14}
                            className={reExtractingId === r.id ? 'animate-spin text-brand-primary' : ''}
                          />
                        </button>
                        <button
                          onClick={() => deleteRecord(r.id)}
                          className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-error hover:bg-brand-error-light transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Inspection Modal / Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] bg-brand-surface dark:bg-brand-dark-card rounded-3xl shadow-elevated border border-brand-border dark:border-brand-dark-border flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/15 text-brand-primary flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-brand-dark dark:text-white truncate max-w-md">
                    {selectedRecord.fileName}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-brand-secondary mt-0.5">
                    <span>Source: {selectedRecord.sourceType}</span>
                    <span>•</span>
                    <span>Author: {selectedRecord.author || 'Product Team'}</span>
                    <span>•</span>
                    <span>Event Date: {selectedRecord.eventDate || 'Undated'}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white hover:bg-brand-bg dark:hover:bg-brand-dark"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Gemini Extracted Events Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-brand-primary" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-brand-dark dark:text-white">
                      Extracted Temporal Feature Events ({selectedRecordEvents.length})
                    </h4>
                  </div>
                  <button
                    onClick={() => handleReExtract(selectedRecord)}
                    disabled={reExtractingId === selectedRecord.id}
                    className="text-xs font-semibold text-brand-primary flex items-center gap-1 hover:underline"
                  >
                    <RefreshCw size={12} className={reExtractingId === selectedRecord.id ? 'animate-spin' : ''} />
                    <span>Re-analyze</span>
                  </button>
                </div>

                {selectedRecordEvents.length === 0 ? (
                  <p className="text-xs text-brand-secondary italic">
                    No events extracted. Click Re-analyze to trigger Gemini extraction.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedRecordEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3.5 rounded-2xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-brand-dark dark:text-white flex items-center gap-1.5">
                            <Layers size={13} className="text-brand-primary" />
                            <span>{evt.featureName}</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary-light text-brand-primary uppercase tracking-wider">
                            {evt.eventType.replace('FEATURE_', '')}
                          </span>
                        </div>
                        <p className="text-xs text-brand-text dark:text-gray-300">{evt.description}</p>
                        <div className="p-2 rounded-xl bg-white dark:bg-brand-dark text-[11px] font-mono text-brand-secondary border border-brand-border/50 dark:border-brand-dark-border/50">
                          <span className="text-brand-primary font-bold">Evidence:</span> "{evt.evidenceText}"
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raw Document Content Preview */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-brand-secondary">
                  Raw Document Text
                </h4>
                <div className="p-4 rounded-2xl bg-brand-bg dark:bg-brand-dark font-mono text-xs text-brand-text dark:text-gray-300 whitespace-pre-wrap max-h-72 overflow-y-auto border border-brand-border dark:border-brand-dark-border">
                  {selectedRecord.rawContent || selectedRecord.summary || 'No text preview available.'}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark/50 flex justify-between items-center text-xs">
              <span className="text-brand-secondary font-mono">
                Record ID: {selectedRecord.id}
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-brand-primary text-white font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
