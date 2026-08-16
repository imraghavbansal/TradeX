import { getWhyIsItMoving } from '@/lib/actions/market-intelligence.actions';

const WhyIsItMoving = async ({ symbol }: { symbol: string }) => {
    const data = await getWhyIsItMoving(symbol);

    if (data.summary.length === 0) return null;

    return (
        <div className="why-is-it-moving">
            <h3 className="why-is-it-moving-title">Why is {data.symbol} moving?</h3>
            <ul className="why-is-it-moving-list">
                {data.summary.map((sentence, i) => (
                    <li key={i}>{sentence}</li>
                ))}
            </ul>
            {data.topNews.length > 1 && (
                <div className="why-is-it-moving-news">
                    {data.topNews.slice(1).map((n) => (
                        <a key={n.url} href={n.url} target="_blank" rel="noopener noreferrer" className="why-is-it-moving-news-link">
                            {n.headline} &middot; {n.source}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WhyIsItMoving;
