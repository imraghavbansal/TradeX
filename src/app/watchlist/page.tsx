'use client';

import SearchCommand from '@/components/SearchCommand';

const WatchlistPage = () => {
  return (
    <div className="watchlist-empty-container">
      <div className="watchlist-empty">
        <div className="watchlist-title">Watchlist</div>
        <p className="empty-description">You haven't added any stocks yet.</p>
        <SearchCommand renderAs="button" label="Search stocks" />
      </div>
    </div>
  );
}

export default WatchlistPage;


