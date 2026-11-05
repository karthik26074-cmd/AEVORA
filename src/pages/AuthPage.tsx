import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ============================================================================
// AEVORA AUTH PAGE – Light, Modern SaaS Landing
// ============================================================================

const LIFECYCLE_CHIPS = [
  { label: 'Proposed', color: '#7C5CFA' },
  { label: 'Approved', color: '#7C5CFA' },
  { label: 'Implemented', color: '#6366F1' },
  { label: 'Modified', color: '#8B5CF6' },
  { label: 'Renamed', color: '#22D3EE' },
  { label: 'Rejected', color: '#F87171' },
  { label: 'Removed', color: '#FB923C' },
] as const;

export const AuthPage: React.FC = () => {
  const { user, logout, login, loginDemo, loginWithGoogle, loginWithGitHub } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [includePrivateRepos, setIncludePrivateRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [hasErrorShake, setHasErrorShake] = useState(false);

  // Theme
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Status poll
  const [eventCount, setEventCount] = useState(14);
  const [displayedCount, setDisplayedCount] = useState(14);

  // Scroll for sticky bar blur
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // ── Theme toggle ──────────────────────────────────────────────────────
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('aevora_theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    const saved = localStorage.getItem('aevora_theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else if (saved === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // ── Scroll listener for sticky bar ────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // ── Status polling ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          if (data.event_count !== undefined && mounted) {
            setEventCount((p) => Math.max(p, data.event_count));
          }
        }
      } catch {
        // endpoint may not exist
      }
    };
    poll();
    const id = setInterval(poll, 8000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // ── Animated event count ──────────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion || displayedCount === eventCount) {
      setDisplayedCount(eventCount);
      return;
    }
    const start = displayedCount;
    const end = eventCount;
    const dur = 600;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setDisplayedCount(Math.floor(start + (end - start) * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [eventCount, displayedCount, prefersReducedMotion]);

  // ── Pause CSS loops on tab hidden ─────────────────────────────────────
  useEffect(() => {
    const handle = () => {
      document.documentElement.style.setProperty(
        '--anim-play',
        document.hidden ? 'paused' : 'running'
      );
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, []);

  // ── Form handlers ─────────────────────────────────────────────────────
  const triggerError = (msg: string) => {
    setError(msg);
    setIsLoading(false);
    setHasErrorShake(true);
    setTimeout(() => setHasErrorShake(false), 320);
  };

  const handleSuccessTransition = () => {
    setIsLoading(false);
    setIsSuccess(true);
    if (!prefersReducedMotion) {
      setTimeout(() => setIsExiting(true), 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const res = await login(email, password);
    if (!res.success) {
      triggerError(res.error || 'Invalid email or password');
    } else {
      handleSuccessTransition();
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        handleSuccessTransition();
      } else {
        triggerError(res.error || 'Google Sign-in failed');
      }
    } catch (err: any) {
      triggerError(err.message || 'Google Sign-in error');
    }
  };

  const handleGitHubSignIn = async (promptSelectAccount: boolean = false) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await loginWithGitHub(includePrivateRepos, promptSelectAccount);
      if (res.success) {
        handleSuccessTransition();
      } else {
        triggerError(res.error || 'GitHub Sign-in failed');
      }
    } catch (err: any) {
      triggerError(err.message || 'GitHub Sign-in error');
    }
  };

  const handleDemoAccess = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginDemo();
      handleSuccessTransition();
    } catch {
      triggerError('Demo authentication encountered an issue.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div
      ref={mainRef}
      className={`ev-root ${isDark ? 'ev-dark' : ''} ${isExiting ? 'ev-exit' : ''}`}
    >
      {/* ── Mesh gradient background blobs ─────────────────────────── */}
      <div className="ev-blob ev-blob-1" aria-hidden="true" />
      <div className="ev-blob ev-blob-2" aria-hidden="true" />
      <div className="ev-blob ev-blob-3" aria-hidden="true" />

      {/* Optional faint dot grid */}
      <div className="ev-dot-grid" aria-hidden="true" />

      {/* ── Sticky top bar ─────────────────────────────────────────── */}
      <header className={`ev-topbar ${scrolled ? 'ev-topbar-blur' : ''}`}>
        <div className="ev-topbar-inner">
          {/* Logo */}
          <div className="ev-logo-group">
            <img src="/logo.svg" alt="AEVORA" className="ev-logo-img" />
            <div className="ev-logo-text">
              <span className="ev-logo-name">AEVORA</span>
              <span className="ev-logo-tagline">TEMPORAL KNOWLEDGE ENGINE</span>
            </div>
          </div>

          {/* Right: status pill + theme toggle */}
          <div className="ev-topbar-right">
            <div className="ev-status-pill" aria-live="polite">
              <span className="ev-status-dot" />
              <span className="ev-status-label">Traceability Active</span>
              <span className="ev-status-sep">|</span>
              <span className="ev-status-count">
                events recorded: {displayedCount}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="ev-theme-toggle"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content (two-column: hero left, card right) ─────── */}
      <main className="ev-main">
        {/* Left: Branding / Hero */}
        <div className="ev-hero">
          {/* Badge pill */}
          <div className="ev-badge ev-stagger-1">
            <span className="ev-badge-dot" />
            FROM CODE TO CONTEXT
          </div>

          {/* Headline */}
          <h1 className="ev-headline ev-stagger-2">
            <span className="ev-headline-line1">Every change. Every decision.</span>
            <br />
            <span className="ev-headline-line2">One connected history.</span>
          </h1>

          {/* Subtext */}
          <p className="ev-subtext ev-stagger-3">
            AEVORA turns scattered project records into an evidence-backed timeline
            of how every feature evolved.
          </p>
        </div>

        {/* Right: Sign-in card */}
        <div className="ev-card-col">
          <div
            className={`ev-card ev-stagger-4 ${hasErrorShake ? 'ev-shake' : ''} ${
              isSuccess ? 'ev-card-success' : ''
            }`}
          >
          {/* User already signed in notice */}
          {user && (
            <div className="mb-4 p-3 rounded-2xl bg-brand-primary-light dark:bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-between text-xs">
              <span className="text-brand-dark dark:text-white font-medium truncate">
                You're signed in as <strong>{user.email || user.displayName}</strong>
              </span>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  setError(null);
                }}
                className="ml-2 font-bold text-brand-primary hover:underline flex-shrink-0"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="ev-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="ev-form">
            {/* Email */}
            <div className="ev-field">
              <label htmlFor="ev-email" className="ev-label">
                Work Email Address
              </label>
              <div className="ev-input-wrap">
                <Mail size={16} className="ev-input-icon" />
                <input
                  id="ev-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="ev-input"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="ev-field">
              <label htmlFor="ev-password" className="ev-label">
                Password
              </label>
              <div className="ev-input-wrap">
                <Lock size={16} className="ev-input-icon" />
                <input
                  id="ev-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="ev-input ev-input-pw"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ev-pw-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Primary button */}
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="ev-btn-primary"
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 size={16} className="ev-icon-success" />
                  Authenticated
                </>
              ) : isLoading ? (
                <>
                  <Loader2 size={15} className="ev-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in to AEVORA
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Social Auth (Firebase Google & GitHub) */}
          <div className="ev-oauth-group">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isSuccess}
              className="ev-btn-oauth"
              title="Sign in with Google via Firebase"
            >
              <svg className="ev-oauth-icon" viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleGitHubSignIn(false)}
              disabled={isLoading || isSuccess}
              className="ev-btn-oauth"
              title="Sign in with GitHub via Firebase"
            >
              <svg className="ev-oauth-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Continue with GitHub</span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-brand-secondary px-1 pt-0.5">
              <button
                type="button"
                onClick={() => handleGitHubSignIn(true)}
                className="hover:underline text-brand-secondary hover:text-brand-dark dark:hover:text-white"
                title="Prompts GitHub to let you select a different GitHub account"
              >
                Use a different GitHub account
              </button>
              <a
                href="https://github.com/logout"
                target="_blank"
                rel="noreferrer"
                className="hover:underline text-[10px] opacity-75"
                title="If browser auto-signs you in, sign out of GitHub here"
              >
                Sign out of github.com ↗
              </a>
            </div>

            <div className="ev-private-scope-toggle">
              <label className="ev-scope-label">
                <input
                  type="checkbox"
                  checked={includePrivateRepos}
                  onChange={(e) => setIncludePrivateRepos(e.target.checked)}
                  className="ev-scope-checkbox"
                />
                <span className="ev-scope-text">Include private repositories</span>
              </label>
              {includePrivateRepos && (
                <p className="ev-scope-warning">
                  ⚠️ Requesting full <code>repo</code> scope to allow EVOLYRA to track private repositories.
                </p>
              )}
            </div>
          </div>
        </div>
        </div>{/* end ev-card-col */}
      </main>

      {/* ── Lifecycle marquee strip ────────────────────────────────── */}
      <footer className="ev-footer ev-stagger-5">
        <div className="ev-marquee" aria-label="Feature lifecycle stages">
          <div className="ev-marquee-track">
            {[...LIFECYCLE_CHIPS, ...LIFECYCLE_CHIPS].map((chip, i) => (
              <span
                key={i}
                className="ev-chip"
                style={{ '--chip-color': chip.color } as React.CSSProperties}
              >
                <span className="ev-chip-dot" />
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Scoped styles ──────────────────────────────────────────── */}
      <style>{`
        /* ============================================================
           CSS CUSTOM PROPERTIES
           ============================================================ */
        :root {
          --anim-play: running;
        }

        /* ============================================================
           LAYOUT
           ============================================================ */
        .ev-root {
          --bg: #F8F7FF;
          --text-primary: #1a1a2e;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --card-bg: rgba(255, 255, 255, 0.85);
          --card-border: rgba(124, 92, 250, 0.15);
          --card-shadow: 0 8px 32px -4px rgba(124, 92, 250, 0.08),
                         0 4px 16px -2px rgba(0, 0, 0, 0.04);
          --input-bg: #ffffff;
          --input-border: #e2e8f0;
          --input-focus: #7C5CFA;
          --pill-bg: rgba(255, 255, 255, 0.7);
          --pill-border: rgba(196, 181, 253, 0.4);
          --topbar-bg: transparent;
          --footer-bg: rgba(248, 247, 255, 0.8);
          --gradient-1: #7C5CFA;
          --gradient-2: #E85BA8;

          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          color: var(--text-primary);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow-x: hidden;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .ev-root.ev-exit {
          opacity: 0;
          transform: scale(0.99);
          pointer-events: none;
        }

        /* ── Dark mode ─────────────────────────────────────────────── */
        .ev-root.ev-dark {
          --bg: #0f1117;
          --text-primary: #f0f0f5;
          --text-secondary: #94a3b8;
          --text-muted: #64748b;
          --card-bg: rgba(30, 32, 48, 0.85);
          --card-border: rgba(124, 92, 250, 0.2);
          --card-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.3),
                         0 4px 16px -2px rgba(124, 92, 250, 0.06);
          --input-bg: #1a1c2e;
          --input-border: #2e324e;
          --pill-bg: rgba(30, 32, 48, 0.7);
          --pill-border: rgba(124, 92, 250, 0.3);
          --topbar-bg: transparent;
          --footer-bg: rgba(15, 17, 23, 0.8);
        }

        /* ============================================================
           MESH GRADIENT BLOBS
           ============================================================ */
        .ev-blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          animation-play-state: var(--anim-play);
        }
        .ev-blob-1 {
          width: clamp(300px, 50vw, 600px);
          height: clamp(300px, 50vw, 600px);
          top: -10%;
          left: -8%;
          background: radial-gradient(circle, rgba(180, 230, 255, 0.5) 0%, transparent 70%);
          animation: blobDrift1 26s ease-in-out infinite;
        }
        .ev-blob-2 {
          width: clamp(350px, 45vw, 550px);
          height: clamp(350px, 45vw, 550px);
          top: 30%;
          left: 30%;
          background: radial-gradient(circle, rgba(196, 181, 253, 0.45) 0%, transparent 70%);
          animation: blobDrift2 22s ease-in-out infinite;
        }
        .ev-blob-3 {
          width: clamp(280px, 40vw, 500px);
          height: clamp(280px, 40vw, 500px);
          bottom: -8%;
          right: -5%;
          background: radial-gradient(circle, rgba(252, 191, 210, 0.45) 0%, transparent 70%);
          animation: blobDrift3 28s ease-in-out infinite;
        }

        .ev-dark .ev-blob-1 {
          background: radial-gradient(circle, rgba(124, 92, 250, 0.15) 0%, transparent 70%);
        }
        .ev-dark .ev-blob-2 {
          background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
        }
        .ev-dark .ev-blob-3 {
          background: radial-gradient(circle, rgba(232, 91, 168, 0.1) 0%, transparent 70%);
        }

        @keyframes blobDrift1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(30px, 20px, 0) scale(1.06); }
        }
        @keyframes blobDrift2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-25px, 15px, 0) scale(1.08); }
        }
        @keyframes blobDrift3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-20px, -25px, 0) scale(1.05); }
        }

        /* ── Dot grid ──────────────────────────────────────────────── */
        .ev-dot-grid {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: radial-gradient(circle, var(--text-muted) 0.8px, transparent 0.8px);
          background-size: 28px 28px;
          opacity: 0.03;
        }

        /* ============================================================
           TOP BAR
           ============================================================ */
        .ev-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          padding: 16px 40px;
          background: var(--topbar-bg);
          transition: background 0.2s, backdrop-filter 0.2s;
        }
        .ev-topbar-blur {
          background: var(--footer-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .ev-topbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ev-logo-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ev-logo-img {
          width: 28px;
          height: 28px;
          border-radius: 8px;
        }
        .ev-logo-text {
          display: flex;
          flex-direction: column;
        }
        .ev-logo-name {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1;
          color: var(--text-primary);
        }
        .ev-logo-tagline {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .ev-topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Status pill */
        .ev-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          background: var(--pill-bg);
          border: 1px solid var(--pill-border);
          font-size: 11px;
          color: var(--text-secondary);
          backdrop-filter: blur(8px);
        }
        .ev-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
          animation: dotPulse 2s ease-in-out infinite;
          animation-play-state: var(--anim-play);
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        .ev-status-label { font-weight: 500; }
        .ev-status-sep {
          color: var(--text-muted);
          opacity: 0.3;
        }
        .ev-status-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          color: var(--gradient-1);
          font-weight: 500;
        }

        /* Theme toggle */
        .ev-theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--input-border);
          background: var(--card-bg);
          color: var(--text-secondary);
          cursor: pointer;
          transition: transform 0.15s, background 0.15s;
          backdrop-filter: blur(8px);
        }
        .ev-theme-toggle:hover {
          transform: scale(1.08);
          background: var(--pill-bg);
        }
        .ev-theme-toggle:active {
          transform: scale(0.95);
        }

        /* ============================================================
           MAIN CONTENT — TWO COLUMN
           ============================================================ */
        .ev-main {
          position: relative;
          z-index: 10;
          flex: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 60px;
          padding: 20px 40px 0;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        /* Left hero column */
        .ev-hero {
          flex: 1;
          max-width: 560px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        /* Right card column */
        .ev-card-col {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Badge pill */
        .ev-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 999px;
          background: var(--pill-bg);
          border: 1px solid var(--pill-border);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gradient-1);
          margin-bottom: 16px;
          backdrop-filter: blur(6px);
        }
        .ev-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gradient-1);
        }

        /* Headline */
        .ev-headline {
          text-align: left;
          font-size: clamp(36px, 5vw, 58px);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin: 0 0 16px;
          color: var(--text-primary);
        }
        .ev-headline-line2 {
          background: linear-gradient(135deg, var(--gradient-1), var(--gradient-2));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Subtext */
        .ev-subtext {
          text-align: left;
          max-width: 480px;
          font-size: clamp(15px, 1.8vw, 18px);
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0;
        }

        /* ============================================================
           CARD
           ============================================================ */
        .ev-card {
          width: 100%;
          max-width: 420px;
          background: var(--card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          box-shadow: var(--card-shadow);
          padding: 28px;
          margin-bottom: 0;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .ev-card:hover {
          box-shadow: 0 12px 40px -6px rgba(124, 92, 250, 0.12),
                      0 6px 20px -4px rgba(0, 0, 0, 0.06);
        }
        .ev-card-success {
          transform: scale(0.97);
          opacity: 0.8;
          transition: all 0.25s ease;
        }

        /* Error */
        .ev-error {
          padding: 10px 14px;
          margin-bottom: 16px;
          border-radius: 12px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 13px;
          border: 1px solid #fecaca;
          animation: fadeSlideIn 0.3s ease;
        }
        .ev-dark .ev-error {
          background: rgba(220, 38, 38, 0.1);
          border-color: rgba(220, 38, 38, 0.25);
        }

        /* Form */
        .ev-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ev-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ev-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .ev-input-wrap {
          position: relative;
        }
        .ev-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
          transition: color 0.15s;
        }
        .ev-input {
          width: 100%;
          height: 48px;
          padding: 0 14px 0 42px;
          border-radius: 12px;
          border: 1.5px solid var(--input-border);
          background: var(--input-bg);
          color: var(--text-primary);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ev-input::placeholder {
          color: var(--text-muted);
        }
        .ev-input:focus {
          border-color: var(--input-focus);
          box-shadow: 0 0 0 3px rgba(124, 92, 250, 0.1);
        }
        .ev-input:focus ~ .ev-input-icon,
        .ev-input:focus + .ev-input-icon {
          /* We handle this visually via the parent */
        }
        .ev-input-wrap:focus-within .ev-input-icon {
          color: var(--input-focus);
        }
        .ev-input-pw {
          padding-right: 44px;
        }
        .ev-pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.15s, transform 0.1s;
        }
        .ev-pw-toggle:hover {
          color: var(--text-secondary);
        }
        .ev-pw-toggle:active {
          transform: translateY(-50%) scale(0.9);
        }

        /* Primary button */
        .ev-btn-primary {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #7C5CFA, #6C4FE8);
          color: #fff;
          font-size: 14.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.12s, box-shadow 0.12s, opacity 0.12s;
          box-shadow: 0 2px 12px -2px rgba(124, 92, 250, 0.35);
          position: relative;
          overflow: hidden;
        }
        .ev-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px -3px rgba(124, 92, 250, 0.45);
        }
        .ev-btn-primary:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .ev-btn-primary:disabled {
          opacity: 0.7;
          cursor: default;
        }
        .ev-icon-success {
          color: #86efac;
        }
        .ev-spin {
          animation: spin 0.8s linear infinite;
          animation-play-state: var(--anim-play);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* OAuth buttons */
        .ev-oauth-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 14px;
        }
        .ev-btn-oauth {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          border: 1px solid var(--input-border);
          background: var(--input-bg);
          color: var(--text-primary);
          font-size: 13.5px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 0.12s, border-color 0.15s, background-color 0.15s;
        }
        .ev-btn-oauth:hover:not(:disabled) {
          border-color: #7C5CFA;
          background: rgba(124, 92, 250, 0.04);
          transform: translateY(-1px);
        }
        .ev-btn-oauth:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .ev-oauth-icon {
          flex-shrink: 0;
        }
        .ev-private-scope-toggle {
          padding: 6px 4px 2px 4px;
        }
        .ev-scope-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          cursor: pointer;
          user-select: none;
        }
        .ev-scope-checkbox {
          accent-color: #7C5CFA;
          cursor: pointer;
        }
        .ev-scope-warning {
          margin-top: 6px;
          font-size: 11px;
          color: #d97706;
          line-height: 1.4;
          background: rgba(245, 158, 11, 0.08);
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        /* Divider */
        .ev-divider {
          position: relative;
          text-align: center;
          margin: 20px 0;
        }
        .ev-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--input-border);
        }
        .ev-divider-text {
          position: relative;
          padding: 0 12px;
          background: var(--card-bg);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: lowercase;
        }

        /* Demo button */
        .ev-btn-demo {
          width: 100%;
          height: 46px;
          border-radius: 12px;
          border: 1.5px solid var(--card-border);
          background: var(--input-bg);
          color: var(--text-primary);
          font-size: 13.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.12s, border-color 0.15s, box-shadow 0.15s;
        }
        .ev-btn-demo:hover:not(:disabled) {
          border-color: var(--gradient-1);
          box-shadow: 0 0 0 3px rgba(124, 92, 250, 0.06);
          transform: translateY(-1px);
        }
        .ev-btn-demo:active:not(:disabled) {
          transform: scale(0.98);
        }
        .ev-btn-demo:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .ev-sparkle {
          color: var(--gradient-1);
          animation: sparkleTwinkle 4s ease-in-out infinite;
          animation-play-state: var(--anim-play);
        }
        @keyframes sparkleTwinkle {
          0%, 88%, 100% { transform: scale(1) rotate(0deg); opacity: 0.85; }
          93% { transform: scale(1.3) rotate(16deg); opacity: 1; }
        }
        .ev-demo-arrow {
          opacity: 0.4;
          transition: opacity 0.15s, transform 0.15s;
        }
        .ev-btn-demo:hover .ev-demo-arrow {
          opacity: 0.8;
          transform: translateX(2px);
        }
        .ev-demo-hint {
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 8px;
        }

        /* ============================================================
           LIFECYCLE MARQUEE
           ============================================================ */
        .ev-footer {
          position: relative;
          z-index: 10;
          padding: 16px 0 20px;
          overflow: hidden;
          background: var(--footer-bg);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%);
        }
        .ev-marquee {
          overflow: hidden;
        }
        .ev-marquee-track {
          display: flex;
          gap: 14px;
          width: max-content;
          animation: marqueeScroll 30s linear infinite;
          animation-play-state: var(--anim-play);
        }
        .ev-marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes marqueeScroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }

        .ev-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid var(--input-border);
          background: var(--card-bg);
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          white-space: nowrap;
          transition: border-color 0.2s, transform 0.2s;
          backdrop-filter: blur(4px);
        }
        .ev-chip:hover {
          border-color: var(--chip-color, var(--gradient-1));
          transform: translateY(-1px);
        }
        .ev-chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--chip-color, var(--gradient-1));
          opacity: 0.7;
        }

        /* ============================================================
           STAGGERED FADE-UP ON LOAD
           ============================================================ */
        @keyframes fadeSlideIn {
          from { transform: translate3d(0, 14px, 0); opacity: 0; }
          to { transform: translate3d(0, 0, 0); opacity: 1; }
        }
        .ev-stagger-1 { animation: fadeSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0ms both; }
        .ev-stagger-2 { animation: fadeSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 100ms both; }
        .ev-stagger-3 { animation: fadeSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 200ms both; }
        .ev-stagger-4 { animation: fadeSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 300ms both; }
        .ev-stagger-5 { animation: fadeSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 400ms both; }

        /* ============================================================
           ERROR SHAKE
           ============================================================ */
        @keyframes shakeAnim {
          0%, 100% { transform: translate3d(0, 0, 0); }
          20%, 60% { transform: translate3d(-5px, 0, 0); }
          40%, 80% { transform: translate3d(5px, 0, 0); }
        }
        .ev-shake {
          animation: shakeAnim 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }

        /* ============================================================
           PREFERS-REDUCED-MOTION
           ============================================================ */
        @media (prefers-reduced-motion: reduce) {
          *, ::before, ::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .ev-blob,
          .ev-marquee-track,
          .ev-sparkle,
          .ev-status-dot {
            animation: none !important;
          }
          .ev-stagger-1, .ev-stagger-2, .ev-stagger-3,
          .ev-stagger-4, .ev-stagger-5 {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }

        /* ============================================================
           RESPONSIVE
           ============================================================ */
        @media (max-width: 900px) {
          .ev-main {
            flex-direction: column;
            gap: 28px;
            padding: 20px 20px 0;
            align-items: center;
          }
          .ev-hero {
            max-width: 100%;
            align-items: center;
          }
          .ev-headline { text-align: center; }
          .ev-subtext { text-align: center; }
          .ev-card-col { width: 100%; display: flex; justify-content: center; }
          .ev-card { margin-bottom: 24px; }
        }

        @media (max-width: 768px) {
          .ev-topbar { padding: 10px 16px; }
          .ev-status-pill { display: none; }
          .ev-main { padding: 12px 16px 0; gap: 20px; }
          .ev-headline { font-size: clamp(32px, 8vw, 48px); }
          .ev-card {
            max-width: 100%;
            padding: 24px 20px;
            border-radius: 20px;
          }
        }

        @media (max-width: 390px) {
          .ev-headline { font-size: 32px; }
          .ev-subtext { font-size: 14px; }
          .ev-logo-tagline { display: none; }
          .ev-badge { font-size: 9px; padding: 4px 10px; }
        }

        /* Make sure everything fits in one screen at 1440×900 */
        @media (min-width: 1024px) and (min-height: 800px) {
          .ev-main {
            padding-top: 0;
          }
          .ev-root {
            max-height: 100vh;
            max-height: 100dvh;
          }
        }
      `}</style>
    </div>
  );
};
