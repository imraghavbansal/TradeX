import TradingViewWidget from '@/components/TradingViewWidget';
import WatchlistButton from '@/components/WatchlistButton';
import WhyIsItMoving from '@/components/WhyIsItMoving';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { getStockProfile } from '@/lib/actions/finnhub.actions';
import { getWatchlistSymbolsByEmail } from '@/lib/actions/watchlist.actions';
import {
    SYMBOL_INFO_WIDGET_CONFIG,
    CANDLE_CHART_WIDGET_CONFIG,
    BASELINE_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
    canRenderTradingViewChart,
} from '@/lib/constants';

const SCRIPT_URL = 'https://s3.tradingview.com/external-embedding/embed-widget-';

const StockDetails = async ({ params }: StockDetailsPageProps) => {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();

    const [profile, session] = await Promise.all([
        getStockProfile(upperSymbol),
        auth.api.getSession({ headers: await headers() }).catch(() => null),
    ]);

    const companyName = profile?.name || upperSymbol;
    const chartAvailable = canRenderTradingViewChart(upperSymbol);

    let isInWatchlist = false;
    if (session?.user?.email) {
        try {
            const symbols = await getWatchlistSymbolsByEmail(session.user.email);
            isInWatchlist = symbols.map((s) => s.toUpperCase()).includes(upperSymbol);
        } catch (e) {
            console.warn('Failed to resolve watchlist status for stock details page:', e);
        }
    }

    return (
        <div className="flex flex-col min-h-screen home-wrapper">
            <div className="stock-header">
                <div className="stock-header-quote">
                    <TradingViewWidget
                        scriptUrl={`${SCRIPT_URL}symbol-info.js`}
                        config={SYMBOL_INFO_WIDGET_CONFIG(upperSymbol)}
                        height={170}
                    />
                </div>
                <div className="stock-header-action">
                    <WatchlistButton
                        symbol={upperSymbol}
                        company={companyName}
                        isInWatchlist={isInWatchlist}
                    />
                </div>
            </div>

            <WhyIsItMoving symbol={upperSymbol} />

            <section className="grid stock-details-container">
                <div className="xl:col-span-2 space-y-6">
                    {chartAvailable ? (
                        <>
                            <TradingViewWidget
                                scriptUrl={`${SCRIPT_URL}advanced-chart.js`}
                                config={CANDLE_CHART_WIDGET_CONFIG(upperSymbol)}
                                className="custom-chart"
                                height={600}
                            />
                            <TradingViewWidget
                                title="Baseline"
                                scriptUrl={`${SCRIPT_URL}advanced-chart.js`}
                                config={BASELINE_WIDGET_CONFIG(upperSymbol)}
                                className="custom-chart"
                                height={600}
                            />
                        </>
                    ) : (
                        <div className="chart-unavailable">
                            Live chart isn&apos;t available for {upperSymbol} — showing profile, financials and
                            technical analysis instead.
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <TradingViewWidget
                        title={`Technical Analysis for ${upperSymbol}`}
                        scriptUrl={`${SCRIPT_URL}technical-analysis.js`}
                        config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(upperSymbol)}
                        height={400}
                    />
                    <TradingViewWidget
                        title={`${upperSymbol} Profile`}
                        scriptUrl={`${SCRIPT_URL}symbol-profile.js`}
                        config={COMPANY_PROFILE_WIDGET_CONFIG(upperSymbol)}
                        height={440}
                    />
                    <TradingViewWidget
                        title={`${upperSymbol} Financials`}
                        scriptUrl={`${SCRIPT_URL}financials.js`}
                        config={COMPANY_FINANCIALS_WIDGET_CONFIG(upperSymbol)}
                        height={464}
                    />
                </div>
            </section>
        </div>
    );
};

export default StockDetails;
