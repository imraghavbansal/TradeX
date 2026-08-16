const InsightsLoading = () => {
    return (
        <div className="flex flex-col min-h-screen home-wrapper gap-8">
            <div>
                <div className="skeleton-block" style={{ height: 32, width: 160 }} />
                <div className="skeleton-block mt-2" style={{ height: 16, width: 320 }} />
            </div>
            <div className="skeleton-block" style={{ height: 420 }} />
            <div className="skeleton-block" style={{ height: 360 }} />
        </div>
    );
};

export default InsightsLoading;
