import Link from 'next/link';
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { getMarketMovers, getWhyIsItMoving } from '@/lib/actions/market-intelligence.actions';
import { formatPrice, formatChangePercent, getChangeColorClass } from '@/lib/utils';
import type { MarketMover } from '@/lib/actions/market-intelligence.actions';

const MoverRow = ({ mover, rank }: { mover: MarketMover; rank: number }) => (
    <Link href={`/stocks/${mover.symbol}`} className="mover-row group">
        <span className="mover-rank">{rank}</span>
        <div className="mover-identity">
            <span className="mover-symbol">{mover.symbol}</span>
            <span className="mover-company">{mover.company}</span>
        </div>
        <span className="mover-price">{formatPrice(mover.price)}</span>
        <span className={`mover-change ${getChangeColorClass(mover.changePercent)}`}>
            {formatChangePercent(mover.changePercent)}
        </span>
        <ChevronRight className="mover-chevron h-4 w-4" />
    </Link>
);

const MarketPulse = async () => {
    const movers = await getMarketMovers();
    const topMover = [...movers.gainers, ...movers.losers].sort(
        (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
    )[0];

    const whyIsItMoving = topMover ? await getWhyIsItMoving(topMover.symbol) : null;

    return (
        <section className="market-pulse">
            <div className="market-pulse-header">
                <div>
                    <h2 className="market-pulse-title">Market Pulse</h2>
                    <p className="market-pulse-subtitle">Today&apos;s biggest movers across TradeX&apos;s tracked universe.</p>
                </div>
                {movers.benchmark && (
                    <span className={`market-pulse-benchmark ${getChangeColorClass(movers.benchmark.changePercent)}`}>
                        S&amp;P 500 {formatChangePercent(movers.benchmark.changePercent)}
                    </span>
                )}
            </div>

            {whyIsItMoving && whyIsItMoving.summary.length > 0 && (
                <Link href={`/stocks/${whyIsItMoving.symbol}`} className="market-pulse-callout">
                    <span className="market-pulse-callout-label">Why is {whyIsItMoving.symbol} moving?</span>
                    <span className="market-pulse-callout-text">{whyIsItMoving.summary.join(' ')}</span>
                </Link>
            )}

            <div className="market-pulse-grid">
                <div className="market-pulse-column">
                    <h3 className="market-pulse-column-title">
                        <TrendingUp className="h-4 w-4 text-green-500" /> Top Gainers
                    </h3>
                    {movers.gainers.length === 0 ? (
                        <p className="market-pulse-empty">No notable gainers right now.</p>
                    ) : (
                        movers.gainers.map((m, i) => <MoverRow key={m.symbol} mover={m} rank={i + 1} />)
                    )}
                </div>

                <div className="market-pulse-column">
                    <h3 className="market-pulse-column-title">
                        <TrendingDown className="h-4 w-4 text-red-500" /> Top Losers
                    </h3>
                    {movers.losers.length === 0 ? (
                        <p className="market-pulse-empty">No notable losers right now.</p>
                    ) : (
                        movers.losers.map((m, i) => <MoverRow key={m.symbol} mover={m} rank={i + 1} />)
                    )}
                </div>
            </div>
        </section>
    );
};

export default MarketPulse;
