const StockDetailsLoading = () => {
    return (
        <div className="flex flex-col min-h-screen home-wrapper">
            <div className="stock-header">
                <div className="stock-header-quote">
                    <div className="skeleton-block" style={{ height: 170 }} />
                </div>
                <div className="stock-header-action">
                    <div className="skeleton-block" style={{ height: 44 }} />
                </div>
            </div>

            <div className="skeleton-block mt-6" style={{ height: 120 }} />

            <section className="grid stock-details-container">
                <div className="xl:col-span-2 space-y-6">
                    <div className="skeleton-block" style={{ height: 600 }} />
                    <div className="skeleton-block" style={{ height: 600 }} />
                </div>
                <div className="space-y-6">
                    <div className="skeleton-block" style={{ height: 400 }} />
                    <div className="skeleton-block" style={{ height: 440 }} />
                    <div className="skeleton-block" style={{ height: 464 }} />
                </div>
            </section>
        </div>
    );
};

export default StockDetailsLoading;
