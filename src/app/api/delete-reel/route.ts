import { NextResponse } from 'next/server';
import { connectToDatabase, ReelModel } from '@/lib/mongodb';

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Reel ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    
    const deleted = await ReelModel.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Reel not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Reel deleted successfully' });
  } catch (error) {
    console.error('Delete Reel API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
