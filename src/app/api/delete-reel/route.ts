import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase, ReelModel } from '@/lib/mongodb';
import { getUserIdFromRequest } from '@/lib/auth';

export async function DELETE(req: Request) {
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
    
    const deleted = await ReelModel.findOneAndDelete({ 
      _id: new mongoose.Types.ObjectId(id), 
      userId: new mongoose.Types.ObjectId(userId) 
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Reel not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Reel deleted successfully' });
  } catch (error) {
    console.error('Delete Reel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
