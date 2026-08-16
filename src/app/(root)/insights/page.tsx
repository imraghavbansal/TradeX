import MarketPulse from '@/components/MarketPulse';

const InsightsPage = () => {
    return (
        <div className="flex flex-col min-h-screen home-wrapper gap-8">
            <div>
                <h1 className="insights-page-title">Insights</h1>
                <p className="insights-page-subtitle">
                    What&apos;s moving the market right now, and why — not just the price.
                </p>
            </div>
            <MarketPulse />
        </div>
    );
};

export default InsightsPage;
