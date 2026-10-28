# n8n-nodes-adlib – ad library node for n8n

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

An [n8n](https://n8n.io/) community node for the AdLib API: one API for the public ad libraries of **Meta (Facebook, Instagram), Google (incl. YouTube and Google Play), TikTok, LinkedIn, Pinterest, X, Snapchat, Apple, Amazon and Microsoft** (Microsoft in beta), with its own ad history. Ads that disappear from a platform's library are still there, with their run time, marked with `removed_from_library_at`.

Get an API key at [adlibapi.com](https://adlibapi.com); the free plan includes 5,000 credits a month.

With this package you can:

- find a brand's advertiser IDs on every platform from its domain,
- search ads by keyword, advertiser or domain, including ads the platforms have removed,
- break an ad's creative down into its features (hook, offers, urgency, format, video length, cuts, on-image text),
- turn a link copied from an ad library into an AdLib ID,
- check whether a company is advertising right now (lead enrichment),
- read an advertiser's ads, stats, timeline and changes,
- watch competitors and start a workflow when they launch, stop, change or remove ads (**AdLib Trigger**), or get the changes by email.

Not affiliated with Meta, Google, TikTok, LinkedIn, Pinterest, X, Snapchat, Apple, Amazon or Microsoft.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [AdLib Trigger](#adlib-trigger)
- [Output and pagination](#output-and-pagination)
- [Credits](#credits)
- [Errors](#errors)
- [Using it as an AI agent tool](#using-it-as-an-ai-agent-tool)
- [Examples](#examples)
- [Development](#development)

## Installation

In n8n:

1. Go to **Settings > Community Nodes**.
2. Click **Install**.
3. Enter `n8n-nodes-adlib` and confirm.

The **AdLib** and **AdLib Trigger** nodes then show up in the nodes panel. See the n8n guide on [installing community nodes](https://docs.n8n.io/integrations/community-nodes/installation/) for manual installation with npm (queue mode, Docker).

## Credentials

Create an **AdLib API** credential:

- **API Key**: your AdLib API key. It is sent in the `X-API-Key` header.
- **Base URL**: the root URL of the API, without `/v1`. Default `https://api.adlibapi.com`; change it if your account uses a different host.

When you save the credential, n8n tests it with `GET /v1/usage?days=1`.

## Operations

| Resource | Operation | Endpoint |
| --- | --- | --- |
| Advertiser | Resolve by Domain | `GET /v1/advertisers/resolve?domain=` |
| Advertiser | Get | `GET /v1/advertisers/{id}` |
| Advertiser | Get Ads (Return All) | `GET /v1/advertisers/{id}/ads` |
| Advertiser | Get Changes (Return All) | `GET /v1/advertisers/{id}/changes?since=` |
| Advertiser | Get Stats | `GET /v1/advertisers/{id}/stats` |
| Advertiser | Get Timeline (Return All) | `GET /v1/advertisers/{id}/timeline` |
| Ad | Search (Return All) | `GET /v1/search` |
| Ad | Get | `GET /v1/ads/{id}` |
| Ad | Get History | `GET /v1/ads/{id}/history` |
| Ad | Get Ad Features | `GET /v1/ads/{id}/features` |
| Ad | Parse Library URL | `GET /v1/library-url?url=` |
| Domain | Check if Advertising | `GET /v1/domains/{domain}/check` |
| Domain | Get Company Profile | `GET /v1/companies/{domain}` |
| Watchlist | Create | `POST /v1/watchlists` |
| Watchlist | Get | `GET /v1/watchlists/{id}` |
| Watchlist | List | `GET /v1/watchlists` |
| Watchlist | Add Advertisers | `POST /v1/watchlists/{id}/advertisers` |
| Watchlist | Remove Advertiser | `DELETE /v1/watchlists/{id}/advertisers/{advertiser_id}` |
| Watchlist | Update | `PATCH /v1/watchlists/{id}` |
| Watchlist | Delete | `DELETE /v1/watchlists/{id}` |
| Batch | Create | `POST /v1/batch` |
| Batch | Get (Return All) | `GET /v1/batch/{job_id}` |
| Usage | Get | `GET /v1/usage` |

Notes:

- IDs have the form `<platform>:<id>`, for example `meta:15087023444` (advertiser) or `meta:1234567890` (ad). **Advertiser > Resolve by Domain** gives you advertiser IDs; each candidate has a confidence `score` (0 to 1) and a `match_reason`. Use **Options > Minimum Score** to drop weak matches and **Split Into Items** to get one item per advertiser.
- Domains can be entered as `nike.com` or as a full URL; only the host is sent.
- **Ad > Search** needs exactly one of keyword, advertiser (name or ID) or domain. Without **Platforms**, all platforms that support the search are queried in parallel; platforms that fail are listed in `meta.errors` with **Raw Pages** and are not billed. **Source: History** searches the archive, including ads that are gone from the platforms; **Sort: Days Running** puts the longest-running ads (likely winners) first. **Political Ads: Only** or **Exclude** filters political and issue ads (only Meta labels them, so **Only** limits results to Meta). With **Source: History**, **Removed Ads: Only** returns ads the platforms' libraries no longer show (taken down, deleted or aged out) that AdLib kept, and **Exclude** leaves them out.
- Platforms: Amazon, Apple, Google, LinkedIn, Meta, Microsoft (beta), Pinterest, Snapchat, TikTok and X. In **Ad > Search** you can also pick **YouTube** and **Google Play** (Google ads with that placement), and **Options > Placement** (Google Search, Shopping, Maps, Play or YouTube) limits a search to where Google ads ran. YouTube with **Format: Video** gives YouTube video ads.
- Every ad has `derived.signals` (why it likely performs, from public facts: `long_running`, `still_running_90d`, `scaled`, `wide_reach`, `multi_country`) and `derived.stage` (`testing`, `scaling` or `proven`). List results carry `meta.platform_totals` with **Raw Pages**: the matching ads per platform, where the platform reports it.
- **Ad > Get Ad Features** breaks a creative down: `text.hook`, offers, `urgency`, `social_proof`, `guarantee` and other tags (each with the exact text it matched), the measured `format`, media aspect, duration and scene cuts, and on-image text read with OCR. Rule-based and measured, no AI model. Costs 2 credits by default, plus the ad if it has to be fetched live.
- **Ad > Parse Library URL** takes a link copied from the Meta Ad Library, Google Ads Transparency Center, TikTok Ad Library, LinkedIn Ad Library, Pinterest Ads Repository or an X post, and returns `kind` (ad or advertiser), `id` and `href`, the AdLib call that fetches it. Free.
- **Domain > Check if Advertising** also returns `columns`, a flat object (`advertising`, `platforms_advertising`, `total_active_ads`, `latest_ad_at`, and `<platform>_advertising`, `<platform>_active_ads`, `<platform>_advertiser_id`) that maps straight onto spreadsheet columns.
- **Domain > Get Company Profile** returns all ad accounts of a domain across platforms (`accounts`, with score at least **Minimum Score**, default 0.75), per-platform totals and combined `stats`. Agencies, resellers and partners running ads for the domain are listed under `related` (each account has a `role`) and left out of the totals unless **Include Related Accounts** is on. Accounts below the threshold are listed as `candidates`. It costs one resolve plus one stats call.
- **Watchlist > List** returns each watchlist with `advertiser_count`, `interval_hours` and `email_alerts`; the advertisers and their crawl status are in **Watchlist > Get**. **Options > Email Alerts** on **Create** (or **Update**) mails a digest of each crawl's changes to your account's email. **Watchlist > Update** changes the name, webhook URL (an empty **Webhook URL** field removes the webhook) or email alerts.
- **Advertiser > Get Changes** can also return `removed` events: the platform's library no longer shows the ad (AdLib keeps it).
- **Batch > Create** takes a list of advertiser IDs, domains or ad IDs; how many per job depends on your plan (the API documents up to 100, the node accepts at most 1,000). Poll it with **Batch > Get**, or pass a **Webhook URL** to be called when it is done. Results are kept 30 days.

## AdLib Trigger

The trigger starts the workflow when watched advertisers start, stop, change or remove ads.

- **Watch By: Advertiser IDs**: comma-separated advertiser IDs.
- **Watch By: Domain**: the trigger resolves the domain first and watches the advertisers with at least **Minimum Score** (default 0.5), at most **Max per Platform** (default 1) per platform.
- **Crawl Interval (Hours)**: 1 to 168, default 24.
- **Options > Email Alerts**: also mail a digest of each crawl's changes to your account's email.

On activation it creates an AdLib watchlist whose `webhook_url` is this node's webhook URL, and stores its ID. On deactivation it deletes the watchlist. Every delivery is checked against the `X-AdLib-Signature` header (`t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`) with your webhook secret from `GET /v1/webhooks/secret`; deliveries with a wrong signature or a timestamp more than 5 minutes off are answered with `401` and do not start the workflow. If you rotate the secret, the trigger fetches the new one on the next delivery.

Each `advertiser.changes` event is one item:

```json
{
  "event": "advertiser.changes",
  "watchlist_id": "…",
  "advertiser_id": "meta:15087023444",
  "crawled_at": "2026-10-26T06:00:00Z",
  "summary": { "new": 2, "started": 0, "stopped": 1, "changed": 0, "removed": 0 },
  "new": [{ "type": "discovered", "at": "…", "ad_id": "meta:…", "ad": { } }],
  "started": [],
  "stopped": [{ "type": "stopped", "at": "…", "ad_id": "meta:…", "ad": { } }],
  "changed": [],
  "removed": []
}
```

With **Options > Split Into Ads**, you get one item per ad instead, with `change` set to `new`, `started`, `stopped`, `changed` or `removed`, plus `watchlist_id`, `advertiser_id` and `crawled_at`.

Good to know:

- The first crawl of a watchlist is the baseline, so the first events arrive after the second crawl.
- n8n's test URL (**Listen for test event**) must be reachable from the internet for AdLib to deliver to it. To try the trigger without waiting for a crawl, send a signed test ping with `POST /v1/webhooks/test` and the test URL: pings start manual test runs only and are ignored in production.
- Deliveries for other watchlists are acknowledged and ignored.

## Output and pagination

Single objects (an advertiser, an ad, a domain check, a watchlist) come out as one item: the API's `data` object, with `meta` kept as `_meta` where the API sends it.

List operations output **one item per result** (ad, event, watchlist). They have:

- **Limit**: how many results to fetch in one call (the API's maximum is 100 for ads, 200 for changes and timeline).
- **Return All**: follow `next_cursor` page by page until the last page or **Max Pages** (default 10). **Page Size** sets the results per call.
- **Options > Start Cursor**: continue from a `next_cursor` you saved.
- **Options > Raw Pages**: output each API page as it came, with `next_cursor` and `meta`, instead of one item per result.

**Batch > Get** outputs one item: the job (status, counts, credits billed) with all fetched `items`.

## Credits

The AdLib API bills credits per **delivered result**, not per call, and reports them in the `X-Billing-Credits` header. The free plan includes 5,000 credits a month.

- 1 credit per ad on Meta, TikTok, Pinterest and X, 2 on Google, 3 on LinkedIn; double for archived ads last shown more than a year ago.
- **Domain > Check if Advertising** is one flat price per check, free if no platform could be checked.
- **Ad > Get Ad Features** costs 2 credits by default; **Ad > Parse Library URL** is free.
- Empty results, cached results and upstream errors are free. Batch jobs cost the same per result as the synchronous endpoints.

**Return All** can deliver many results, so keep **Max Pages** at a sensible value. **Usage > Get** shows what you used per day and endpoint.

## Errors

The API answers errors as `{"error": {"code", "message", "request_id", …}}`. The node shows that message with a hint, for example:

- `401`: wrong API key or Base URL.
- `402`: no credits left.
- `403`: the key may not use this endpoint, or `history_limit`: the ad is older than your plan's archive window (free 90 days, starter 365 days, growth and up unlimited).
- `404`: unknown advertiser, ad, watchlist or job ID.
- `429`: rate limit. Wait, or turn on **Retry On Fail** in the node settings.

Enable **Continue On Fail** (or **On Error: Continue**) if a single bad domain should not stop the workflow.

## Using it as an AI agent tool

The AdLib node is marked `usableAsTool`, so it can be attached to an **AI Agent** node as a tool, for example to let an agent look up a company's ads or check whether a lead is advertising. On self-hosted n8n, community nodes can only be used as tools when the environment variable `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` is set.

## Examples

Import any of these via **Workflows > Import from File**, then pick your own credentials in each node.

### New competitor ad → Slack

[`templates/competitor-ads-to-slack.json`](templates/competitor-ads-to-slack.json)

**AdLib Trigger** (Watch By: Domain `competitor.com`, Split Into Ads) → **Filter** (`change` is `new` or `started`) → **Slack** (post advertiser, platform, headline and library link to `#competitor-ads`). Activate the workflow; from the second crawl on, every new ad of the competitor is posted.

### Domain list → is advertising?

[`templates/domain-enrichment-google-sheets.json`](templates/domain-enrichment-google-sheets.json)

**Google Sheets** (read rows with a `domain` column) → **AdLib** (Domain > Check if Advertising, `{{ $json.domain }}`) → **Edit Fields** (`advertising` yes/no/unknown, platforms with ads, active ad count, checked at) → **Google Sheets** (append or update, matched on `domain`). `advertising` is `unknown` when no platform could be checked; such checks are free.

## Development

```bash
npm install
npm run dev     # starts n8n with these nodes loaded, rebuilds on change (http://localhost:5678)
npm run lint
npm test        # builds, then runs the unit tests in test/
```

The operations and their fields live in [`nodes/AdLib/descriptions.ts`](nodes/AdLib/descriptions.ts), the requests in [`nodes/AdLib/AdLib.node.ts`](nodes/AdLib/AdLib.node.ts). Signature checking is in [`nodes/AdLibTrigger/signature.ts`](nodes/AdLibTrigger/signature.ts). No runtime dependencies.

## License

[MIT](LICENSE.md)
