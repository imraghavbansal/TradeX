'use client';

import SearchCommand from '@/components/SearchCommand';
import AlertModal from '@/components/AlertModal';
import { useEffect, useState, useCallback } from 'react';
import { Trash2, Star, Bell, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { getNews } from '@/lib/actions/finnhub.actions';
import { getChangeColorClass, getAlertText, formatTimeAgo } from '@/lib/utils';

const WatchlistPage = () => {
  const [watchlist, setWatchlist] = useState<StockWithData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [news, setNews] = useState<MarketNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingSymbol, setRemovingSymbol] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStock, setModalStock] = useState<{ symbol: string; company: string } | null>(null);
  const [editingAlert, setEditingAlert] = useState<Alert | undefined>(undefined);

  const fetchWatchlist = useCallback(async () => {
    try {
      const response = await fetch('/api/watchlist/get');
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data);
        if (data.length > 0) {
          getNews(data.map((s: StockWithData) => s.symbol))
            .then(setNews)
            .catch((e) => console.warn('Failed to load watchlist news:', e));
        } else {
          setNews([]);
        }
      }
    } catch (error) {
      console.warn('Watchlist fetch error:', error);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts');
      if (response.ok) setAlerts(await response.json());
    } catch (error) {
      console.warn('Alerts fetch error:', error);
    }
  }, []);

  useEffect(() => {
    // `loading` already starts true (see useState above) and fetchWatchlist/fetchAlerts
    // are stable (useCallback with no deps), so this effect only ever runs once on mount.
    // Flipping it back off once the fetch settles is the standard loading-flag pattern —
    // there's no way to derive it synchronously since it depends on the fetch resolving.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([fetchWatchlist(), fetchAlerts()]).finally(() => setLoading(false));
  }, [fetchWatchlist, fetchAlerts]);

  useEffect(() => {
    const onWatchlistChanged = () => fetchWatchlist();
    const onAlertsChanged = () => fetchAlerts();
    window.addEventListener('watchlist:changed', onWatchlistChanged);
    window.addEventListener('alerts:changed', onAlertsChanged);
    return () => {
      window.removeEventListener('watchlist:changed', onWatchlistChanged);
      window.removeEventListener('alerts:changed', onAlertsChanged);
    };
  }, [fetchWatchlist, fetchAlerts]);

  const handleRemoveStock = async (symbol: string) => {
    try {
      setRemovingSymbol(symbol);
      const response = await fetch(`/api/watchlist/${symbol}`, { method: 'DELETE' });
      if (response.ok) {
        setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
        toast.success(`${symbol} removed from watchlist`);
      } else {
        toast.error('Failed to remove stock');
      }
    } catch (error) {
      toast.error('Error removing stock');
      console.error('Remove error:', error);
    } finally {
      setRemovingSymbol(null);
    }
  };

  const openCreateAlert = (symbol: string, company: string) => {
    setModalStock({ symbol, company });
    setEditingAlert(undefined);
    setModalOpen(true);
  };

  const openEditAlert = (alert: Alert) => {
    setModalStock({ symbol: alert.symbol, company: alert.company });
    setEditingAlert(alert);
    setModalOpen(true);
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success('Alert deleted');
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  if (loading) {
    return (
      <div className="watchlist-empty-container">
        <div className="watchlist-empty">
          <div className="text-gray-400">Loading watchlist...</div>
        </div>
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="watchlist-empty-container">
        <div className="watchlist-empty">
          <Star className="watchlist-star" />
          <div className="watchlist-title">Your Watchlist</div>
          <p className="empty-description">You have not added any stocks yet.</p>
          <SearchCommand renderAs="button" label="+ Add Stock" />
        </div>
      </div>
    );
  }

  return (
    <div className="watchlist-container">
      <div className="watchlist">
        <div className="flex justify-between items-center mb-2">
          <h1 className="watchlist-title">My Watchlist</h1>
          <SearchCommand renderAs="button" label="+ Add Stock" />
        </div>

        <div className="watchlist-table">
          <table className="w-full">
            <thead>
              <tr className="table-header-row">
                {['Company', 'Symbol', 'Price', 'Change', 'Market Cap', 'P/E Ratio', 'Alert', 'Action'].map((h) => (
                  <th key={h} className="table-header px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {watchlist.map((stock) => (
                <tr key={stock.symbol} className="table-row">
                  <td className="table-cell px-4 py-3 text-gray-300">{stock.company}</td>
                  <td className="table-cell px-4 py-3 font-bold text-yellow-500">{stock.symbol}</td>
                  <td className="table-cell px-4 py-3">{stock.priceFormatted || 'N/A'}</td>
                  <td className={`table-cell px-4 py-3 ${getChangeColorClass(stock.changePercent)}`}>
                    {stock.changeFormatted || 'N/A'}
                  </td>
                  <td className="table-cell px-4 py-3 text-gray-300">{stock.marketCap || 'N/A'}</td>
                  <td className="table-cell px-4 py-3 text-gray-300">{stock.peRatio || 'N/A'}</td>
                  <td className="table-cell px-4 py-3">
                    <button className="add-alert" onClick={() => openCreateAlert(stock.symbol, stock.company)}>
                      <Bell className="h-3.5 w-3.5" /> Add Alert
                    </button>
                  </td>
                  <td className="table-cell px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemoveStock(stock.symbol)}
                      disabled={removingSymbol === stock.symbol}
                      className="trash-icon hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {news.length > 0 && (
          <div>
            <h2 className="watchlist-title mb-4">News</h2>
            <div className="watchlist-news">
              {news.map((article) => (
                <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer" className="news-item">
                  {article.related && <span className="news-tag">{article.related}</span>}
                  <h3 className="news-title">{article.headline}</h3>
                  <p className="news-meta">{formatTimeAgo(article.datetime)} &middot; {article.source}</p>
                  <p className="news-summary">{article.summary}</p>
                  <span className="news-cta">Read More &rarr;</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="watchlist-alerts">
        <h2 className="alert-title">Alerts</h2>
        <div className="alert-list">
          {alerts.length === 0 ? (
            <div className="alert-empty">No alerts yet. Add one from your watchlist.</div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <div className="alert-details">
                  <div>
                    <div className="alert-name">{alert.alertName}</div>
                    <div className="alert-company">{alert.symbol} &middot; {alert.company}</div>
                  </div>
                  <div className="alert-price">{getAlertText(alert)}</div>
                </div>
                <div className="alert-actions">
                  <button className="alert-update-btn" onClick={() => openEditAlert(alert)} title="Edit alert">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="alert-delete-btn" onClick={() => handleDeleteAlert(alert.id)} title="Delete alert">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AlertModal
        key={editingAlert?.id ?? modalStock?.symbol ?? 'new'}
        open={modalOpen}
        setOpen={setModalOpen}
        action={editingAlert ? 'edit' : 'create'}
        alertId={editingAlert?.id}
        alertData={editingAlert}
        stock={modalStock ?? undefined}
      />
    </div>
  );
};

export default WatchlistPage;
