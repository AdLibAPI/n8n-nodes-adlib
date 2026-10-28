# Changelog

## [Unreleased]

## [0.3.0] - 2026-10-28

- **Advertiser > Report Resolve Match** (`POST /v1/advertisers/resolve/reports`): report a wrong match, a missing match or a wrong role (Report Kind, Domain, Advertiser ID, Role, Note). **Advertiser > List Resolve Reports** (`GET /v1/advertisers/resolve/reports`). Both free.
- **Domain > Suggest Domains** (`GET /v1/domains/suggest`): domain autocomplete from AdLib's index (Text, Max Results 1 to 20). Free.
- New **Webhook** resource: **List Deliveries** (`GET /v1/webhooks/deliveries`, Status filter, Return All), **Get Delivery**, **Redeliver**, **Send Test** (`POST /v1/webhooks/test`), **Get Secret** and **Rotate Secret**.
- New **Platform** resource: **List** (`GET /v1/platforms`) and **Get Status** (`GET /v1/status`).
- **Batch > Create**: **Minimum Score** option (`options.min_score`, domains). The node now rejects more than 100 items per batch (the API's maximum; plan sizes Free 5, Starter 25, Growth and above 100) instead of 1,000.
- **Crawl Interval (Hours)** on **Watchlist > Create** and the **AdLib Trigger** documents the plan minimums (Free and Starter 24, Growth 12, Pro 6, Business 1).
- README: credits per platform (incl. Snapchat, Apple, Amazon, Microsoft, YouTube and Google Play), free endpoints, all 12 platforms, and why the node does not use CSV output.

## [0.2.0] - 2026-10-28

- New platforms in every Platforms field: **Amazon**, **Apple**, **Microsoft (Beta)** and **Snapchat**. **Ad > Search** also offers **YouTube** and **Google Play** (Google ads with that placement).
- **Ad > Get Ad Features** (`GET /v1/ads/{id}/features`): hook, offers, urgency, social proof, format, video length, cuts and on-image text of an ad.
- **Ad > Parse Library URL** (`GET /v1/library-url`): turns a link copied from an ad library into an AdLib ad or advertiser ID.
- **Ad > Search**: **Placement** option (Google Search, Shopping, Maps, Play, YouTube) and **Removed Ads** option (Any, Exclude, Only; Source: History).
- **Watchlist > Update** (`PATCH /v1/watchlists/{id}`): name, webhook URL and email alerts. **Email Alerts** option on **Watchlist > Create** and on the **AdLib Trigger**.
- **Advertiser > Get Changes**: **Removed** change type. The trigger's **Split Into Ads** also emits `removed` ads.
- GitHub Actions publish workflow (`.github/workflows/publish.yml`) that publishes with npm provenance on version tags, as n8n requires for verified community nodes.
- **Domain > Get Company Profile** (`GET /v1/companies/{domain}`): all ad accounts of a domain across platforms with combined stats, with Platforms, Minimum Score, Max per Platform and Include Related Accounts options.
- **Ad > Search**: **Political Ads** option (Any, Exclude, Only).
- Hint for `403 history_limit` (ad older than the plan's archive window).

## [0.1.0] - 2026-10-26

First version.

- **AdLib** node: Advertiser (Resolve by Domain, Get, Get Ads, Get Changes, Get Stats, Get Timeline), Ad (Search, Get, Get History), Domain (Check if Advertising), Watchlist (Create, Get, List, Add Advertisers, Remove Advertiser, Delete), Batch (Create, Get) and Usage (Get). **Return All** follows `next_cursor`. Usable as an AI agent tool.
- **AdLib Trigger** node: creates a watchlist on activation (from advertiser IDs or a domain), deletes it on deactivation, verifies `X-AdLib-Signature` and emits `advertiser.changes` events, optionally one item per ad.
- **AdLib API** credential: API key (`X-API-Key`) and Base URL, tested with `GET /v1/usage`.
