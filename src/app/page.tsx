'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Film, Zap, RefreshCw, X, Tag, LogOut, ImageOff } from 'lucide-react';
import ReelCard from '@/components/ReelCard';
import SaveReelForm from '@/components/SaveReelForm';
import { Reel } from '@/lib/mongodb';

export default function HomePage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);

  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());
  const [thumbRetryKey, setThumbRetryKey] = useState(0);
  const router = useRouter();

  const categories = ["Movies", "Coding", "Funny", "Education", "Lifestyle", "Gaming", "Other"];

  const fetchReels = useCallback(async (manual = false) => {
    const token = localStorage.getItem('reel-vault-token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Show loading state if manual refresh or if we don't have cached data yet
    if (manual || reels.length === 0) setLoading(true);
    if (!manual) setError('');
    
    try {
      const res = await fetch('/api/get-reels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      const freshReels = data.reels || [];
      
      setReels(freshReels);
      
      // Update local cache
      if (typeof window !== 'undefined') {
        localStorage.setItem('reel-vault-cache', JSON.stringify(freshReels));
      }
    } catch {
      // If we have cached data, don't show a hard error, just log it
      if (reels.length === 0 || manual) {
        setError('Could not load your reels. Make sure MongoDB is configured.');
      } else {
        console.error('Background refresh failed');
      }
    } finally {
      setLoading(false);
    }
  }, [reels.length, router]);

  useEffect(() => {
    // 1. Initial Auth Check
    const token = localStorage.getItem('reel-vault-token');
    const storedUser = localStorage.getItem('reel-vault-user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // 2. Try to load from cache immediately on mount
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('reel-vault-cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setReels(parsed);
            setLoading(false); // We have data
          }
        } catch {
          localStorage.removeItem('reel-vault-cache');
        }
      }
    }
    
    fetchReels();
  }, [fetchReels, router]);

  const handleLogout = () => {
    localStorage.removeItem('reel-vault-token');
    localStorage.removeItem('reel-vault-user');
    localStorage.removeItem('reel-vault-cache');
    router.push('/login');
  };

  const handleSyncAll = async () => {
    if (!reels.length || loading) return;
    if (!confirm('This will refetch metadata from Instagram for ALL your reels. It might take a while. Continue?')) return;
    
    setLoading(true);
    const token = localStorage.getItem('reel-vault-token');
    
    // Process in small batches to avoid hitting rate limits too fast
    for (const reel of reels) {
      try {
        await fetch('/api/refresh-reel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ id: reel.id }),
        });
      } catch (err) {
        console.error(`Failed to refresh reel ${reel.id}`, err);
      }
    }
    
    await fetchReels(true);
    setLoading(false);
  };


  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    reels.forEach(r => r.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [reels]);

  const filteredReels = useMemo(() => {
    return reels.filter(reel => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        reel.title.toLowerCase().includes(q) ||
        reel.caption.toLowerCase().includes(q) ||
        reel.tags.some(t => t.toLowerCase().includes(q));
      
      const matchesTag = !activeTag || reel.tags.includes(activeTag);
      const matchesCategory = !activeCategory || reel.category === activeCategory;
      
      let matchesDate = true;
      if (activeDateFilter) {
        const now = new Date();
        const created = new Date(reel.created_at);
        const diffMs = now.getTime() - created.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (activeDateFilter === '1 Day') matchesDate = diffDays <= 1;
        else if (activeDateFilter === '3 Days') matchesDate = diffDays <= 3;
        else if (activeDateFilter === '1 Week') matchesDate = diffDays <= 7;
        else if (activeDateFilter === '3 Weeks') matchesDate = diffDays <= 21;
        else if (activeDateFilter === '1 Month') matchesDate = diffDays <= 30;
      }
      
      return matchesSearch && matchesTag && matchesCategory && matchesDate;
    });
  }, [reels, searchQuery, activeTag, activeCategory, activeDateFilter]);


  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl gradient-border flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2))' }}>
                <Film className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text tracking-tight">Reel Vault</h1>
              <p className="text-[10px] text-zinc-500 -mt-0.5">
                {reels.length} reel{reels.length !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {user && (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Logged in as</span>
                <span className="text-xs font-semibold text-zinc-300">{user.name}</span>
              </div>
            )}
            <button
              onClick={handleSyncAll}
              disabled={loading}
              className="p-2 rounded-lg text-zinc-400 hover:text-purple-400 hover:bg-purple-500/5 transition-all duration-200"
              title="Sync All Metadata from Instagram"
            >
              <Zap className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={() => fetchReels(true)}
              disabled={loading}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
               style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc' }}>
            <Zap className="w-3 h-3" />
            AI-powered reel organization
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            Your{' '}
            <span className="gradient-text">Reel Vault</span>
          </h2>
          <p className="text-zinc-400 text-base max-w-md mx-auto">
            Share any link to save it here — Gemini auto-categorizes and generates captions for you.
          </p>
        </div>
        <SaveReelForm onSuccess={() => fetchReels(true)} />

        {/* Search */}
        <div className="mb-8 animate-fade-in stagger-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="search"
              className="input-field pl-10 pr-4"
              placeholder="Search reels, captions, or categories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-4 animate-fade-in stagger-3">
          <button
            onClick={() => setActiveDateFilter(null)}
            className={`tag-chip ${!activeDateFilter ? 'tag-chip-active' : ''} cursor-pointer text-[10px]`}
          >
            All Time
          </button>
          {["1 Day", "3 Days", "1 Week", "3 Weeks", "1 Month"].map(label => (
            <button
              key={label}
              onClick={() => setActiveDateFilter(activeDateFilter === label ? null : label)}
              className={`tag-chip cursor-pointer text-[10px] ${activeDateFilter === label ? 'tag-chip-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-8 animate-fade-in stagger-3">
          <button
            onClick={() => setActiveCategory(null)}
            className={`tag-chip ${!activeCategory ? 'tag-chip-active' : ''} cursor-pointer`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`tag-chip cursor-pointer ${activeCategory === cat ? 'tag-chip-active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>


        {/* Tag Filter Chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 animate-fade-in stagger-4">
            <button
              onClick={() => setActiveTag(null)}
              className={`tag-chip ${!activeTag ? 'tag-chip-active' : ''} cursor-pointer`}
            >
              <Tag className="w-3 h-3 mr-1" />
              All Tags
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`tag-chip cursor-pointer ${activeTag === tag ? 'tag-chip-active' : ''}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* State: Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <p className="text-zinc-500 text-sm">Loading your reels...</p>
          </div>
        )}

        {/* State: Error */}
        {!loading && error && (
          <div className="text-center py-24 animate-fade-in">
            <div className="glass rounded-2xl p-8 max-w-md mx-auto">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-red-400 font-medium mb-2">{error}</p>
              <p className="text-zinc-500 text-sm mb-5">Check your MONGODB_URI in .env.local</p>
              <button onClick={() => fetchReels(true)} className="btn-primary">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          </div>
        )}

        {/* State: Empty */}
        {!loading && !error && reels.length === 0 && (
          <div className="text-center py-24 animate-fade-in">
            <div className="glass rounded-2xl p-10 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse-glow"
                   style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.3))' }}>
                <Film className="w-8 h-8 text-purple-300" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No reels yet</h3>
              <p className="text-zinc-400 text-sm">
                Share an Instagram reel to this app from your Android share sheet to save it here.
              </p>
            </div>
          </div>
        )}

        {/* State: No results */}
        {!loading && !error && reels.length > 0 && filteredReels.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <p className="text-zinc-400">No reels match your search.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveTag(null); }}
              className="mt-3 text-purple-400 hover:text-purple-300 text-sm underline transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Reel Grid */}
        {!loading && !error && filteredReels.length > 0 && (
          <>
            {/* Thumbnail failure banner */}
            {failedThumbs.size > 0 && (
              <div className="mb-5 flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-purple-500/30 animate-fade-in"
                   style={{ background: 'rgba(168,85,247,0.08)' }}>
                <div className="flex items-center gap-2.5">
                  <ImageOff className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <p className="text-xs text-zinc-300">
                    <span className="font-bold text-purple-300">{failedThumbs.size}</span>
                    {' '}thumbnail{failedThumbs.size !== 1 ? 's' : ''} couldn&apos;t load
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFailedThumbs(new Set());
                    setThumbRetryKey(k => k + 1);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/15 border border-purple-500/40 hover:bg-purple-500/25 transition-all duration-200 active:scale-95 whitespace-nowrap flex-shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh All
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredReels.map((reel, i) => (
                <div key={reel.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <ReelCard
                    reel={reel}
                    onDelete={() => fetchReels(true)}
                    onRefresh={() => fetchReels(true)}
                    onThumbnailError={(id) => setFailedThumbs(prev => new Set(prev).add(id))}
                    forceRetryKey={thumbRetryKey}
                  />
                </div>

              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
