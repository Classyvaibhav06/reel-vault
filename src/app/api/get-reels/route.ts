import { NextResponse } from 'next/server';
import { connectToDatabase, ReelModel, Reel } from '@/lib/mongodb';

export const dynamic = 'force-dynamic'; // Always fresh, never cached

export async function GET() {
  try {
    await connectToDatabase();

    const docs = await ReelModel.find({}).sort({ created_at: -1 }).lean();

    interface RawDoc {
      _id: { toString(): string };
      url: string;
      title: string;
      caption?: string;
      category?: string;
      thumbnail: string;
      tags: string[];
      created_at: Date;
    }

    const reels: Reel[] = (docs as unknown as RawDoc[]).map((doc) => {
      let category = doc.category || 'Other';
      let needsUpdate = false;
      
      // On-the-fly categorization for "Other" reels
      if (category === 'Other') {
        const text = (doc.title + ' ' + (doc.caption || '')).toLowerCase();
        if (text.includes('code') || text.includes('vs code') || text.includes('programming') || text.includes('dev') || text.includes('software')) {
          category = 'Coding';
          needsUpdate = true;
        } else if (text.includes('movie') || text.includes('cinema') || text.includes('film')) {
          category = 'Movies';
          needsUpdate = true;
        } else if (text.includes('funny') || text.includes('lol') || text.includes('haha')) {
          category = 'Funny';
          needsUpdate = true;
        }

        // Persist the change to DB so we don't calculate it again
        if (needsUpdate) {
          ReelModel.findByIdAndUpdate(doc._id, { category }).exec().catch(err => 
            console.error('Failed to persist category update:', err)
          );
        }
      }

      return {
        id:         doc._id.toString(),
        url:        doc.url,
        title:      doc.title,
        caption:    doc.caption || '',
        category:   category,
        thumbnail:  doc.thumbnail,
        tags:       doc.tags,
        created_at: (doc.created_at as Date).toISOString(),
      };
    });

    return NextResponse.json({ reels });
  } catch (error) {
    console.error('Get Reels API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
