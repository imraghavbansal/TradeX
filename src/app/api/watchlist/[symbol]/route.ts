import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '../../../../../database/mongoose';
import { Watchlist } from '../../../../../database/models/watchlist.model';

export async function DELETE(request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol } = await context.params;

    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: request.headers as unknown as Headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectToDatabase();

    const result = await Watchlist.findOneAndDelete({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    if (!result) {
      return NextResponse.json({ error: 'Not found in watchlist' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Removed from watchlist' });
  } catch (error) {
    console.error('Watchlist remove error:', error);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
}
