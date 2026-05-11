import { NextResponse } from 'next/server';
import { connectToDatabase, ReelModel } from '@/lib/mongodb';
import { getUserIdFromRequest } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Reel ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    // Use userId in the query to ensure user ownership
    const reel = await ReelModel.findOne({ _id: id, userId });
    if (!reel) {
      return NextResponse.json({ error: 'Reel not found' }, { status: 404 });
    }

    const url = reel.url;

    // ── 1. Fetch metadata from Instagram ─────────────────────────────────────
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
      
      if (response.ok) {
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
      }
    } catch (err) {
      console.error('Fetch error during refresh:', err);
    }

    // ── 2. Process with Groq AI ──────────────────────────────────────────────
    let title = fetchedTitle || reel.title;
    let caption = fetchedCaption || reel.caption;
    let category = reel.category;
    let tags = reel.tags;
    let thumbnail = fetchedThumbnail || reel.thumbnail;

    const cleanText = (t: string) => (t || '')
      .replace(/^[0-9,]+ likes, [0-9,]+ comments - /i, '')
      .replace(/on Instagram: /i, '')
      .replace(/Instagram/i, '')
      .replace(/^"|"$/g, '')
      .trim();

    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey && (fetchedTitle || fetchedCaption)) {
      try {
        const prompt = `Categorize this Instagram content into: Movies, Coding, Funny, Education, Lifestyle, Gaming, or Other. Rules: "Coding" for any tech/programming. Return JSON: {"title":"Clean title","caption":"2-sentence summary","category":"CategoryName","tags":["tag1","tag2"]}. Context: Title: ${fetchedTitle}, Caption: ${fetchedCaption}`;
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that returns data in JSON format.' },
              { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        let aiResult = data.choices?.[0]?.message?.content;

        if (aiResult) {
          // Robust JSON extraction (removes markdown backticks if present)
          aiResult = aiResult.replace(/```json\s?|```/g, '').trim();
          const parsed = JSON.parse(aiResult);
          
          if (parsed.title) title = cleanText(parsed.title);
          if (parsed.category) category = parsed.category;
          if (parsed.caption) caption = parsed.caption;
          
          // Ensure tags are an array and filter out empty strings
          const aiTags = Array.isArray(parsed.tags) ? parsed.tags : [];
          tags = Array.from(new Set([...aiTags, 'ai-ready', ...(reel.tags || [])])).filter(Boolean);
        }
      } catch (err) {
        console.error('Groq AI Error during refresh:', err);
        // Fall back to original/fetched values on AI error
      }
    }

    // ── 3. Final Fallback & Normalization ──────────────────────────────────
    title = cleanText(title);
    caption = cleanText(caption);
    
    if (!thumbnail) {
      const match = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (match) thumbnail = `https://www.instagram.com/p/${match[2]}/media/?size=l`;
    }

    // ── 4. Update Database ─────────────────────────────────────────────────
    const updatedReel = await ReelModel.findOneAndUpdate(
      { _id: id, userId }, // Extra safety check on update
      { title, caption, category, thumbnail, tags },
      { new: true }
    );

    if (!updatedReel) {
      return NextResponse.json({ error: 'Reel update failed or not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedReel._id.toString(),
      url: updatedReel.url,
      title: updatedReel.title,
      caption: updatedReel.caption,
      category: updatedReel.category,
      thumbnail: updatedReel.thumbnail,
      tags: updatedReel.tags,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Refresh Reel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

