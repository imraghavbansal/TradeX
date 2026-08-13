import { Schema, model, models, type Document, type Model } from 'mongoose';

// One document per tracked symbol, refreshed on a schedule (see
// refreshMarketSnapshot in lib/inngest/functions.ts) rather than fetched live
// from Finnhub on every page view. Market Pulse / Unusual Activity scan the
// whole tracked universe (~50 symbols) on every read — doing that from
// Finnhub directly would mean every concurrent visitor re-triggers ~50 calls,
// which scales with traffic and blows through the free-tier rate limit under
// real usage. Reading from this snapshot instead makes Finnhub call volume a
// fixed function of the refresh interval, independent of how many users are
// browsing at once.
export interface MarketSnapshotItem extends Document {
  symbol: string;
  company: string;
  price: number | null;
  changePercent: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  updatedAt: Date;
}

const MarketSnapshotSchema = new Schema<MarketSnapshotItem>(
  {
    symbol: { type: String, required: true, uppercase: true, trim: true, unique: true },
    company: { type: String, required: true, trim: true },
    price: { type: Number, default: null },
    changePercent: { type: Number, default: null },
    fiftyTwoWeekHigh: { type: Number, default: null },
    fiftyTwoWeekLow: { type: Number, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const MarketSnapshotModel: Model<MarketSnapshotItem> =
  (models?.MarketSnapshot as Model<MarketSnapshotItem>) ||
  model<MarketSnapshotItem>('MarketSnapshot', MarketSnapshotSchema);
