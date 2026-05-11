import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const memCache = new Map<string, { buffer: Buffer; contentType: string; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (CDN URLs are usually stable for a day)

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.instagram.com/',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  for (let i = 0; i <= retries; i++) {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        headers: browserHeaders,
        signal: controller.signal,
        cache: 'no-store'
      });

      if (res.ok) {
        clearTimeout(timeoutId);
        return res;
      }
      
      const status = res.status;
      if (status === 403 || status === 404) {
        // If it's a hard block, don't waste time retrying much
        if (i === retries) throw new Error(`HTTP ${status} from Instagram`);
      }
      
      if (i < retries) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    } catch (err: any) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  throw new Error('Failed after retries');
}

export async function GET(req: Request) {
  const fullUrl = new URL(req.url);
  // Fix: Extract everything after ?url= to support IG query params like &_nc_ht=...
  let url = fullUrl.searchParams.get('url');
  
  if (!url) {
    const rawUrl = req.url.split('url=')[1];
    if (rawUrl) url = decodeURIComponent(rawUrl);
  }

  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  // Serve from in-memory cache
  const cached = memCache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'X-Cache': 'HIT',
      },
    });
  }


  try {
    const upstream = await fetchWithRetry(url);
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 0) {
      memCache.set(url, { buffer, contentType, ts: Date.now() });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'MISS',
      },
    });

  } catch (err: any) {
    console.error(`[proxy-thumbnail] Proxy failed for ${url.substring(0, 60)}... :`, err.message);
    // Fallback: If local proxy fails, return a redirect to Google's focus proxy as a last resort
    const fallback = `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=2592000&url=${encodeURIComponent(url)}`;
    return NextResponse.redirect(fallback);
  }
}

