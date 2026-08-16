import Link from 'next/link';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { getUnusualActivity } from '@/lib/actions/market-intelligence.actions';
import { formatPrice, formatChangePercent, getChangeColorClass } from '@/lib/utils';

const UnusualActivity = async () => {
    const items = await getUnusualActivity();

    return (
        <section className="unusual-activity">
            <div>
                <h2 className="unusual-activity-title">
                    <AlertCircle className="h-5 w-5 text-yellow-500" /> Unusual Activity
                </h2>
                <p className="unusual-activity-subtitle">Stocks moving in ways worth a second look.</p>
            </div>

            {items.length === 0 ? (
                <p className="market-pulse-empty">Nothing unusual right now — check back later.</p>
            ) : (
                <div className="unusual-activity-grid">
                    {items.map((item) => (
                        <Link key={item.symbol} href={`/stocks/${item.symbol}`} className="unusual-activity-item">
                            <div className="unusual-activity-item-header">
                                <div>
                                    <span className="unusual-activity-symbol">{item.symbol}</span>
                                    <span className="unusual-activity-company">{item.company}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                            </div>
                            <div className={`unusual-activity-change ${getChangeColorClass(item.changePercent)}`}>
                                {formatPrice(item.price)} &middot; {formatChangePercent(item.changePercent)}
                            </div>
                            <div className="unusual-activity-tags">
                                {item.tags.map((tag) => (
                                    <span key={tag} className="unusual-activity-tag">{tag}</span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
};

export default UnusualActivity;
