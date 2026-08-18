import {inngest} from "@/lib/inngest/client";
import {NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT} from "@/lib/inngest/prompts";
import {sendNewsSummaryEmail, sendWelcomeEmail, sendStockAlertUpperEmail, sendStockAlertLowerEmail} from "@/lib/nodemailer";
import {getAllUsersForNewsEmail} from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews, getStockQuote } from "@/lib/actions/finnhub.actions";
import { getAllActiveAlerts, deleteAlertById } from "@/lib/actions/alert.actions";
import { refreshMarketQuotes, refreshMarketProfiles } from "@/lib/actions/market-intelligence.actions";
import { getFormattedTodayDate, formatPrice } from "@/lib/utils";


export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email' },
    { event: 'app/user.created'},
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }]
            }
        })

        await step.run('send-welcome-email', async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText = (part && 'text' in part ? part.text : null) ||'Thanks for joining TradeX. You now have the tools to track markets and make smarter moves.'

            const { data: { email, name } } = event;

            return await sendWelcomeEmail({ email, name, intro: introText });
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary' },
    [ { event: 'app/send.daily.news' }, { cron: '0 12 * * *' } ],
    async ({ step }) => {
        // Step #1: Get all users for news delivery
        const users = await step.run('get-all-users', getAllUsersForNewsEmail)

        if(!users || users.length === 0) return { success: false, message: 'No users found for news email' };

        // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
        const results = await step.run('fetch-user-news', async () => {
            const perUser: Array<{ user: UserForNewsEmail; articles: MarketNewsArticle[] }> = [];
            for (const user of users as UserForNewsEmail[]) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    let articles = await getNews(symbols);
                    // Enforce max 6 articles per user
                    articles = (articles || []).slice(0, 6);
                    // If still empty, fallback to general
                    if (!articles || articles.length === 0) {
                        articles = await getNews();
                        articles = (articles || []).slice(0, 6);
                    }
                    perUser.push({ user, articles });
                } catch (e) {
                    console.error('daily-news: error preparing user news', user.email, e);
                    perUser.push({ user, articles: [] });
                }
            }
            return perUser;
        });

        // Step #3: (placeholder) Summarize news via AI
        const userNewsSummaries: { user: UserForNewsEmail; newsContent: string | null }[] = [];

        for (const { user, articles } of results) {
                try {
                    const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(articles, null, 2));

                    const response = await step.ai.infer(`summarize-news-${user.email}`, {
                        model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
                        body: {
                            contents: [{ role: 'user', parts: [{ text:prompt }]}]
                        }
                    });

                    const part = response.candidates?.[0]?.content?.parts?.[0];
                    const newsContent = (part && 'text' in part ? part.text : null) || 'No market news.'

                    userNewsSummaries.push({ user, newsContent });
                } catch {
                    console.error('Failed to summarize news for : ', user.email);
                    userNewsSummaries.push({ user, newsContent: null });
                }
            }

        // Step #4: (placeholder) Send the emails
        await step.run('send-news-emails', async () => {
                await Promise.all(
                    userNewsSummaries.map(async ({ user, newsContent}) => {
                        if(!newsContent) return false;

                        return await sendNewsSummaryEmail({ email: user.email, date: getFormattedTodayDate(), newsContent })
                    })
                )
            })

        return { success: true, message: 'Daily news summary emails sent successfully' }
    }
)

export const checkPriceAlerts = inngest.createFunction(
    { id: 'check-price-alerts' },
    // Every minute rather than every 5 — this only spends one Finnhub call per
    // *unique* symbol across all active alerts (not per alert), so even a
    // couple dozen distinct watched symbols stays well inside the 50/min
    // budget shared with the market-snapshot crons.
    { cron: '* * * * *' },
    async ({ step }) => {
        const alerts = await step.run('get-active-alerts', getAllActiveAlerts);

        if (!alerts || alerts.length === 0) {
            return { success: true, message: 'No active alerts to check' };
        }

        const uniqueSymbols = Array.from(new Set(alerts.map((a) => a.symbol)));

        const quotes = await step.run('fetch-quotes', async () => {
            const entries = await Promise.all(
                uniqueSymbols.map(async (symbol) => [symbol, await getStockQuote(symbol)] as const)
            );
            return Object.fromEntries(entries);
        });

        const triggered = await step.run('evaluate-alerts', async () => {
            const fired: typeof alerts = [];
            for (const alert of alerts) {
                const quote = quotes[alert.symbol];
                const currentPrice = quote?.c;
                if (typeof currentPrice !== 'number') continue;

                const isTriggered =
                    alert.alertType === 'upper' ? currentPrice > alert.threshold : currentPrice < alert.threshold;

                if (isTriggered) fired.push(alert);
            }
            return fired;
        });

        if (triggered.length === 0) {
            return { success: true, message: 'No alerts triggered', checked: alerts.length };
        }

        await step.run('send-alert-emails-and-cleanup', async () => {
            await Promise.all(
                triggered.map(async (alert) => {
                    const quote = quotes[alert.symbol];
                    const emailData = {
                        email: alert.email,
                        symbol: alert.symbol,
                        company: alert.company,
                        currentPrice: formatPrice(quote?.c ?? alert.threshold),
                        targetPrice: formatPrice(alert.threshold),
                        timestamp: new Date().toLocaleString('en-US'),
                    };

                    try {
                        if (alert.alertType === 'upper') {
                            await sendStockAlertUpperEmail(emailData);
                        } else {
                            await sendStockAlertLowerEmail(emailData);
                        }
                    } catch (e) {
                        // Leave the alert in place on a failed send — it gets re-evaluated
                        // (and re-sent) on the next 5-minute tick instead of silently
                        // vanishing on a transient SMTP/network failure.
                        console.error('Failed to send alert email for', alert.symbol, e);
                        return;
                    }

                    await deleteAlertById(alert.id);
                })
            );
        });

        return { success: true, message: 'Triggered alerts sent', triggeredCount: triggered.length };
    }
)

// Market Pulse / Unusual Activity scan the whole tracked universe (~50
// symbols) on every read. Doing that fan-out live from Finnhub on every page
// view would mean call volume scales with concurrent traffic instead of a
// fixed interval — these crons are the only things that actually call
// Finnhub for that scan; everything user-facing just reads what they last
// wrote (see market-intelligence.actions.ts). Split into two cadences:
// prices move constantly, but company name / 52-week range barely change,
// so refreshing those every 2 minutes too would triple the call volume for
// no benefit.
export const refreshMarketQuotesCron = inngest.createFunction(
    { id: 'refresh-market-quotes' },
    { cron: '*/2 * * * *' },
    async ({ step }) => {
        const result = await step.run('refresh-quotes', refreshMarketQuotes);
        return { success: true, ...result };
    }
)

export const refreshMarketProfilesCron = inngest.createFunction(
    { id: 'refresh-market-profiles' },
    { cron: '0 * * * *' },
    async ({ step }) => {
        const result = await step.run('refresh-profiles', refreshMarketProfiles);
        return { success: true, ...result };
    }
)
