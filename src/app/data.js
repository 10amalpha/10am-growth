// 10AMPRO Growth Intelligence — Data Layer
// P&L from spreadsheet, strategy paths from performance review

export const CH_META = [
  { key: "substack", name: "Substack", icon: "✉️", color: "#FF6719", dbCol: "substack" },
  { key: "youtube", name: "YouTube", icon: "▶️", color: "#FF0000", dbCol: "youtube" },
  { key: "tiktok", name: "TikTok", icon: "♪", color: "#00F2EA", dbCol: "tiktok" },
  { key: "instagram", name: "Instagram", icon: "📷", color: "#E1306C", dbCol: "instagram" },
  { key: "x", name: "X / Twitter", icon: "𝕏", color: "#A1A1AA", dbCol: "x_twitter" },
  { key: "linkedin", name: "LinkedIn", icon: "in", color: "#0A66C2", dbCol: "linkedin" },
  { key: "spotify", name: "Spotify Pods", icon: "🎵", color: "#1DB954", dbCol: "spotify" },
  { key: "apple", name: "Apple Pods", icon: "🎧", color: "#A855F7", dbCol: "apple_pods" },
];

export const STREAMS = [
  { key: "rev_youtube", label: "YouTube", color: "#FF0000", chartKey: "youtube" },
  { key: "rev_gumroad_substack", label: "Gumroad + Substack", color: "#FF6719", chartKey: "gumroad_substack" },
  { key: "rev_sponsors", label: "Sponsors", color: "#D4A843", chartKey: "sponsors" },
  { key: "rev_spotify", label: "Spotify", color: "#1DB954", chartKey: "spotify" },
  { key: "rev_events", label: "Events", color: "#818CF8", chartKey: "events" },
];

export const STRATEGY_PATHS = [
  { id:"substack", title:"Scale Substack to 10K+", description:"4,728 subs as of Apr 2026. Every piece of content becomes a Substack funnel. Subscribers worth 22x more than avg follower.", current:4728, target:10000, unit:"subs", color:"#FF6719", revImpact:"$21K/mo at 10K subs", actions:["Verbal CTA in every podcast episode","CTA in every short: 'Full breakdown at 10am.pro'","IG bio → direct email capture landing","UTM tracking on all short links"] },
  { id:"product", title:"Launch Mid-Tier Product ($99/mo)", description:"10AMPRO Pro: portfolio deep dives, live Q&A, model templates. 300 members = $30K/mo.", current:0, target:300, unit:"members", color:"#818CF8", revImpact:"$30K/mo at 300 members", actions:["Design 10AMPRO Pro membership tiers","Build portfolio deep dive template","Set up live Q&A cadence","Beta launch with top 50 subscribers"] },
  { id:"sponsors", title:"Systematize Sponsorships", description:"Wenia active. Media kit live at anuncia10am. Plenti next target.", current:0, target:5000, unit:"$/mo", color:"#D4A843", revImpact:"$5K/mo recurring sponsors", actions:["Expand Wenia sponsorship cadence","Pitch Plenti with dashboard data","Package tiers: podcast + newsletter + social","Track sponsor pipeline in dashboard"] },
  { id:"spotify", title:"Convert Spotify → Substack", description:"38.6K listeners generating $79/mo. 5% conversion = 1,930 new subs = ~$4K/mo.", current:0, target:5, unit:"% rate", color:"#1DB954", revImpact:"$4K/mo from conversions", actions:["Verbal CTA: 'show notes at 10am.pro'","Podcast description with Substack link","Exclusive Substack content for listeners","UTM tracking for conversion"] },
  { id:"calendar", title:"Revenue Event Calendar", description:"4 events active on Luma. Ep200 Fireside (163 reg, $40) + Alpha AMAs (100+ reg, $15) + private almuerzos. AMAs correlate with M2 retention improving from 83%→88%.", current:4, target:12, unit:"events/yr", color:"#EF4444", revImpact:"$2-5K per event + churn reduction", actions:["Execute Ep200 event (May)","Monthly Alpha AMA cadence ($15)","Check Mar cohort M2 in May (AMA impact)","Quarterly private almuerzo (retention)"] },
];

export const PNL_REVENUE = [
  { key:"youtube", label:"YouTube AdSense", color:"#FF0000" },
  { key:"stripe", label:"Stripe (Gumroad+Sub)", color:"#FF6719" },
  { key:"sponsors", label:"Sponsor Ads", color:"#D4A843" },
  { key:"spotify", label:"Spotify", color:"#1DB954" },
  { key:"events", label:"Events", color:"#818CF8" },
  { key:"paypal", label:"PayPal", color:"#003087" },
];

export const PNL_EXPENSES = [
  { key:"gordo", label:"Gordo (Editor)", color:"#EF4444" },
  { key:"podcastai", label:"PodcastAI", color:"#F59E0B" },
  { key:"quickbooks", label:"Quickbooks", color:"#2CA01C" },
  { key:"canva", label:"Canva", color:"#7B2FF7" },
  { key:"anthropic", label:"Anthropic", color:"#D4A843" },
  { key:"perplexity", label:"Perplexity", color:"#22D3EE" },
  { key:"openai", label:"OpenAI", color:"#10B981" },
  { key:"x_premium", label:"X Premium", color:"#A1A1AA" },
  { key:"google", label:"Google Workspace", color:"#4285F4" },
  { key:"replit", label:"Replit", color:"#F26207" },
  { key:"godaddy", label:"GoDaddy", color:"#1BDBDB" },
  { key:"notebooklm", label:"NotebookLM", color:"#FBBC04" },
  { key:"tradingview", label:"TradingView", color:"#2962FF" },
  { key:"youtube_premium", label:"YouTube Premium", color:"#FF4444" },
  { key:"api_fmp", label:"API FMP", color:"#0EA5E9" },
  { key:"luma", label:"Luma Labs", color:"#7C3AED" },
  { key:"facebook_ads", label:"Facebook Ads", color:"#1877F2" },
  { key:"bank_fees", label:"Bank Fees BoA", color:"#DC2626" },
  { key:"otros", label:"Other", color:"#6B7280" },
];

export const PNL_DATA = [
  { month:"2025-01", youtube:4954.15, stripe:209.97, sponsors:0, spotify:48.06, events:0, paypal:0, gordo:400, podcastai:100, quickbooks:65, canva:54, anthropic:0, perplexity:0, openai:20, x_premium:16, google:30, replit:0, godaddy:20, notebooklm:0, tradingview:0, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:70 },
  { month:"2025-02", youtube:5411.14, stripe:824.40, sponsors:0, spotify:0, events:0, paypal:0, gordo:400, podcastai:100, quickbooks:65, canva:54, anthropic:0, perplexity:0, openai:20, x_premium:21, google:30, replit:0, godaddy:20, notebooklm:0, tradingview:0, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2025-03", youtube:5545.90, stripe:1461.69, sponsors:0, spotify:0, events:0, paypal:0, gordo:400, podcastai:100, quickbooks:65, canva:54, anthropic:0, perplexity:0, openai:20, x_premium:21, google:30, replit:0, godaddy:20, notebooklm:0, tradingview:19.23, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2025-04", youtube:5129.70, stripe:1391.69, sponsors:0, spotify:0, events:0, paypal:0, gordo:400, podcastai:100, quickbooks:65, canva:54, anthropic:20, perplexity:20, openai:20, x_premium:21, google:30, replit:0, godaddy:20, notebooklm:0, tradingview:19.23, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2025-05", youtube:4789.33, stripe:1948.18, sponsors:1191, spotify:316.71, events:810, paypal:0, gordo:2000, podcastai:100, quickbooks:65, canva:54, anthropic:20, perplexity:20, openai:20, x_premium:43, google:30, replit:0, godaddy:20, notebooklm:0, tradingview:19.23, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2025-06", youtube:4813.19, stripe:2409.23, sponsors:0, spotify:92.70, events:0, paypal:0, gordo:400, podcastai:100, quickbooks:65, canva:54, anthropic:20, perplexity:20, openai:20, x_premium:43, google:30, replit:0, godaddy:20, notebooklm:0, tradingview:19.23, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:44.53 },
  { month:"2025-07", youtube:4506.13, stripe:2079.27, sponsors:0, spotify:66.28, events:0, paypal:0, gordo:800, podcastai:100, quickbooks:65, canva:54, anthropic:20, perplexity:20, openai:20, x_premium:43, google:30, replit:0, godaddy:20, notebooklm:0, tradingview:19.23, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:10 },
  { month:"2025-08", youtube:4818.92, stripe:2445.84, sponsors:0, spotify:72.76, events:0, paypal:33.01, gordo:800, podcastai:100, quickbooks:75, canva:0, anthropic:20, perplexity:20, openai:20, x_premium:43, google:30, replit:30, godaddy:20, notebooklm:0, tradingview:19.23, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2025-09", youtube:4545.73, stripe:5356.66, sponsors:0, spotify:53.35, events:0, paypal:0, gordo:800, podcastai:100, quickbooks:75, canva:0, anthropic:20, perplexity:20, openai:20, x_premium:43, google:30, replit:30, godaddy:20, notebooklm:125, tradingview:19.23, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2025-10", youtube:4713.24, stripe:3185.49, sponsors:0, spotify:62.98, events:0, paypal:0, gordo:800, podcastai:100, quickbooks:75, canva:0, anthropic:20, perplexity:0, openai:20, x_premium:43, google:33.60, replit:0, godaddy:20, notebooklm:0, tradingview:21.28, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2025-11", youtube:4931.88, stripe:3351, sponsors:2131.78, spotify:74.77, events:0, paypal:0, gordo:400, podcastai:100, quickbooks:75, canva:54.99, anthropic:20, perplexity:0, openai:20, x_premium:43, google:33.60, replit:0, godaddy:20, notebooklm:125, tradingview:21.28, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2025-12", youtube:4200, stripe:5071.97, sponsors:1061.29, spotify:87.94, events:0, paypal:0, gordo:396, podcastai:100, quickbooks:75, canva:0, anthropic:20, perplexity:0, openai:20, x_premium:60, google:33.60, replit:0, godaddy:22.19, notebooklm:125, tradingview:21.28, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2026-01", youtube:5395.17, stripe:7400.27, sponsors:0, spotify:52.90, events:0, paypal:0, gordo:594, podcastai:0, quickbooks:75, canva:172.81, anthropic:20, perplexity:0, openai:20, x_premium:40, google:53, replit:0, godaddy:0, notebooklm:217.40, tradingview:21.28, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:0 },
  { month:"2026-02", youtube:4601.43, stripe:8519.37, sponsors:0, spotify:79.48, events:0, paypal:0, gordo:1000, podcastai:75, quickbooks:75, canva:0, anthropic:220, perplexity:0, openai:20, x_premium:44.51, google:33.60, replit:0, godaddy:45, notebooklm:249.99, tradingview:21.42, youtube_premium:0, api_fmp:0, luma:0, facebook_ads:0, bank_fees:0, otros:350 },
  { month:"2026-03", youtube:4395.45, stripe:7776.56, sponsors:0, spotify:97.63, events:1320, paypal:131.72, gordo:594, podcastai:0, quickbooks:75, canva:0, anthropic:230, perplexity:0, openai:20, x_premium:40, google:33.60, replit:0, godaddy:0, notebooklm:249.99, tradingview:21.09, youtube_premium:22.99, api_fmp:228, luma:69, facebook_ads:40.61, bank_fees:31.58, otros:153.90 },
];

export function fmt(n){if(n==null)return"—";n=Number(n);if(n>=1e6)return"$"+(n/1e6).toFixed(1)+"M";if(n>=1000)return"$"+(n/1000).toFixed(1)+"K";return"$"+Math.round(n)}
export function fmtK(n){if(!n)return"—";n=Number(n);if(n>=1e6)return(n/1e6).toFixed(1)+"M";if(n>=1000)return(n/1000).toFixed(1)+"K";return n.toString()}
export function fmtMonth(m){if(!m)return"—";const[y,mo]=m.split("-");const ms=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return ms[parseInt(mo)-1]+" "+y.slice(2)}
export function fmtMonthFull(m){if(!m)return"—";const[y,mo]=m.split("-");const ms=["Enero","Feb","Marzo","Abril","Mayo","Junio","Julio","Agosto","Sep","Oct","Nov","Dic"];return ms[parseInt(mo)-1]+" "+y}
