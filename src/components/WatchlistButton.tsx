'use client';

import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const WatchlistButton = ({
    symbol,
    company,
    isInWatchlist,
    showTrashIcon = false,
    type = 'button',
    onWatchlistChange,
}: WatchlistButtonProps) => {
    const [inWatchlist, setInWatchlist] = useState(isInWatchlist);
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        setLoading(true);
        try {
            if (inWatchlist) {
                const res = await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to remove from watchlist');
                setInWatchlist(false);
                toast.success(`${symbol} removed from watchlist`);
                onWatchlistChange?.(symbol, false);
            } else {
                const res = await fetch('/api/watchlist/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol, company }),
                });
                if (!res.ok && res.status !== 409) throw new Error('Failed to add to watchlist');
                setInWatchlist(true);
                toast.success(`${symbol} added to watchlist`);
                onWatchlistChange?.(symbol, true);
            }
            window.dispatchEvent(new CustomEvent('watchlist:changed', { detail: { symbol, action: inWatchlist ? 'removed' : 'added' } }));
        } catch (err) {
            toast.error(inWatchlist ? 'Failed to remove from watchlist' : 'Failed to add to watchlist');
            console.error('Watchlist toggle error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (type === 'icon') {
        return (
            <button
                onClick={toggle}
                disabled={loading}
                title={inWatchlist ? (showTrashIcon ? 'Remove from watchlist' : 'In watchlist') : 'Add to watchlist'}
                className={cn(
                    'p-1.5 rounded transition-colors disabled:opacity-50',
                    inWatchlist ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-500 hover:text-yellow-500'
                )}
            >
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Star className="h-5 w-5" fill={inWatchlist ? 'currentColor' : 'none'} />
                )}
            </button>
        );
    }

    return (
        <button
            onClick={toggle}
            disabled={loading}
            className={cn('watchlist-btn flex items-center justify-center gap-2', inWatchlist && 'watchlist-remove')}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Star className="h-4 w-4" fill={inWatchlist ? 'currentColor' : 'none'} />
            )}
            {inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        </button>
    );
};

export default WatchlistButton;
