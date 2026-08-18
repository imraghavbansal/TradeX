import { NextResponse } from 'next/server';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import { auth } from '@/lib/better-auth/auth';
import { getWatchlistSymbolsByEmail } from '@/lib/actions/watchlist.actions';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() || '';

    // 🔹 Fetch results (bypass Next.js cache)
    const results = await searchStocks(q);

    // 🔹 Try to mark items as in the user's watchlist
    try {
      const session = await auth.api.getSession({ headers: request.headers as unknown as Headers });
      if (session?.user?.email) {
        const watchlistSymbols = await getWatchlistSymbolsByEmail(session.user.email);
        const watchlistSet = new Set(watchlistSymbols.map(s => s.toUpperCase()));
        results.forEach(stock => {
          if (watchlistSet.has(stock.symbol.toUpperCase())) {
            stock.isInWatchlist = true;
          }
        });
      }
    } catch (watchlistError) {
      console.warn('⚠️ Failed to fetch watchlist status:', watchlistError);
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error('❌ Search API error:', err);
    return NextResponse.json([], {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
