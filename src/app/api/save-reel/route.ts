import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDatabase, ReelModel } from '@/lib/mongodb';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // ── 1. Fetch metadata ──────────────────────────────────────────────────
    let fetchedTitle = '';
    let fetchedCaption = '';
    let fetchedThumbnail = '';

    try {
      const response = await fetch(url.split('?')[0], {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1',
          'Accept': 'text/html',
        },
      });
      const html = await response.text();

      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)?.[1];
      const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)?.[1];
      const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i)?.[1];

      const decode = (str: string) => str
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2026;/g, '...');

      if (ogTitle) fetchedTitle = decode(ogTitle);
      if (ogDescription) fetchedCaption = decode(ogDescription);
      if (ogImage) fetchedThumbnail = ogImage.replace(/&amp;/g, '&');
    } catch {
      console.error('Fetch error occurred');
    }

    // ── 2. Process with Gemini ──────────────────────────────────────────────
    let title = fetchedTitle || 'Saved Reel';
    let caption = fetchedCaption || '';
    let category = 'Other';
    let tags: string[] = ['reel'];
    let thumbnail = fetchedThumbnail || '';

    const cleanText = (t: string) => t.replace(/^[0-9,]+ likes, [0-9,]+ comments - /i, '').replace(/on Instagram: /i, '').replace(/Instagram/i, '').replace(/^"|"$/g, '').trim();

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelNames = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        let aiResult = '';

        for (const mName of modelNames) {
          try {
            const model = genAI.getGenerativeModel({ model: mName });
            const prompt = `Categorize this Instagram content into: Movies, Coding, Funny, Education, Lifestyle, Gaming, or Other. Rules: "Coding" for any tech/programming. Return JSON: {"title":"Clean title","caption":"2-sentence summary","category":"CategoryName","tags":["tag1","tag2"]}. Context: Title: ${fetchedTitle}, Caption: ${fetchedCaption}`;
            const result = await model.generateContent(prompt);
            aiResult = result.response.text();
            if (aiResult) break;
          } catch { }
        }

        const jsonMatch = aiResult?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title) title = cleanText(parsed.title);
          if (parsed.category) category = parsed.category;
          if (parsed.tags) tags = [...parsed.tags, 'ai-ready']; // Add marker
          if (parsed.caption) caption = parsed.caption;
        }
      } catch {
        console.error('AI Error processing');
      }
    }

    // ── 3. Final Fallback & Normalization ──────────────────────────────────
    title = cleanText(title);
    caption = cleanText(caption);
    
    // Force Capitalization
    category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    const validCats = ["Movies", "Coding", "Funny", "Education", "Lifestyle", "Gaming", "Other"];
    
    if (!validCats.includes(category) || category === "Other") {
      const combined = (title + " " + caption).toLowerCase();
      if (combined.includes('code') || combined.includes('dev') || combined.includes('software') || combined.includes('python') || combined.includes('vs code')) {
        category = "Coding";
      }
    }

    if (!caption || caption.length < 5) caption = `Saved in ${category}.`;
    if (!thumbnail) {
      const match = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (match) thumbnail = `https://www.instagram.com/p/${match[2]}/media/?size=l`;
    }

    // ── 4. Save ────────────────────────────────────────────────────────────
    await connectToDatabase();
    const newReel = await ReelModel.create({ userId, url, title, caption, category, thumbnail, tags });

    return NextResponse.json({
      id: newReel._id.toString(),
      url: newReel.url,
      title: newReel.title,
      caption: newReel.caption,
      category: newReel.category,
      thumbnail: newReel.thumbnail,
      tags: newReel.tags,
      created_at: newReel.created_at.toISOString(),
    });
  } catch (error) {
    console.error('Save Reel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
