import TradingViewWidget from '@/components/TradingViewWidget';
import WhyIsItMoving from '@/components/WhyIsItMoving';
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

    const chartAvailable = canRenderTradingViewChart(upperSymbol);

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
