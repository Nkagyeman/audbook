'use client';

import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, fetchAllProgressFromCloud } from '@/lib/supabase';
import { db } from '@/lib/db';
import { 
  X, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Mail, 
  RotateCw, 
  LogOut, 
  Sparkles,
  Smartphone,
  Laptop
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSyncComplete }: AuthModalProps) {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const configured = isSupabaseConfigured();

  // Check active user on mount / open
  useEffect(() => {
    if (!configured || !supabase) return;

    const client = supabase;
    const checkUser = async () => {
      const { data: { session } } = await client.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkUser();

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [configured]);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !configured) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      if (isSignUp) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data?.session) {
          setUser(data.session.user);
          setStatusMessage({ text: 'Account created and logged in! Progress is now syncing.', type: 'success' });
          handleSyncAll();
        } else {
          setStatusMessage({ text: 'Confirmation email sent! Please check your inbox.', type: 'success' });
        }
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setUser(data.user);
        setStatusMessage({ text: 'Signed in successfully!', type: 'success' });
        handleSyncAll();
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Authentication failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setStatusMessage({ text: 'Signed out. Reading locally.', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setStatusMessage(null);

    try {
      // 1. Pull cloud progress
      const cloudMap = await fetchAllProgressFromCloud();

      // 2. Compare with local IndexedDB and merge
      const localBooks = await db.books.toArray();
      let updatedCount = 0;

      for (const b of localBooks) {
        const cloudProg = cloudMap[b.id];
        if (cloudProg && cloudProg.last_read_at > (b.lastReadAt || 0)) {
          // Cloud has newer progress -> update local DB
          await db.books.update(b.id, {
            currentChapterIndex: cloudProg.current_chapter_index,
            currentParagraphIndex: cloudProg.current_paragraph_index,
            currentWordIndex: cloudProg.current_word_index,
            currentAudioTimestamp: cloudProg.current_audio_timestamp,
            readingProgress: cloudProg.reading_progress,
            lastReadAt: cloudProg.last_read_at,
          });

          try {
            localStorage.setItem(`audbook_prog_${b.id}`, JSON.stringify({
              currentChapterIndex: cloudProg.current_chapter_index,
              currentParagraphIndex: cloudProg.current_paragraph_index,
              currentWordIndex: cloudProg.current_word_index,
              currentAudioTimestamp: cloudProg.current_audio_timestamp,
              readingProgress: cloudProg.reading_progress,
              lastReadAt: cloudProg.last_read_at,
            }));
          } catch (e) {}

          updatedCount++;
        }
      }

      setStatusMessage({ 
        text: `Sync complete! Synced ${Object.keys(cloudMap).length} books from cloud (${updatedCount} updated locally).`, 
        type: 'success' 
      });

      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setStatusMessage({ text: 'Sync failed: ' + err.message, type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-ink)]">
                Cross-Device Sync
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Sync reading & audio progress between Phone & Laptop
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
              : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* If Supabase is NOT configured yet */}
        {!configured ? (
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 text-amber-700 dark:text-amber-300">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                <span>Supabase Not Yet Connected</span>
              </div>
              <p className="leading-relaxed">
                To sync your progress between your phone and laptop, add your free Supabase credentials to <code className="font-mono bg-black/10 px-1 py-0.5 rounded">.env.local</code>:
              </p>
              <pre className="p-2.5 rounded bg-black/15 font-mono text-[10px] overflow-x-auto text-[var(--text-ink)]">
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
              </pre>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Run <code className="font-mono">supabase_schema.sql</code> in your Supabase SQL editor.</span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[var(--text-ink)] text-[var(--bg-surface)] text-xs font-semibold"
            >
              Got it
            </button>
          </div>
        ) : user ? (
          /* User Logged In State */
          <div className="py-6 space-y-5">
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Signed in as:</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Synced
                </span>
              </div>
              <div className="text-sm font-semibold text-[var(--text-ink)] font-mono">
                {user.email}
              </div>
            </div>

            {/* Sync Visual */}
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-1">
                <Smartphone className="h-5 w-5 mx-auto text-blue-500" />
                <div className="font-semibold text-[var(--text-ink)]">Phone</div>
                <div className="text-[10px] text-[var(--text-muted)]">Real-time sync</div>
              </div>
              <div className="p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-1">
                <Laptop className="h-5 w-5 mx-auto text-emerald-500" />
                <div className="font-semibold text-[var(--text-ink)]">Laptop</div>
                <div className="text-[10px] text-[var(--text-muted)]">Real-time sync</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing with Cloud...' : 'Sync Progress Now'}</span>
              </button>

              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* User Not Logged In State (Login / Sign Up Form) */
          <form onSubmit={handleAuth} className="py-6 space-y-4">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Sign in with the same account on your phone and laptop so your playback position, chapter, and reading percentage sync automatically.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs text-[var(--text-ink)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs text-[var(--text-ink)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[var(--text-ink)] text-[var(--bg-surface)] text-xs font-semibold transition-opacity disabled:opacity-50"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Sync Account' : 'Sign In & Sync'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setStatusMessage(null); }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
