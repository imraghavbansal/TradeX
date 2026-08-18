"use client"

import { useEffect, useState } from "react"
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command"
import {Button} from "@/components/ui/button";
import {Loader2,  TrendingUp, Plus, Check} from "lucide-react";
import Link from "next/link";
import {useDebounce} from "@/hooks/useDebounce";
import { toast } from "sonner";

export default function SearchCommand({ renderAs = 'button', label = 'Add stock', initialStocks = [] }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  const isSearchMode = !!searchTerm.trim();
  const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 20);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Client-side wrapper to call our API route which invokes the server-side search
  async function fetchStocks(q: string): Promise<StockWithWatchlistStatus[]> {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q || '')}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data as StockWithWatchlistStatus[];
    } catch {
      return [];
    }
  }

  const handleSearch = async () => {
    if(!isSearchMode) return; // Don't override when search is empty

    setLoading(true)
    try {
        const results = await fetchStocks(searchTerm.trim());
        setStocks(results);
    } catch {
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    if (isSearchMode) {
      debouncedSearch();
    }
  }, [searchTerm, debouncedSearch, isSearchMode]);

  // Fetch an initial set of popular stocks when the command mounts
  // This ensures the list isn't empty before the user types anything
  useEffect(() => {
    let cancelled = false;
    const loadInitial = async () => {
      if (initialStocks && initialStocks.length > 0) return; // already provided
      setLoading(true);
      try {
        const results = await fetchStocks("");
        if (!cancelled) setStocks(results);
      } catch {
        if (!cancelled) setStocks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadInitial();
    return () => { cancelled = true; };
    // Intentionally NOT depending on the `initialStocks` array itself: most callers
    // don't pass it, so it falls back to a fresh `[]` default on every render, which
    // would re-trigger this effect forever. Length is a stable primitive instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStocks.length]);

  const handleToggleWatchlist = async (e: React.MouseEvent, stock: StockWithWatchlistStatus) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setAddingSymbol(stock.symbol);

      if (stock.isInWatchlist) {
        // Remove from watchlist
        const res = await fetch(`/api/watchlist/${encodeURIComponent(stock.symbol)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setStocks(prev => prev.map(s => s.symbol === stock.symbol ? { ...s, isInWatchlist: false } : s));
          toast.success(`${stock.symbol} removed from watchlist`);
          window.dispatchEvent(new CustomEvent('watchlist:changed', { detail: { symbol: stock.symbol, action: 'removed' } }));
        } else {
          const err = await res.json();
          toast.error(err?.error || 'Failed to remove from watchlist');
        }
      } else {
        // Add to watchlist
        const response = await fetch('/api/watchlist/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: stock.symbol, company: stock.name }),
        });

        if (response.ok) {
          setStocks(prev => prev.map(s => s.symbol === stock.symbol ? { ...s, isInWatchlist: true } : s));
          toast.success(`${stock.symbol} added to watchlist!`);
          window.dispatchEvent(new CustomEvent('watchlist:changed', { detail: { symbol: stock.symbol, action: 'added' } }));
        } else {
          const error = await response.json();
          if (response.status === 409) {
            toast.info(`${stock.symbol} is already in your watchlist`);
          } else {
            toast.error(error.error || 'Failed to add stock');
          }
        }
      }
    } catch (err) {
      toast.error('Error updating watchlist');
      console.error('Watchlist toggle error:', err);
    } finally {
      setAddingSymbol(null);
    }
  };

  const handleSelectStock = () => {
    setOpen(false);
    setSearchTerm("");
    setStocks(initialStocks);
  }

  return (
    <>
      {renderAs === 'text' ? (
          <span onClick={() => setOpen(true)} className="search-text">
            {label}
          </span>
      ): (
          <Button onClick={() => setOpen(true)} className="search-btn">
            {label}
          </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen} className="search-dialog">
        <div className="search-field">
          <CommandInput value={searchTerm} onValueChange={setSearchTerm} placeholder="Search stocks..." className="search-input" />
          {loading && <Loader2 className="search-loader" />}
        </div>
        <CommandList className="search-list">
          {loading ? (
              <CommandEmpty className="search-list-empty">Loading stocks...</CommandEmpty>
          ) : displayStocks?.length === 0 ? (
              <div className="search-list-indicator">
                {isSearchMode ? 'No results found' : 'No stocks available'}
              </div>
            ) : (
            <ul>
              <li className="search-count">
                {isSearchMode ? 'Search results' : 'Popular stocks'}
                {` `}({displayStocks?.length || 0})
              </li>
              {displayStocks?.map((stock) => (
                  <li key={stock.symbol} className="search-item">
                    <div className="search-item-link flex items-center justify-between px-2">
                      <Link
                        href={`/stocks/${stock.symbol}`}
                        onClick={handleSelectStock}
                        className="flex-1 flex items-center gap-3"
                      >
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                        <div  className="flex-1">
                          <div className="search-item-name">
                            {stock.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {stock.symbol} | {stock.exchange } | {stock.type}
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={(e) => handleToggleWatchlist(e, stock)}
                        disabled={addingSymbol === stock.symbol}
                        className={`ml-2 p-1 rounded transition-colors ${
                          stock.isInWatchlist
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-500 hover:text-yellow-500'
                        } disabled:opacity-50`}
                        title={stock.isInWatchlist ? 'Already in watchlist' : 'Add to watchlist'}
                      >
                        {stock.isInWatchlist ? (
                          <Check className="h-4 w-4" />
                        ) : addingSymbol === stock.symbol ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </li>
              ))}
            </ul>
          )
          }
        </CommandList>
      </CommandDialog>
    </>
  )
}