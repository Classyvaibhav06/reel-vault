'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Trash2, Loader2, RefreshCw, ImageOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Reel } from '@/lib/mongodb';

// ─── Utils ─────────────────────────────────────────────────────────────────
const THUMB_CACHE_KEY = 'reel-vault-thumb-cache-v3'; // Incremented version to clear old broken cache

function getCachedThumb(reelId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(THUMB_CACHE_KEY);
    if (!raw) return null;
    const map: Record<string, string> = JSON.parse(raw);
    return map[reelId] ?? null;
  } catch { return null; }
}

function setCachedThumb(reelId: string, url: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(THUMB_CACHE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[reelId] = url;
    localStorage.setItem(THUMB_CACHE_KEY, JSON.stringify(map));
  } catch { }
}

function getShortcode(url: string): string | null {
  try {
    const parts = url.split('/');
    const pIndex = parts.findIndex(p => p === 'p' || p === 'reels' || p === 'reel');
    if (pIndex !== -1 && parts[pIndex + 1]) {
      return parts[pIndex + 1].split('?')[0];
    }
    return null;
  } catch { return null; }
}

/** Google's Powerful Image Proxy */
function googleProxy(url: string) {
  return `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(url)}`;
}

// ─── Component ──────────────────────────────────────────────────────────────
type LoadStage = 'original' | 'redirect' | 'google_proxy' | 'failed';

const ReelCard: React.FC<{ 
  reel: Reel; 
  onDelete?: (id: string) => void; 
  onRefresh?: (id: string) => void;
  onThumbnailError?: (id: string) => void; 
  forceRetryKey?: number; 
}> = ({ 
  reel, onDelete, onRefresh, onThumbnailError, forceRetryKey = 0 
}) => {

  const shortcode = useMemo(() => getShortcode(reel.url), [reel.url]);
  const cached = getCachedThumb(reel.id);
  
  const [stage, setStage] = useState<LoadStage>(cached ? 'google_proxy' : 'original');
  const [imgSrc, setImgSrc] = useState(cached || reel.thumbnail);
  const [imgError, setImgError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const handleNextStage = useCallback(() => {
    if (stage === 'original') {
      if (shortcode) {
        // Step 2: Try Instagram's media redirect
        setImgSrc(`https://www.instagram.com/p/${shortcode}/media/?size=l`);
        setStage('redirect');
      } else {
        // Skip to Google Proxy
        setImgSrc(googleProxy(reel.thumbnail));
        setStage('google_proxy');
      }
    } else if (stage === 'redirect') {
      // Step 3: Use Google Proxy on the original thumbnail
      setImgSrc(googleProxy(reel.thumbnail));
      setStage('google_proxy');
    } else {
      // Total failure
      setImgError(true);
      setStage('failed');
      onThumbnailError?.(reel.id);
    }
  }, [stage, reel.thumbnail, shortcode, reel.id, onThumbnailError]);

  useEffect(() => {
    if (forceRetryKey > 0) {
      setImgError(false);
      setStage('original');
      setImgSrc(reel.thumbnail);
    }
  }, [forceRetryKey, reel.thumbnail]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Delete this reel?')) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('reel-vault-token');
      await fetch('/api/delete-reel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: reel.id }),
      });
      if (onDelete) onDelete(reel.id);
    } catch { }
    finally { setIsDeleting(false); }
  };

  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('reel-vault-token');
      const res = await fetch('/api/refresh-reel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: reel.id }),
      });
      if (res.ok && onRefresh) {
        onRefresh(reel.id);
      }
    } catch { }
    finally { setIsRefreshing(false); }
  };


  return (
    <div
      onClick={() => window.open(reel.url, '_blank', 'noopener,noreferrer')}
      className="group relative bg-[#18181b] rounded-2xl overflow-hidden border border-white/5 hover:border-purple-500/50 transition-all cursor-pointer aspect-[9/16] flex flex-col"
    >
      <div className="relative flex-grow overflow-hidden bg-zinc-950">
        {!imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={imgSrc}
            src={imgSrc}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onLoad={() => {
              if (stage !== 'original') setCachedThumb(reel.id, imgSrc);
            }}
            onError={handleNextStage}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 p-4 text-center">
            <ImageOff className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-[10px] text-zinc-500 font-bold uppercase">Dead Link</p>
          </div>
        )}

        {!imgError && stage !== 'original' && (
          <div className="absolute inset-0 pointer-events-none bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent opacity-90" />
        
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-30">
          <span className="px-2 py-0.5 rounded-md bg-purple-600/90 text-white text-[9px] font-black uppercase tracking-wider">
            {reel.category}
          </span>
          <button onClick={handleDelete} className="p-1.5 rounded-full bg-black/40 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
          <button onClick={handleRefresh} className="p-1.5 rounded-full bg-black/40 text-zinc-400 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>


        <div className="absolute bottom-3 left-3 right-3 z-20">
          <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight drop-shadow-lg">
            {reel.title}
          </h3>
        </div>
      </div>

      <div className="p-2.5 bg-zinc-900/60 border-t border-white/5">
        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter truncate">
          {formatDistanceToNow(new Date(reel.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

export default ReelCard;
