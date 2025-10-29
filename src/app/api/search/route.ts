import { NextResponse } from 'next/server';
import { searchStocks } from '@/lib/actions/finnhub.actions';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const results = await searchStocks(q);
    return NextResponse.json(results);
  } catch (err) {
    // Return an empty array body with 500 status on error
    return new NextResponse(JSON.stringify([]), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
