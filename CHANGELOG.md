# Changelog

## [Unreleased]

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
