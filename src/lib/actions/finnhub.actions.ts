'use server';
import {getDateRange, validateArticle, formatArticle} from '@/lib/utils';
import { POPULAR_STOCK_SYMBOLS } from '../../lib/constants';
import { cache } from 'react';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// The market-intelligence scan fans out dozens of calls (quotes, profiles,
// financials across ~50 symbols) at once. A concurrency cap alone doesn't
// prevent tripping Finnhub's free-tier 60/req-min limit — 5-at-a-time still
// clears 150 calls in well under a minute since each call is fast. What
// actually keeps call volume under the limit is pacing *request starts*
// against a rolling 60s window, not just capping how many are in flight.
const MAX_CONCURRENT_REQUESTS = 5;
let activeRequests = 0;
const requestQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => requestQueue.push(resolve));
}

function releaseSlot() {
  const next = requestQueue.shift();
  if (next) {
    next();
  } else {
    activeRequests--;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Stay comfortably under Finnhub's 60/min free-tier cap so normal traffic
// jitter and retries don't push us over it.
const RATE_LIMIT_PER_MINUTE = 50;
const requestTimestamps: number[] = [];

async function waitForRateLimitSlot(): Promise<void> {
  for (;;) {
    const now = Date.now();
    while (requestTimestamps.length && now - requestTimestamps[0] > 60_000) {
      requestTimestamps.shift();
    }
    if (requestTimestamps.length < RATE_LIMIT_PER_MINUTE) {
      requestTimestamps.push(now);
      return;
    }
    await sleep(60_000 - (now - requestTimestamps[0]) + 25);
  }
}

async function fetchJSON<T>(url: string, revalidateSeconds?: number): Promise<T> {
  const options: RequestInit & { next?: { revalidate?: number } } = revalidateSeconds
    ? { cache: 'force-cache', next: { revalidate: revalidateSeconds } }
    : { cache: 'no-store' };

  await acquireSlot();
  try {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await waitForRateLimitSlot();
      const res = await fetch(url, options);
      if (res.ok) return (await res.json()) as T;

      if (res.status === 429 && attempt < maxAttempts - 1) {
        const retryAfter = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 800 * (attempt + 1));
        continue;
      }

      const text = await res.text().catch(() => '');
      throw new Error(`Fetch failed ${res.status}: ${text}`);
    }
    throw new Error('Fetch failed: exhausted retries');
  } finally {
    releaseSlot();
  }
}

export { fetchJSON };

function getToken(): string | null {
  return process.env.FINNHUB_API_KEY || null;
}

export const getStockQuote = cache(async (symbol: string): Promise<QuoteData | null> => {
  const token = getToken();
  if (!token) return null;
  try {
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol.toUpperCase())}&token=${token}`;
    return await fetchJSON<QuoteData>(url, 30);
  } catch (e) {
    console.error('getStockQuote error:', symbol, e);
    return null;
  }
});

export const getStockProfile = cache(async (symbol: string): Promise<ProfileData | null> => {
  const token = getToken();
  if (!token) return null;
  try {
    const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol.toUpperCase())}&token=${token}`;
    return await fetchJSON<ProfileData>(url, 3600);
  } catch (e) {
    console.error('getStockProfile error:', symbol, e);
    return null;
  }
});

export const getStockFinancials = cache(async (symbol: string): Promise<FinancialsData | null> => {
  const token = getToken();
  if (!token) return null;
  try {
    const url = `${FINNHUB_BASE_URL}/stock/metric?symbol=${encodeURIComponent(symbol.toUpperCase())}&metric=all&token=${token}`;
    return await fetchJSON<FinancialsData>(url, 3600);
  } catch (e) {
    console.error('getStockFinancials error:', symbol, e);
    return null;
  }
});

export async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
  try {
    const range = getDateRange(5);
    const token = process.env.FINNHUB_API_KEY;
    if (!token) {
      throw new Error('FINNHUB API key is not configured');
    }
    const cleanSymbols = (symbols || [])
      .map((s) => s?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    const maxArticles = 6;

    // If we have symbols, try to fetch company news per symbol and round-robin select
    if (cleanSymbols.length > 0) {
      const perSymbolArticles: Record<string, RawNewsArticle[]> = {};

      await Promise.all(
        cleanSymbols.map(async (sym) => {
          try {
            const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(sym)}&from=${range.from}&to=${range.to}&token=${token}`;
            const articles = await fetchJSON<RawNewsArticle[]>(url, 300);
            perSymbolArticles[sym] = (articles || []).filter(validateArticle);
          } catch (e) {
            console.error('Error fetching company news for', sym, e);
            perSymbolArticles[sym] = [];
          }
        })
      );

      const collected: MarketNewsArticle[] = [];
      // Round-robin up to 6 picks
      for (let round = 0; round < maxArticles; round++) {
        for (let i = 0; i < cleanSymbols.length; i++) {
          const sym = cleanSymbols[i];
          const list = perSymbolArticles[sym] || [];
          if (list.length === 0) continue;
          const article = list.shift();
          if (!article || !validateArticle(article)) continue;
          collected.push(formatArticle(article, true, sym, round));
          if (collected.length >= maxArticles) break;
        }
        if (collected.length >= maxArticles) break;
      }

      if (collected.length > 0) {
        // Sort by datetime desc
        collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        return collected.slice(0, maxArticles);
      }
      // If none collected, fall through to general news
    }

    // General market news fallback or when no symbols provided
    const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${token}`;
    const general = await fetchJSON<RawNewsArticle[]>(generalUrl, 300);

    const seen = new Set<string>();
    const unique: RawNewsArticle[] = [];
    for (const art of general || []) {
      if (!validateArticle(art)) continue;
      const key = `${art.id}-${art.url}-${art.headline}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(art);
      if (unique.length >= 20) break; // cap early before final slicing
    }

    const formatted = unique.slice(0, maxArticles).map((a, idx) => formatArticle(a, false, undefined, idx));
    return formatted;
  } catch (err) {
    console.error('getNews error:', err);
    throw new Error('Failed to fetch news');
  }
}

export const searchStocks = cache(async (query?: string): Promise<StockWithWatchlistStatus[]> => {
  try {
    const token = process.env.FINNHUB_API_KEY;
    if (!token) {
      // No Finnhub key — return a small fallback of popular symbols so search UI remains usable in demo mode
      try {
        const mapped = (POPULAR_STOCK_SYMBOLS || []).slice(0, 20).map((sym) => ({
          symbol: sym.toUpperCase(),
          name: sym.toUpperCase(),
          exchange: 'US',
          type: 'Stock',
          isInWatchlist: false,
        }));
        return mapped;
      } catch (e) {
        console.error('Error constructing fallback popular symbols', e);
        return [];
      }
    }

    const trimmed = typeof query === 'string' ? query.trim() : '';

    let results: FinnhubSearchResult[] = [];

    if (!trimmed) {
      // Fetch top 20 popular symbols' profiles
      const top = POPULAR_STOCK_SYMBOLS.slice(0, 20);
      const profiles = await Promise.all(
        top.map(async (sym) => {
          try {
            const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${token}`;
            // Revalidate every hour
            const profile = await fetchJSON<ProfileData>(url, 3600);
            return { sym, profile } as { sym: string; profile: ProfileData | null };
          } catch (e) {
            console.error('Error fetching profile2 for', sym, e);
            return { sym, profile: null } as { sym: string; profile: ProfileData | null };
          }
        })
      );

      results = profiles
        .map(({ sym, profile }) => {
          const symbol = sym.toUpperCase();
          const name: string | undefined = profile?.name || profile?.ticker || undefined;
          const exchange: string | undefined = profile?.exchange || undefined;
          if (!name) return undefined;
          const r: FinnhubSearchResult = {
            symbol,
            description: name,
            displaySymbol: symbol,
            type: 'Common Stock',
          };
          // We don't include exchange in FinnhubSearchResult type, so carry via mapping later using profile
          // To keep pipeline simple, attach exchange via closure map stage
          // We'll reconstruct exchange when mapping to final type
          (r as unknown as { __exchange?: string }).__exchange = exchange; // internal only
          return r;
        })
        .filter((x): x is FinnhubSearchResult => Boolean(x));
    } else {
      const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(trimmed)}&token=${token}`;
      const data = await fetchJSON<FinnhubSearchResponse>(url, 1800);
      results = Array.isArray(data?.result) ? data.result : [];
    }

    const mapped: StockWithWatchlistStatus[] = results
      .map((r) => {
        const upper = (r.symbol || '').toUpperCase();
        const name = r.description || upper;
        const exchangeFromDisplay = (r.displaySymbol as string | undefined) || undefined;
        const exchangeFromProfile = (r as unknown as { __exchange?: string }).__exchange;
        const exchange = exchangeFromDisplay || exchangeFromProfile || 'US';
        const type = r.type || 'Stock';
        const item: StockWithWatchlistStatus = {
          symbol: upper,
          name,
          exchange,
          type,
          isInWatchlist: false,
        };
        return item;
      })
      .slice(0, 20);

    return mapped;
  } catch (err) {
    console.error('Error in stock search:', err);
    return [];
  }
});