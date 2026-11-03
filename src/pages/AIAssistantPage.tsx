import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  FileText,
  Calendar,
  AlertTriangle,
  Layers,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  Key,
  CheckCircle2,
  X,
  Mic,
  Compass,
  Volume2,
  VolumeX,
  Quote,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useWorkspace } from '../context/WorkspaceContext';
import { AIChatMessage } from '../types';

marked.setOptions({
  breaks: true,
  gfm: true,
});

interface AIAssistantPageProps {
  onNavigate?: (tab: string) => void;
}

const ROUTE_REGISTRY: Record<string, { tab: string; label: string; description: string }> = {
  'recent history': { tab: 'activity', label: 'Recent History', description: 'Chronological feed of project events' },
  'developer updates': { tab: 'developer-updates', label: 'Developer Updates', description: 'Repository activity and developer commits' },
  'activity': { tab: 'activity', label: 'Recent History', description: 'Real-time event stream and audit logs' },
  'timeline': { tab: 'timeline', label: 'Timeline', description: 'Interactive multi-phase milestone history' },
  'feature timeline': { tab: 'timeline', label: 'Timeline', description: 'Interactive multi-phase milestone history' },
  'connected sources': { tab: 'connected-sources', label: 'Connected Sources & Unified Explorer', description: 'Multi-source traceability matrix across GitHub, Jira, and Drive' },
  'github explorer': { tab: 'github-explorer', label: 'GitHub Storage Explorer', description: 'Tracked repository files and commit verification' },
  'records': { tab: 'records', label: 'Product Records', description: 'Ingested documents and specifications' },
  'documents': { tab: 'records', label: 'Product Records', description: 'Ingested documents and specifications' },
  'knowledge graph': { tab: 'graph', label: 'Knowledge Graph', description: 'Interactive relationship network' },
  'graph': { tab: 'graph', label: 'Knowledge Graph', description: 'Interactive relationship network' },
  'features': { tab: 'features', label: 'Feature Explorer', description: 'All tracked product capabilities' },
  'decisions': { tab: 'conflicts', label: 'Decisions & Conflicts', description: 'Architectural records and discrepancy audit' },
  'conflicts': { tab: 'conflicts', label: 'Decisions & Conflicts', description: 'Architectural records and discrepancy audit' },
  'integrations': { tab: 'integrations', label: 'Integrations', description: 'GitHub, Jira, and Google Drive connections' },
  'github': { tab: 'integrations', label: 'GitHub Integration', description: 'Repository and webhook connections' },
  'jira': { tab: 'integrations', label: 'Jira Integration', description: 'Issue synchronization' },
  'drive': { tab: 'integrations', label: 'Google Drive Integration', description: 'Document folder watch' },
  'settings': { tab: 'settings', label: 'Settings', description: 'Workspace and API configuration' },
  'overview': { tab: 'overview', label: 'Overview Dashboard', description: 'Executive metrics and temporal velocity' },
};

const getStatusBadgeStyle = (status?: string) => {
  const s = (status || '').toUpperCase();
  if (s.includes('PROPOS')) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
  if (s.includes('APPROV')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  if (s.includes('IMPLEM')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (s.includes('MODIF')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  if (s.includes('REJECT') || s.includes('REMOV')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  return 'bg-brand-primary/10 text-brand-primary border-brand-primary/20';
};

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({ onNavigate }) => {
  const { askAI } = useWorkspace();

  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySaveMessage, setKeySaveMessage] = useState<string | null>(null);

  // Voice Assistant states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [expandedCitationIndex, setExpandedCitationIndex] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setHasGeminiKey(Boolean(data.hasGeminiApiKey));
      })
      .catch((err) => console.error(err));

    // Initialize Web Speech API only if fully supported by browser
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          setTimeout(() => handleSend(transcript), 300);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        setSpeechSupported(true);
      } catch {
        setSpeechSupported(false);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  };

  const speakText = (text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`[\]]/g, '').slice(0, 300);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setIsSavingKey(true);
    setKeySaveMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: apiKeyInput.trim() }),
      });
      const data = await res.json();
      setHasGeminiKey(Boolean(data.hasGeminiApiKey));
      setKeySaveMessage('API Key successfully saved and active!');
      setApiKeyInput('');
      setTimeout(() => {
        setShowKeyModal(false);
        setKeySaveMessage(null);
      }, 1500);
    } catch {
      setKeySaveMessage('Failed to save API key.');
    } finally {
      setIsSavingKey(false);
    }
  };

  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        "Hello! I'm EVOLYRA Intelligence, your assistant for project history. " +
        "I can answer questions regarding how your software product features evolved, " +
        "when requirements changed, who approved architectural decisions, and which original records support every claim.\n\n" +
        "You can also speak or type navigation commands like Open Feature Timeline or Show Knowledge Graph.",
      timestamp: new Date().toISOString(),
      example_questions: [
        'When was OTP Verification introduced?',
        'Who approved the Payment Gateway?',
        'Show Knowledge Graph',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Check if query is a controlled page navigation request
  const checkNavigationIntent = (query: string): { tab: string; label: string; description: string } | null => {
    const q = query.toLowerCase().trim();
    for (const [key, dest] of Object.entries(ROUTE_REGISTRY)) {
      if (
        q === key ||
        q === `open ${key}` ||
        q === `show ${key}` ||
        q === `go to ${key}` ||
        q === `navigate to ${key}` ||
        q === `open the ${key}` ||
        q === `show me the ${key}`
      ) {
        return dest;
      }
    }
    return null;
  };

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isThinking) return;

    if (q.length > 500) {
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: q,
          timestamp: new Date().toISOString(),
        },
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Message exceeds maximum permitted length of 500 characters. Please shorten your question.',
          timestamp: new Date().toISOString(),
          isInsufficientEvidence: true,
        },
      ]);
      if (!questionText) setInput('');
      return;
    }

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setIsThinking(true);

    // 1. Check for client-side instant navigation trigger
    const navMatch = checkNavigationIntent(q);
    if (navMatch) {
      setIsThinking(false);
      const navMsg: AIChatMessage = {
        id: `nav-${Date.now()}`,
        role: 'assistant',
        content: `Navigating to ${navMatch.label}.`,
        timestamp: new Date().toISOString(),
        intent: 'navigation',
        navigation: { tab: navMatch.tab, label: navMatch.label },
      };
      setMessages((prev) => [...prev, navMsg]);
      speakText(`Navigating to ${navMatch.label}`);
      if (onNavigate) {
        setTimeout(() => onNavigate(navMatch.tab), 600);
      }
      return;
    }

    try {
      const response = await askAI(q);
      setMessages((prev) => [...prev, response]);
      speakText(response.content);

      if (response.navigation && onNavigate) {
        setTimeout(() => onNavigate(response.navigation!.tab), 800);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "I couldn't reach the history service. Please try again.",
          timestamp: new Date().toISOString(),
          isInsufficientEvidence: true,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMarkdown = (content: string) => {
    const rawHtml = marked.parse(content || '') as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return { __html: cleanHtml };
  };

  const defaultSuggestedQuestions = [
    'When was OTP Verification introduced?',
    'Who approved the Payment Gateway?',
    'What changes were made to Quick Checkout?',
    'Open Feature Timeline',
    'Show Knowledge Graph',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-brand-border dark:border-brand-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-bold shadow-md shadow-brand-primary/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-brand-dark dark:text-white tracking-tight flex items-center gap-2">
              <span>EVOLYRA Intelligence</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary-light dark:bg-brand-primary/20 text-brand-primary border border-brand-primary/20">
                events.db Guarded
              </span>
            </h1>
            <p className="text-xs text-brand-secondary">
              Grounded temporal reasoning across specifications, tickets, PRs, and decisions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* TTS Toggle Button */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              ttsEnabled
                ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                : 'border-brand-border dark:border-brand-dark-border text-brand-secondary hover:text-brand-dark dark:hover:text-white'
            }`}
            title={ttsEnabled ? 'Disable Voice Responses' : 'Enable Voice Responses (TTS)'}
          >
            {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>Voice {ttsEnabled ? 'On' : 'Off'}</span>
          </button>

          {/* Gemini Key Config Button */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              hasGeminiKey
                ? 'border-brand-success/30 text-brand-success bg-brand-success-light/30'
                : 'border-brand-border dark:border-brand-dark-border text-brand-secondary hover:text-brand-dark dark:hover:text-white'
            }`}
          >
            <Key size={14} />
            <span>{hasGeminiKey ? 'Gemini 3.5 Flash Active' : 'Configure Gemini API Key'}</span>
          </button>
        </div>
      </div>

      {/* Suggested Questions Pills */}
      <div className="py-3 overflow-x-auto flex items-center gap-2 border-b border-brand-border/60 dark:border-brand-dark-border/60">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary whitespace-nowrap pl-1">
          Suggestions:
        </span>
        {defaultSuggestedQuestions.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            className="text-xs font-medium px-3 py-1.5 rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card text-brand-text dark:text-gray-200 hover:border-brand-primary hover:text-brand-primary whitespace-nowrap transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-2">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isOutOfScope = msg.intent === 'out_of_scope';
          const isNoRecord =
            msg.no_record_found ||
            (msg.content && msg.content.includes("couldn't find any record")) ||
            Boolean(msg.structuredAnswer?.noRecordFound);
          const isError =
            msg.isInsufficientEvidence ||
            (msg.content && msg.content.includes("couldn't reach the history service"));

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                    isOutOfScope
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : isError
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                  }`}
                >
                  {isOutOfScope ? (
                    <ShieldAlert size={16} />
                  ) : isError ? (
                    <AlertTriangle size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-3xl p-5 space-y-3 ${
                  isUser
                    ? 'bg-brand-primary text-white ml-12 rounded-tr-sm shadow-md'
                    : isOutOfScope
                    ? 'bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/30 text-brand-text dark:text-gray-100 mr-12 rounded-tl-sm'
                    : isError
                    ? 'bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/30 text-brand-text dark:text-gray-100 mr-12 rounded-tl-sm'
                    : 'bg-brand-surface dark:bg-brand-dark-card text-brand-text dark:text-gray-100 border border-brand-border dark:border-brand-dark-border shadow-subtle mr-12 rounded-tl-sm'
                }`}
              >
                {/* 1. OUT OF SCOPE REFUSAL CARD */}
                {isOutOfScope ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider pb-1 border-b border-amber-500/20">
                      <ShieldAlert size={14} />
                      <span>EVOLYRA Scope Policy: Outside Scope</span>
                    </div>
                    <p className="text-xs text-brand-dark dark:text-gray-200 leading-relaxed font-medium">
                      {msg.content}
                    </p>
                    {msg.example_questions && msg.example_questions.length > 0 && (
                      <div className="pt-2 border-t border-amber-500/20 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                          Try asking about project history:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.example_questions.map((eq, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => handleSend(eq)}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-brand-surface dark:bg-brand-dark-card border border-amber-500/30 text-brand-dark dark:text-white hover:border-brand-primary hover:text-brand-primary transition-colors text-left"
                            >
                              {eq}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 pt-1 italic font-medium">
                          Not what you meant? Rephrase
                        </p>
                      </div>
                    )}
                  </div>
                ) : isNoRecord ? (
                  /* 2. NO RECORD FOUND CARD */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider pb-1 border-b border-blue-500/20">
                      <HelpCircle size={14} />
                      <span>History Record Check</span>
                    </div>
                    <p className="text-xs text-brand-dark dark:text-gray-200 leading-relaxed font-medium">
                      {msg.content}
                    </p>
                    {msg.example_questions && msg.example_questions.length > 0 && (
                      <div className="pt-2 border-t border-blue-500/20 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                          Suggested questions from events:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.example_questions.map((eq, qIdx) => (
                            <button
                              key={qIdx}
                              onClick={() => handleSend(eq)}
                              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-brand-surface dark:bg-brand-dark-card border border-blue-500/30 text-brand-dark dark:text-white hover:border-brand-primary hover:text-brand-primary transition-colors text-left"
                            >
                              {eq}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : isError ? (
                  /* 3. BACKEND ERROR CARD */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider pb-1 border-b border-rose-500/20">
                      <AlertTriangle size={14} />
                      <span>Service Connection Alert</span>
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed">
                      I couldn't reach the history service. Please try again.
                    </p>
                  </div>
                ) : (
                  /* 4. STANDARD PRODUCT ANSWER / GREETING */
                  <div className="space-y-3">
                    {/* Rendered Sanitized Markdown (No Raw Asterisks) */}
                    <div
                      className={`prose dark:prose-invert prose-xs max-w-none text-xs leading-relaxed ${
                        isUser ? 'text-white font-medium' : 'text-brand-text dark:text-gray-100'
                      }`}
                      dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                    />

                    {/* Citations as Interactive Chips (Requirement 4) */}
                    {msg.chatCitations && msg.chatCitations.length > 0 && (
                      <div className="pt-3 border-t border-brand-border/60 dark:border-brand-dark-border/60 space-y-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-secondary flex items-center gap-1.5">
                          <FileText size={12} className="text-brand-primary" />
                          <span>Supporting Citations ({msg.chatCitations.length})</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.chatCitations.map((cit, cIdx) => {
                            const isExpanded = expandedCitationIndex === `${msg.id}-${cIdx}`;
                            return (
                              <div key={cIdx} className="relative">
                                <a
                                  href={cit.evidence_url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-brand-primary-light/60 dark:bg-brand-primary/15 border border-brand-primary/25 text-brand-primary text-[11px] font-semibold hover:bg-brand-primary/25 transition-all shadow-xs"
                                  title={cit.quote ? `Quote: "${cit.quote}"` : cit.source_id}
                                >
                                  <span className="uppercase text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-brand-primary/20">
                                    {cit.event_type || 'event'}
                                  </span>
                                  {cit.event_date && (
                                    <span className="font-mono text-[10px] text-brand-secondary">
                                      {cit.event_date}
                                    </span>
                                  )}
                                  <span className="font-mono text-[10px] font-bold text-brand-dark dark:text-white">
                                    {cit.source_id}
                                  </span>
                                  <ExternalLink size={11} className="opacity-70 hover:opacity-100" />
                                </a>

                                {cit.quote && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedCitationIndex(
                                        isExpanded ? null : `${msg.id}-${cIdx}`
                                      )
                                    }
                                    className="ml-1 text-[10px] text-brand-secondary hover:text-brand-primary underline"
                                  >
                                    {isExpanded ? 'Hide quote' : 'View quote'}
                                  </button>
                                )}

                                {isExpanded && cit.quote && (
                                  <div className="mt-1.5 p-2 rounded-xl bg-brand-bg/90 dark:bg-brand-dark/90 border border-brand-border text-[11px] text-brand-secondary italic leading-relaxed">
                                    "{cit.quote}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Navigation trigger button if navigation intent returned */}
                    {msg.navigation && onNavigate && (
                      <div className="pt-2">
                        <button
                          onClick={() => onNavigate(msg.navigation!.tab)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover shadow-sm transition-all"
                        >
                          <Compass size={14} />
                          <span>Open {msg.navigation.label}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}

                    {/* Example questions for greetings */}
                    {msg.intent === 'greeting_or_help' &&
                      msg.example_questions &&
                      msg.example_questions.length > 0 && (
                        <div className="pt-3 border-t border-brand-border/60 dark:border-brand-dark-border/60 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary">
                            Click to ask project history:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.example_questions.map((eq, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSend(eq)}
                                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-brand-bg/70 dark:bg-brand-dark/70 border border-brand-border text-brand-dark dark:text-white hover:border-brand-primary hover:text-brand-primary transition-colors text-left"
                              >
                                {eq}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Footer with Timestamp and Copy button (Strict High Contrast >= 4.5:1 on User Bubble) */}
                <div
                  className={`flex items-center justify-between pt-2 border-t text-[10px] ${
                    isUser
                      ? 'border-white/20 text-white/90'
                      : 'border-brand-border/60 dark:border-brand-dark-border/60 text-brand-secondary'
                  }`}
                >
                  <span className={isUser ? 'text-white/90 font-medium' : 'text-brand-secondary'}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    className={`flex items-center gap-1 font-semibold transition-colors ${
                      isUser
                        ? 'text-white/90 hover:text-white'
                        : 'text-brand-secondary hover:text-brand-dark dark:hover:text-white'
                    }`}
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={12} className={isUser ? 'text-white' : 'text-emerald-500'} />
                        <span className={isUser ? 'text-white font-bold' : 'text-emerald-500 font-bold'}>
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator while waiting */}
        {isThinking && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center flex-shrink-0 mt-0.5 border border-brand-primary/20">
              <Sparkles size={16} className="animate-spin" />
            </div>
            <div className="rounded-3xl p-4 bg-brand-surface dark:bg-brand-dark-card border border-brand-border dark:border-brand-dark-border shadow-subtle flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" />
              <span className="text-xs text-brand-secondary pl-1 font-medium">
                EVOLYRA is reasoning across project records...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form with 500-char limit, Enter to send, Shift+Enter for newline */}
      <div className="p-4 border-t border-brand-border dark:border-brand-dark-border bg-brand-surface dark:bg-brand-dark-card rounded-3xl shadow-subtle space-y-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isThinking && input.trim()) {
                  handleSend();
                }
              }
            }}
            placeholder={
              isListening
                ? 'Listening... Speak your question or command...'
                : "Ask EVOLYRA about feature history, decisions, or say 'hi'..."
            }
            rows={Math.min(4, Math.max(1, input.split('\n').length))}
            className="flex-1 resize-none bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border dark:border-brand-dark-border rounded-2xl px-4 py-3 text-xs text-brand-dark dark:text-white placeholder:text-brand-secondary focus:outline-none focus:border-brand-primary transition-colors leading-relaxed"
            disabled={isThinking}
          />

          {/* Voice Microphone Button (Only rendered if Web Speech API works) */}
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-2xl border transition-all ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-500 animate-pulse shadow-md'
                  : 'bg-brand-bg dark:bg-brand-dark border-brand-border text-brand-secondary hover:text-brand-primary'
              }`}
              title={isListening ? 'Stop listening' : 'Voice Input'}
            >
              <Mic size={16} />
            </button>
          )}

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isThinking || !input.trim()}
            className="p-3 rounded-2xl bg-brand-primary text-white font-bold hover:bg-brand-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-primary/20 flex-shrink-0"
            title="Send Message"
          >
            <Send size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-brand-secondary px-1">
          <span>Enter to send • Shift+Enter for new line</span>
          <span className={input.length >= 480 ? 'text-amber-500 font-bold' : ''}>
            {input.length}/500
          </span>
        </div>
      </div>

      {/* Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-brand-surface dark:bg-brand-dark-card rounded-3xl p-6 shadow-elevated border border-brand-border dark:border-brand-dark-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border dark:border-brand-dark-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-primary/15 text-brand-primary flex items-center justify-center">
                  <Key size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-brand-dark dark:text-white">
                    Configure Gemini API Key
                  </h3>
                  <p className="text-[11px] text-brand-secondary">
                    Power real-time temporal intelligence & grounded QA
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setKeySaveMessage(null);
                }}
                className="p-1 rounded-lg text-brand-secondary hover:text-brand-dark dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-brand-bg/60 dark:bg-brand-dark/60 border border-brand-border/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-dark dark:text-white">Current Status:</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    hasGeminiKey
                      ? 'bg-brand-success-light text-brand-success'
                      : 'bg-brand-warning-light text-brand-warning'
                  }`}
                >
                  {hasGeminiKey ? 'Active (Key Configured)' : 'Built-in Engine (No Custom Key)'}
                </span>
              </div>
              <p className="text-[11px] text-brand-secondary">
                {hasGeminiKey
                  ? 'A custom Google Gemini API key is currently configured and active.'
                  : 'Enter your Google AI Studio API key below to unlock live Gemini 3.5 Flash responses.'}
              </p>
            </div>

            {keySaveMessage && (
              <div className="p-3 rounded-xl bg-brand-success-light text-brand-success text-xs flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{keySaveMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveKey} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-brand-dark dark:text-white mb-1">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-border dark:border-brand-dark-border bg-brand-bg/50 dark:bg-brand-dark/50 text-brand-dark dark:text-white focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-brand-secondary hover:text-brand-dark dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingKey || !apiKeyInput.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-primary text-white hover:bg-brand-primary-hover disabled:opacity-50"
                >
                  {isSavingKey ? 'Saving...' : 'Save API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
