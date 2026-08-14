"use client";
import { useEffect, useRef, useState } from "react";

const useTradingViewWidget = (
  scriptUrl: string,
  config: Record<string, unknown>,
  height = 600
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setLoading(true);

    if (container.dataset.loaded) return;

    container.innerHTML = `<div class="tradingview-widget-container__widget" style="height: ${height}px; width: 100%;"></div>`;

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    // TradingView's embed script doesn't expose a "content ready" callback, only
    // a load event for the script file itself (which fires well before the
    // widget's internal iframe has fetched and painted real data). This buffer
    // is a heuristic, not a precise signal — good enough to cover the common case.
    script.onload = () => {
      setTimeout(() => setLoading(false), 3200);
    };
    container.appendChild(script);
    container.dataset.loaded = "true";

    return () => {
      container.innerHTML = "";
      delete container.dataset.loaded;
    };
  }, [scriptUrl, config, height]);

  return { containerRef, loading };
};

export default useTradingViewWidget;
