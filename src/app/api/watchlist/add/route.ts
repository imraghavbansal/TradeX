import { NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '../../../../../database/mongoose';
import { Watchlist } from '../../../../../database/models/watchlist.model';

export async function POST(request: Request) {
  try {
    const { symbol, company } = await request.json();

    if (!symbol || !company) {
      return NextResponse.json({ error: 'Missing symbol or company' }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: request.headers as unknown as Headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectToDatabase();

    const result = await Watchlist.create({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      company,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Stock already in watchlist' }, { status: 409 });
    }
    console.error('Watchlist add error:', error);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
}
