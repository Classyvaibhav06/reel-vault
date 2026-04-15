'use client';

import { useState } from 'react';
import { Plus, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface SaveReelFormProps {
  onSuccess: () => void;
}

export default function SaveReelForm({ onSuccess }: SaveReelFormProps) {
  const [url, setUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch('/api/save-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save reel');
      }

      setStatus({ type: 'success', message: 'Reel saved to your vault!' });
      setUrl('');
      onSuccess();

      // Clear success message after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Something went wrong' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-10 animate-fade-in stagger-1">
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
            <Plus className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Save New Reel</h3>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="relative group">
            <input
              type="url"
              placeholder="Paste Instagram Reel URL here..."
              className="input-field pr-24"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={isSaving}
            />
            <button
              type="submit"
              disabled={isSaving || !url.trim()}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs font-bold transition-all duration-200 flex items-center gap-2 active:scale-95"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Save
                </>
              )}
            </button>
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium animate-slide-in ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              {status.message}
            </div>
          )}
        </form>
        
        <p className="text-[10px] text-zinc-500 mt-3 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          Supports all public Instagram Reel links. Metadata is generated automatically.
        </p>
      </div>
    </div>
  );
}
