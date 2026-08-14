"use client";

import React, { memo, useMemo } from "react";
import { useTheme } from "next-themes";
import useTradingViewWidget from "../../hooks/useTradingViewWidget";
import { cn } from "@/lib/utils";

interface TradingViewWidgetProps {
  title?: string;
  scriptUrl: string;
  config: Record<string, unknown>;
  height?: number;
  className?: string;
}

// TradingView widgets take their own colorTheme/backgroundColor/etc rather than
// inheriting page CSS, so they need to be told explicitly which theme to render
// in — otherwise they stay dark even when the rest of the app switches to light.
const applyWidgetTheme = (config: Record<string, unknown>, isDark: boolean) => {
  const themed = { ...config };
  if ("colorTheme" in themed) themed.colorTheme = isDark ? "dark" : "light";
  if ("theme" in themed) themed.theme = isDark ? "dark" : "light";
  // Several widget types (symbol-info, technical-analysis, symbol-profile,
  // financials) don't reliably respect isTransparent + the wrapper's CSS
  // background — they fall back to a white iframe background regardless of
  // colorTheme. An explicit backgroundColor is the only reliable fix, so we
  // set it on every widget (adding it even if the base config didn't have
  // one) and turn isTransparent off so the two settings don't conflict.
  if ("isTransparent" in themed) themed.isTransparent = false;
  // Matches --tv-bg in globals.css — TradingView's own widgets (Top Stories,
  // etc) render a near-true-black internal background in dark mode that this
  // override can't fully reach, so every widget is pinned to that same tone
  // instead of the lighter card gray-800, keeping them visually consistent.
  themed.backgroundColor = isDark ? "#0A0A0B" : "#FFFFFF";
  if ("gridColor" in themed) themed.gridColor = isDark ? "#15161D" : "#F1EBDC";
  if ("scaleFontColor" in themed) themed.scaleFontColor = isDark ? "#DBDBDB" : "#39352C";
  return themed;
};

const TradingViewWidget = ({
  title,
  scriptUrl,
  config,
  height = 600,
  className,
}: TradingViewWidgetProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const themedConfig = useMemo(() => applyWidgetTheme(config, isDark), [config, isDark]);

  const { containerRef, loading } = useTradingViewWidget(scriptUrl, themedConfig, height);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-gray-100 text-2xl font-semibold mb-6">{title}</h3>
      )}
      <div className="relative" style={{ height }}>
        {loading && <div className="skeleton-block absolute inset-0 z-10" />}
        <div className={cn("tradingview-widget-container", className)} ref={containerRef}>
          <div className="tradingview-widget-container__widget h-full w-full" />
        </div>
      </div>
    </div>
  );
};

export default memo(TradingViewWidget);
