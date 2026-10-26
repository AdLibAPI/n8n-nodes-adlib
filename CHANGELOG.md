# Changelog

## [0.1.0] - 2026-10-26

First version.

- **AdLib** node: Advertiser (Resolve by Domain, Get, Get Ads, Get Changes, Get Stats, Get Timeline), Ad (Search, Get, Get History), Domain (Check if Advertising), Watchlist (Create, Get, List, Add Advertisers, Remove Advertiser, Delete), Batch (Create, Get) and Usage (Get). **Return All** follows `next_cursor`. Usable as an AI agent tool.
- **AdLib Trigger** node: creates a watchlist on activation (from advertiser IDs or a domain), deletes it on deactivation, verifies `X-AdLib-Signature` and emits `advertiser.changes` events, optionally one item per ad.
- **AdLib API** credential: API key (`X-API-Key`) and Base URL, tested with `GET /v1/usage`.
