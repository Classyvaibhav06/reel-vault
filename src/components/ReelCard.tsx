'use client';

import React, { useState } from 'react';
import { ExternalLink, Play, Calendar, Tag, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Reel } from '@/lib/mongodb';

interface ReelCardProps {
  reel: Reel;
  onDelete?: (id: string) => void;
}

const ReelCard: React.FC<ReelCardProps> = ({ reel, onDelete }) => {
  const [imgError, setImgError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeAgo = formatDistanceToNow(new Date(reel.created_at), { addSuffix: true });

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this reel?')) return;

    setIsDeleting(true);
    try {
      const res = await fetch('/api/delete-reel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reel.id }),
      });
      if (res.ok && onDelete) {
        onDelete(reel.id);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent opening if clicking on the delete button or selecting text
    if ((e.target as HTMLElement).closest('button')) return;
    
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    window.open(reel.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-[#18181b] rounded-2xl overflow-hidden border border-white/5 transition-all duration-500 hover:border-purple-500/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col h-full animate-fade-in cursor-pointer select-text"
    >
      {/* ── Thumbnail Section (9:16 Aspect) ────────────────────── */}
      <div className="relative aspect-[9/16] overflow-hidden bg-zinc-950 flex-shrink-0">
        {!imgError ? (
          <img
            src={reel.thumbnail}
            alt={reel.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-black p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Play className="w-8 h-8 text-zinc-700" />
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Metadata Found</p>
            <p className="text-[9px] text-zinc-600 mt-1">Image protected by Instagram CDN</p>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl" />

        {/* Top Info Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-30">
          <div className="flex flex-col gap-2">
            {(() => {
              const styles = {
                Coding: 'bg-blue-600/90 text-white',
                Movies: 'bg-red-600/90 text-white',
                Funny: 'bg-yellow-500/90 text-black',
                Education: 'bg-emerald-600/90 text-white',
                Lifestyle: 'bg-pink-600/90 text-white',
                Gaming: 'bg-indigo-600/90 text-white',
                Other: 'bg-zinc-600/90 text-white',
              }[reel.category as keyof typeof styles] || 'bg-purple-600/90 text-white';

              return (
                <span className={`px-2.5 py-1 rounded-lg backdrop-blur-md text-[9px] font-black uppercase tracking-wider shadow-2xl border border-white/10 ${styles}`}>
                  {reel.category}
                </span>
              );
            })()}
          </div>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-red-400 hover:bg-black/80 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:scale-110 shadow-2xl"
            title="Delete from Vault"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Bottom Title Overlay (Inside Thumbnail Area) */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 drop-shadow-lg group-hover:text-purple-300 transition-colors">
            {reel.title}
          </h3>
        </div>
      </div>

      {/* ── Description Area (Below Thumbnail) ────────────────── */}
      <div className="p-4 flex flex-col gap-3 flex-grow bg-zinc-900/30">
        <p className={`text-[11px] leading-relaxed line-clamp-2 font-medium ${reel.caption ? 'text-zinc-400' : 'text-zinc-600 italic'}`}>
          {reel.caption || 'AI generated summary available soon...'}
        </p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
            <Calendar className="w-3 h-3 text-purple-600" />
            {timeAgo}
          </div>
          
          <div className="flex gap-1.5">
            {reel.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-[9px] font-bold text-purple-400/80">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelCard;
