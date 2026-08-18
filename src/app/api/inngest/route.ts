import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import { sendSignUpEmail, sendDailyNewsSummary, checkPriceAlerts, refreshMarketQuotesCron, refreshMarketProfilesCron } from "../../../lib/inngest/functions";

export const {GET, POST, PUT} = serve({
    client: inngest,
    functions: [sendSignUpEmail, sendDailyNewsSummary, checkPriceAlerts, refreshMarketQuotesCron, refreshMarketProfilesCron],
});
