'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Film, CheckCircle2, XCircle, Loader2, ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';

type Status = 'idle' | 'saving' | 'success' | 'error' | 'duplicate';

export default function SavePageClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('idle');
  const [savedData, setSavedData] = useState<{ title: string; tags: string[]; url: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sharedUrl, setSharedUrl] = useState('');
  const hasSaved = useRef(false);

  useEffect(() => {
    if (hasSaved.current) return;

    const url =
      searchParams.get('url') ||
      searchParams.get('text') ||
      searchParams.get('title') ||
      '';

    if (!url) {
      setStatus('idle');
      return;
    }

    setSharedUrl(url);
    hasSaved.current = true;
    setStatus('saving');

    const save = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('reel-vault-token') : null;

        const res = await fetch('/api/save-reel', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ url }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Something went wrong');
        }

        setSavedData({
          title: data.data.title,
          tags: data.data.tags,
          url: data.data.url,
        });
        setStatus('success');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    };

    save();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Background Glow */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(168,85,247,0.12), transparent)',
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse-glow"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.3))',
              border: '1px solid rgba(168,85,247,0.4)',
            }}
          >
            <Film className="w-6 h-6 text-purple-300" />
          </div>
          <span className="text-2xl font-bold gradient-text">Reel Vault</span>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-8 text-center animate-fade-in">

          {/* IDLE: No URL shared */}
          {status === 'idle' && (
            <>
              <div className="text-5xl mb-4">📲</div>
              <h1 className="text-xl font-bold mb-2">Share a Reel Here</h1>
              <p className="text-zinc-400 text-sm mb-6">
                Open Instagram, tap <strong className="text-white">Share → Reel Vault</strong> to save a reel automatically.
              </p>
              <Link href="/" className="btn-primary w-full justify-center">
                <ArrowLeft className="w-4 h-4" />
                Go to My Vault
              </Link>
            </>
          )}

          {/* SAVING */}
          {status === 'saving' && (
            <>
              <div className="flex items-center justify-center mb-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
                </div>
              </div>
              <h1 className="text-xl font-bold mb-2">Saving Your Reel</h1>
              <p className="text-zinc-400 text-sm mb-1">Claude is generating title &amp; tags...</p>
              {sharedUrl && (
                <p className="text-zinc-600 text-xs font-mono truncate px-4">{sharedUrl}</p>
              )}
            </>
          )}

          {/* SUCCESS */}
          {status === 'success' && savedData && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                     style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <h1 className="text-xl font-bold mb-1 text-green-400">Reel Saved!</h1>
              <p className="text-white font-semibold text-base mb-3 line-clamp-2 px-2">
                {savedData.title}
              </p>
              {savedData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mb-5">
                  {savedData.tags.map(t => (
                    <span key={t} className="tag-chip">#{t}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-3">
                <a
                  href={savedData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Original Reel
                </a>
                <Link href="/" className="btn-primary">
                  <Film className="w-4 h-4" />
                  Go to My Vault
                </Link>
              </div>
            </>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                     style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <h1 className="text-xl font-bold mb-2 text-red-400">Save Failed</h1>
              <p className="text-zinc-400 text-sm mb-5">
                {errorMsg || 'Something went wrong. Please try again.'}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { hasSaved.current = false; setStatus('idle'); }}
                  className="btn-primary"
                >
                  <Loader2 className="w-4 h-4" />
                  Retry
                </button>
                <Link href="/" className="text-zinc-400 hover:text-white text-sm transition-colors">
                  ← Back to Vault
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Instructions hint */}
        {status === 'idle' && (
          <div className="mt-6 glass rounded-2xl p-4 text-left animate-fade-in stagger-2">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mb-3">How it works</p>
            <ol className="space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2.5"><span className="text-purple-400 font-bold">1.</span> Install Reel Vault as a PWA on Android</li>
              <li className="flex gap-2.5"><span className="text-purple-400 font-bold">2.</span> Open any Instagram reel</li>
              <li className="flex gap-2.5"><span className="text-purple-400 font-bold">3.</span> Tap Share → select Reel Vault</li>
              <li className="flex gap-2.5"><span className="text-purple-400 font-bold">4.</span> AI auto-generates title &amp; tags ✨</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
