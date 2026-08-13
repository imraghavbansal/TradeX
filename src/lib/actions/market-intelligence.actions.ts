'use server';

import { cache } from 'react';
import { connectToDatabase } from '../../../database/mongoose';
import { MarketSnapshotModel } from '../../../database/models/market-snapshot.model';
import { getStockQuote, getStockFinancials, getStockProfile, getNews } from '@/lib/actions/finnhub.actions';
import { POPULAR_STOCK_SYMBOLS } from '@/lib/constants';
import { formatPrice, formatChangePercent } from '@/lib/utils';

const BENCHMARK_SYMBOL = 'SPY';
const NEAR_52W_THRESHOLD = 0.02; // 2%

// Writers — called on a schedule by two separate Inngest crons, never by a
// user-facing request. These are the only places that fan out Finnhub calls
// across the whole tracked universe (~50 symbols); every reader below only
// ever reads what these last wrote. Split into two cadences because prices
// change constantly but company name / 52-week range barely do: refreshing
// both at the same frequency would triple the call volume of every tick for
// no benefit, and — as observed running this for real — even a rate-limited
// ~150-call burst takes long enough that it risks overlapping the next tick.
export async function refreshMarketQuotes(): Promise<{ refreshed: number }> {
    await connectToDatabase();
    const symbols = Array.from(new Set([...POPULAR_STOCK_SYMBOLS, BENCHMARK_SYMBOL]));

    const quotes = await Promise.all(symbols.map(async (symbol) => ({ symbol, quote: await getStockQuote(symbol) })));

    await Promise.all(
        quotes.map(({ symbol, quote }) =>
            MarketSnapshotModel.findOneAndUpdate(
                { symbol },
                {
                    $set: {
                        symbol,
                        price: typeof quote?.c === 'number' ? quote.c : null,
                        changePercent: typeof quote?.dp === 'number' ? quote.dp : null,
                        updatedAt: new Date(),
                    },
                    $setOnInsert: { company: symbol },
                },
                { upsert: true }
            )
        )
    );

    return { refreshed: quotes.length };
}

export async function refreshMarketProfiles(): Promise<{ refreshed: number }> {
    await connectToDatabase();
    const symbols = Array.from(new Set([...POPULAR_STOCK_SYMBOLS, BENCHMARK_SYMBOL]));

    const results = await Promise.all(
        symbols.map(async (symbol) => {
            const [profile, financials] = await Promise.all([getStockProfile(symbol), getStockFinancials(symbol)]);
            return { symbol, profile, financials };
        })
    );

    await Promise.all(
        results.map(({ symbol, profile, financials }) =>
            MarketSnapshotModel.findOneAndUpdate(
                { symbol },
                {
                    $set: {
                        symbol,
                        company: profile?.name || symbol,
                        fiftyTwoWeekHigh: financials?.metric?.['52WeekHigh'] ?? null,
                        fiftyTwoWeekLow: financials?.metric?.['52WeekLow'] ?? null,
                    },
                },
                { upsert: true }
            )
        )
    );

    return { refreshed: results.length };
}

type SnapshotDoc = {
    symbol: string;
    company: string;
    price: number | null;
    changePercent: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
};

const getSnapshot = cache(async (): Promise<SnapshotDoc[]> => {
    await connectToDatabase();
    return MarketSnapshotModel.find().lean();
});

export type MarketMover = {
    symbol: string;
    company: string;
    price: number;
    changePercent: number;
};

export type MarketMoversResult = {
    gainers: MarketMover[];
    losers: MarketMover[];
    benchmark: MarketMover | null;
};

const MOVERS_PER_SIDE = 10;

export const getMarketMovers = cache(async (): Promise<MarketMoversResult> => {
    const snapshot = await getSnapshot();

    const withPrices = snapshot.filter(
        (s) => s.symbol !== BENCHMARK_SYMBOL && typeof s.price === 'number' && typeof s.changePercent === 'number'
    ) as Array<SnapshotDoc & { price: number; changePercent: number }>;

    const sorted = [...withPrices].sort((a, b) => b.changePercent - a.changePercent);
    const gainers = sorted.filter((s) => s.changePercent > 0).slice(0, MOVERS_PER_SIDE);
    const losers = sorted
        .filter((s) => s.changePercent < 0)
        .slice(-MOVERS_PER_SIDE)
        .reverse();

    const toMover = (s: SnapshotDoc & { price: number; changePercent: number }): MarketMover => ({
        symbol: s.symbol,
        company: s.company,
        price: s.price,
        changePercent: s.changePercent,
    });

    const benchmarkDoc = snapshot.find((s) => s.symbol === BENCHMARK_SYMBOL);
    const benchmark =
        benchmarkDoc && typeof benchmarkDoc.price === 'number' && typeof benchmarkDoc.changePercent === 'number'
            ? { symbol: BENCHMARK_SYMBOL, company: 'S&P 500', price: benchmarkDoc.price, changePercent: benchmarkDoc.changePercent }
            : null;

    return { gainers: gainers.map(toMover), losers: losers.map(toMover), benchmark };
});

export type UnusualActivityItem = {
    symbol: string;
    company: string;
    price: number;
    changePercent: number;
    tags: string[];
};

const BIG_MOVE_THRESHOLD = 3; // percent

export const getUnusualActivity = cache(async (): Promise<UnusualActivityItem[]> => {
    const snapshot = await getSnapshot();

    const flagged = snapshot
        .filter((s) => s.symbol !== BENCHMARK_SYMBOL && typeof s.price === 'number' && typeof s.changePercent === 'number')
        .map((s) => {
            const price = s.price as number;
            const changePercent = s.changePercent as number;
            const tags: string[] = [];

            if (Math.abs(changePercent) >= BIG_MOVE_THRESHOLD) {
                tags.push(changePercent > 0 ? 'Big Move Up' : 'Big Move Down');
            }

            const high52 = s.fiftyTwoWeekHigh;
            const low52 = s.fiftyTwoWeekLow;
            if (typeof high52 === 'number' && high52 > 0 && price >= high52 * (1 - NEAR_52W_THRESHOLD)) {
                tags.push('Near 52W High');
            } else if (typeof low52 === 'number' && low52 > 0 && price <= low52 * (1 + NEAR_52W_THRESHOLD)) {
                tags.push('Near 52W Low');
            }

            if (tags.length === 0) return null;
            return { symbol: s.symbol, company: s.company, price, changePercent, tags } satisfies UnusualActivityItem;
        })
        .filter((x): x is UnusualActivityItem => x !== null);

    return flagged.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 12);
});

export type WhyIsItMoving = {
    symbol: string;
    price: number;
    changePercent: number;
    benchmarkChangePercent: number | null;
    relativePerformance: 'outperforming' | 'underperforming' | 'in line with' | 'unknown';
    near52WeekHigh: boolean;
    near52WeekLow: boolean;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    topNews: { headline: string; url: string; source: string }[];
    summary: string[];
};

// Unlike the two readers above, this serves a single symbol a user actually
// asked about (stock detail page, Market Pulse callout) — that's one request
// per view, not a fan-out across the tracked universe, so it fetches live
// rather than depending on the symbol being in the pre-scanned snapshot
// (which only covers POPULAR_STOCK_SYMBOLS, not arbitrary watchlist symbols).
export const getWhyIsItMoving = cache(async (symbol: string): Promise<WhyIsItMoving> => {
    const upperSymbol = symbol.toUpperCase();

    const [quote, financials, benchmarkQuote, news] = await Promise.all([
        getStockQuote(upperSymbol),
        getStockFinancials(upperSymbol),
        getStockQuote(BENCHMARK_SYMBOL),
        getNews([upperSymbol]).catch(() => []),
    ]);

    const price = quote?.c ?? 0;
    const changePercent = quote?.dp ?? 0;
    const benchmarkChangePercent = typeof benchmarkQuote?.dp === 'number' ? benchmarkQuote.dp : null;

    let relativePerformance: WhyIsItMoving['relativePerformance'] = 'unknown';
    if (benchmarkChangePercent !== null) {
        const gap = changePercent - benchmarkChangePercent;
        if (Math.sign(changePercent) !== Math.sign(benchmarkChangePercent) && Math.abs(changePercent) > 0.5) {
            relativePerformance = changePercent > benchmarkChangePercent ? 'outperforming' : 'underperforming';
        } else if (Math.abs(gap) < 0.3) {
            relativePerformance = 'in line with';
        } else {
            relativePerformance = gap > 0 ? 'outperforming' : 'underperforming';
        }
    }

    const high52 = financials?.metric?.['52WeekHigh'] ?? null;
    const low52 = financials?.metric?.['52WeekLow'] ?? null;
    const near52WeekHigh = typeof high52 === 'number' && high52 > 0 && price >= high52 * (1 - NEAR_52W_THRESHOLD);
    const near52WeekLow = typeof low52 === 'number' && low52 > 0 && price <= low52 * (1 + NEAR_52W_THRESHOLD);

    const summary: string[] = [];
    summary.push(
        `${upperSymbol} is ${changePercent >= 0 ? 'up' : 'down'} ${formatChangePercent(changePercent).replace('+', '')} today to ${formatPrice(price)}.`
    );
    if (benchmarkChangePercent !== null) {
        summary.push(
            `That's ${relativePerformance} the broader market (${BENCHMARK_SYMBOL} ${formatChangePercent(benchmarkChangePercent)}).`
        );
    }
    if (near52WeekHigh && high52) {
        summary.push(`It's trading within 2% of its 52-week high of ${formatPrice(high52)}.`);
    } else if (near52WeekLow && low52) {
        summary.push(`It's trading within 2% of its 52-week low of ${formatPrice(low52)}.`);
    }

    const topNews = (news || []).slice(0, 3).map((n) => ({ headline: n.headline, url: n.url, source: n.source }));
    if (topNews.length > 0) {
        summary.push(`Recent headline: "${topNews[0].headline}" (${topNews[0].source}).`);
    }

    return {
        symbol: upperSymbol,
        price,
        changePercent,
        benchmarkChangePercent,
        relativePerformance,
        near52WeekHigh,
        near52WeekLow,
        fiftyTwoWeekHigh: typeof high52 === 'number' ? high52 : null,
        fiftyTwoWeekLow: typeof low52 === 'number' ? low52 : null,
        topNews,
        summary,
    };
});
