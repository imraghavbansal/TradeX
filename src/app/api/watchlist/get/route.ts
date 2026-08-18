import { NextResponse } from 'next/server';
import { auth } from '@/lib/better-auth/auth';
import { connectToDatabase } from '../../../../../database/mongoose';
import { Watchlist } from '../../../../../database/models/watchlist.model';
import { getStockQuote, getStockProfile, getStockFinancials } from '@/lib/actions/finnhub.actions';
import { formatMarketCapValue, formatPrice, formatChangePercent } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers as unknown as Headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectToDatabase();
    const items = await Watchlist.find({ userId: session.user.id }).sort({ addedAt: -1 }).lean();

    const enriched = await Promise.all(
      items.map(async (item) => {
        const [quote, profile, financials] = await Promise.all([
          getStockQuote(item.symbol),
          getStockProfile(item.symbol),
          getStockFinancials(item.symbol),
        ]);

        const currentPrice = quote?.c;
        const changePercent = quote?.dp;
        const marketCapUsd = profile?.marketCapitalization ? profile.marketCapitalization * 1_000_000 : undefined;
        const peRatio = financials?.metric?.peBasicExclExtraTTM ?? financials?.metric?.peNormalizedAnnual;

        return {
          userId: item.userId,
          symbol: item.symbol,
          company: item.company,
          addedAt: item.addedAt,
          currentPrice,
          changePercent,
          priceFormatted: typeof currentPrice === 'number' ? formatPrice(currentPrice) : 'N/A',
          changeFormatted: formatChangePercent(changePercent),
          marketCap: marketCapUsd ? formatMarketCapValue(marketCapUsd) : 'N/A',
          peRatio: typeof peRatio === 'number' ? peRatio.toFixed(1) : 'N/A',
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Get watchlist error:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}
