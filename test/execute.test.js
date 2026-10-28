'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { AdLib } = require('../dist/nodes/AdLib/AdLib.node');
const { AdLibTrigger } = require('../dist/nodes/AdLibTrigger/AdLibTrigger.node');

/** Fake n8n context: parameters, credentials and a scripted HTTP responder. */
function fakeContext(params, respond, extra = {}) {
	const requests = [];
	return {
		requests,
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name, _i, fallback) => {
			const key = typeof _i === 'number' ? name : name;
			const v = params[key];
			if (v !== undefined) return v;
			return typeof _i === 'number' ? fallback : _i;
		},
		getCredentials: async () => ({ apiKey: 'k', baseUrl: 'https://adlib.test/' }),
		getNode: () => ({ name: 'AdLib', type: 'adLib', typeVersion: 1, parameters: {} }),
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async (cred, opts) => {
				requests.push({ cred, ...opts });
				return respond(opts, requests.length);
			},
			returnJsonArray: (items) => items.map((json) => ({ json })),
		},
		...extra,
	};
}

test('Ad > Search with Return All follows next_cursor and outputs one item per ad', async () => {
	const pages = [
		{ data: [{ id: 'meta:1' }, { id: 'meta:2' }], next_cursor: 'c1', meta: {} },
		{ data: [{ id: 'meta:3' }], next_cursor: null, meta: {} },
	];
	const ctx = fakeContext(
		{
			resource: 'ad',
			operation: 'search',
			searchBy: 'domain',
			searchTerm: 'https://www.Nike.com/de',
			platforms: ['meta', 'google'],
			returnAll: true,
			pageSize: 50,
			maxPages: 10,
			options: { country: 'de' },
		},
		(_opts, n) => ({ statusCode: 200, body: pages[n - 1] }),
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.deepEqual(
		out.map((i) => i.json.id),
		['meta:1', 'meta:2', 'meta:3'],
	);
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/search');
	assert.equal(ctx.requests[0].cred, 'adLibApi');
	assert.deepEqual(ctx.requests[0].qs, {
		domain: 'www.nike.com',
		platform: 'meta,google',
		country: 'DE',
		limit: 50,
	});
	assert.equal(ctx.requests[1].qs.cursor, 'c1');
});

test('Ad > Search sends the political filter', async () => {
	const ctx = fakeContext(
		{
			resource: 'ad',
			operation: 'search',
			searchBy: 'q',
			searchTerm: 'election',
			returnAll: false,
			limit: 10,
			options: { political: 'true' },
		},
		() => ({ statusCode: 200, body: { data: [], next_cursor: null, meta: {} } }),
	);
	await new AdLib().execute.call(ctx);
	assert.deepEqual(ctx.requests[0].qs, { q: 'election', political: 'true', limit: 10 });
});

test('Ad > Search sends new platforms, placement and the removed filter', async () => {
	const ctx = fakeContext(
		{
			resource: 'ad',
			operation: 'search',
			searchBy: 'domain',
			searchTerm: 'nike.com',
			platforms: ['youtube', 'snapchat', 'microsoft'],
			returnAll: false,
			limit: 10,
			options: { placement: 'youtube', removed: 'true', source: 'history', format: '' },
		},
		() => ({ statusCode: 200, body: { data: [], next_cursor: null, meta: {} } }),
	);
	await new AdLib().execute.call(ctx);
	assert.deepEqual(ctx.requests[0].qs, {
		domain: 'nike.com',
		platform: 'youtube,snapchat,microsoft',
		placement: 'youtube',
		removed: 'true',
		source: 'history',
		limit: 10,
	});
});

test('Ad > Get Ad Features returns the features with meta', async () => {
	const ctx = fakeContext(
		{ resource: 'ad', operation: 'getFeatures', adId: 'meta:1187430977361020' },
		() => ({
			statusCode: 200,
			body: {
				data: { version: '1', method: 'rules', format: 'vertical_video', text: { hook: 'New?' } },
				meta: { ad_id: 'meta:1187430977361020', cached: false },
			},
		}),
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.equal(ctx.requests[0].method, 'GET');
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/ads/meta:1187430977361020/features');
	assert.equal(out[0].json.format, 'vertical_video');
	assert.equal(out[0].json._meta.ad_id, 'meta:1187430977361020');
});

test('Ad > Get Ad Features asks again while the API answers processing', async () => {
	let n = 0;
	const ctx = fakeContext({ resource: 'ad', operation: 'getFeatures', adId: 'tiktok:1' }, () =>
		++n < 2
			? { statusCode: 202, body: { data: null, meta: { ad_id: 'tiktok:1', status: 'processing', retry_after: 1 } } }
			: { statusCode: 200, body: { data: { format: 'vertical_video' }, meta: { ad_id: 'tiktok:1', status: 'ready' } } },
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.equal(ctx.requests.length, 2);
	assert.equal(out[0].json.format, 'vertical_video');
});

test('Ad > Parse Library URL sends the link', async () => {
	const link = 'https://www.facebook.com/ads/library/?id=1187430977361020';
	const ctx = fakeContext(
		{ resource: 'ad', operation: 'parseLibraryUrl', libraryUrl: ` ${link} ` },
		() => ({
			statusCode: 200,
			body: {
				data: {
					kind: 'ad',
					platform: 'meta',
					id: 'meta:1187430977361020',
					href: '/v1/ads/meta:1187430977361020',
				},
			},
		}),
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/library-url');
	assert.deepEqual(ctx.requests[0].qs, { url: link });
	assert.equal(out[0].json.id, 'meta:1187430977361020');
});

test('Watchlist > Update sends a PATCH with the changed fields', async () => {
	const ctx = fakeContext(
		{
			resource: 'watchlist',
			operation: 'update',
			watchlistId: 'w1',
			updateFields: { name: ' Rivals ', webhookUrl: '', emailAlerts: true },
		},
		() => ({ statusCode: 200, body: { data: { id: 'w1', email_alerts: true } } }),
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.equal(out[0].json.email_alerts, true);
	assert.equal(ctx.requests[0].method, 'PATCH');
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/watchlists/w1');
	assert.deepEqual(ctx.requests[0].body, { name: 'Rivals', webhook_url: '', email_alerts: true });

	const empty = fakeContext(
		{ resource: 'watchlist', operation: 'update', watchlistId: 'w1', updateFields: {} },
		() => ({ statusCode: 200, body: {} }),
	);
	await assert.rejects(new AdLib().execute.call(empty), /at least one field/);
	assert.equal(empty.requests.length, 0);
});

test('Domain > Get Company Profile sends the domain and options', async () => {
	const ctx = fakeContext(
		{
			resource: 'domain',
			operation: 'getCompany',
			domain: 'https://www.Audi.de/de',
			options: {
				platforms: ['meta', 'google'],
				minScore: 0.5,
				maxPerPlatform: 3,
				includeRelated: true,
			},
		},
		() => ({
			statusCode: 200,
			body: { data: { domain: 'www.audi.de', name: 'Audi', accounts: [], platforms: [] } },
		}),
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.equal(out.length, 1);
	assert.equal(out[0].json.name, 'Audi');
	assert.equal(ctx.requests[0].method, 'GET');
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/companies/www.audi.de');
	assert.deepEqual(ctx.requests[0].qs, {
		platform: 'meta,google',
		min_score: 0.5,
		max_per_platform: 3,
		include_related: true,
	});
});

test('API errors carry the AdLib message', async () => {
	const ctx = fakeContext(
		{ resource: 'ad', operation: 'get', adId: 'meta:9', options: {} },
		() => ({
			statusCode: 404,
			body: { error: { code: 'not_found', message: 'ad not found' } },
		}),
	);
	await assert.rejects(new AdLib().execute.call(ctx), /AdLib API error 404: ad not found/);
});

test('Watchlist > Create sends advertisers and options', async () => {
	const ctx = fakeContext(
		{
			resource: 'watchlist',
			operation: 'create',
			advertiserIds: 'meta:1, google:AR2',
			options: { name: 'Rivals', intervalHours: 12, emailAlerts: true },
		},
		() => ({ statusCode: 201, body: { data: { id: 'w1', name: 'Rivals' } } }),
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.equal(out[0].json.id, 'w1');
	assert.equal(ctx.requests[0].method, 'POST');
	assert.deepEqual(ctx.requests[0].body, {
		advertisers: ['meta:1', 'google:AR2'],
		name: 'Rivals',
		interval_hours: 12,
		email_alerts: true,
	});
});

function webhookContext({
	body,
	header,
	staticData,
	options = {},
	secret = 'whsec_x',
	mode = 'trigger',
}) {
	const raw = Buffer.from(JSON.stringify(body));
	const response = {};
	const ctx = fakeContext(
		{ options },
		(opts) => {
			assert.equal(opts.url, 'https://adlib.test/v1/webhooks/secret');
			return { statusCode: 200, body: { data: { secret, version: 1 } } };
		},
		{
			getRequestObject: () => ({ rawBody: raw }),
			getResponseObject: () => ({
				status(code) {
					response.status = code;
					return this;
				},
				json(b) {
					response.body = b;
				},
			}),
			getBodyData: () => body,
			getHeaderData: () => ({ 'x-adlib-signature': header(raw) }),
			getWorkflowStaticData: () => staticData,
			getMode: () => mode,
		},
	);
	return { ctx, response };
}

const signRaw = (secret, t) => (raw) =>
	`t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.`).update(raw).digest('hex')}`;

const changes = {
	event: 'advertiser.changes',
	watchlist_id: 'w1',
	advertiser_id: 'meta:1',
	crawled_at: '2026-10-26T00:00:00Z',
	summary: { new: 1, started: 0, stopped: 1, changed: 0 },
	new: [{ type: 'discovered', ad_id: 'meta:a' }],
	started: [],
	stopped: [{ type: 'stopped', ad_id: 'meta:b' }],
	changed: [],
};

test('trigger emits the event when the signature is valid', async () => {
	const now = Math.floor(Date.now() / 1000);
	const { ctx } = webhookContext({
		body: changes,
		header: signRaw('whsec_x', now),
		staticData: { watchlistId: 'w1', secret: 'whsec_x' },
	});
	const res = await new AdLibTrigger().webhook.call(ctx);
	assert.equal(res.workflowData[0].length, 1);
	assert.equal(res.workflowData[0][0].json.advertiser_id, 'meta:1');
	assert.equal(ctx.requests.length, 0, 'cached secret used');
});

test('trigger splits into one item per ad', async () => {
	const now = Math.floor(Date.now() / 1000);
	const { ctx } = webhookContext({
		body: changes,
		header: signRaw('whsec_x', now),
		staticData: { watchlistId: 'w1', secret: 'whsec_x' },
		options: { splitIntoAds: true },
	});
	const res = await new AdLibTrigger().webhook.call(ctx);
	assert.deepEqual(
		res.workflowData[0].map((i) => i.json.change),
		['new', 'stopped'],
	);
});

test('trigger refetches a rotated secret, and rejects bad signatures with 401', async () => {
	const now = Math.floor(Date.now() / 1000);
	const staticData = { watchlistId: 'w1', secret: 'whsec_old' };
	const ok = webhookContext({
		body: changes,
		header: signRaw('whsec_new', now),
		staticData,
		secret: 'whsec_new',
	});
	const res = await new AdLibTrigger().webhook.call(ok.ctx);
	assert.equal(res.workflowData[0].length, 1);
	assert.equal(staticData.secret, 'whsec_new');

	const bad = webhookContext({
		body: changes,
		header: signRaw('whsec_new', now - 600),
		staticData: { watchlistId: 'w1', secret: 'whsec_new' },
	});
	const res2 = await new AdLibTrigger().webhook.call(bad.ctx);
	assert.equal(res2.noWebhookResponse, true);
	assert.equal(bad.response.status, 401);
});

test('trigger activation resolves a domain, creates the watchlist and deletes it again', async () => {
	const staticData = {};
	const ctx = fakeContext(
		{
			watchBy: 'domain',
			domain: 'Rival.com',
			platforms: [],
			minScore: 0.5,
			maxPerPlatform: 1,
			intervalHours: 6,
			options: {},
		},
		(opts) => {
			if (opts.url.endsWith('/v1/advertisers/resolve')) {
				return {
					statusCode: 200,
					body: {
						data: {
							domain: 'rival.com',
							advertisers: [
								{ id: 'meta:1', score: 0.9 },
								{ id: 'google:AR2', score: 0.2 },
							],
						},
					},
				};
			}
			if (opts.url.endsWith('/v1/watchlists') && opts.method === 'POST') {
				return { statusCode: 201, body: { data: { id: 'w9' } } };
			}
			if (opts.url.endsWith('/v1/webhooks/secret')) {
				return { statusCode: 200, body: { data: { secret: 'whsec_s', version: 1 } } };
			}
			if (opts.method === 'DELETE') return { statusCode: 204, body: '' };
			throw new Error(`unexpected ${opts.method} ${opts.url}`);
		},
		{
			getWorkflowStaticData: () => staticData,
			getNodeWebhookUrl: () => 'https://n8n.test/webhook/abc/webhook',
			getWorkflow: () => ({ id: '1', name: 'Rivals' }),
		},
	);
	const trigger = new AdLibTrigger();
	assert.equal(await trigger.webhookMethods.default.create.call(ctx), true);
	const post = ctx.requests.find((r) => r.method === 'POST');
	assert.deepEqual(post.body, {
		name: 'n8n: Rivals',
		advertisers: ['meta:1'],
		webhook_url: 'https://n8n.test/webhook/abc/webhook',
		interval_hours: 6,
	});
	assert.equal(ctx.requests[0].qs.domain, 'rival.com');
	assert.deepEqual(staticData, {
		watchlistId: 'w9',
		webhookUrl: 'https://n8n.test/webhook/abc/webhook',
		secret: 'whsec_s',
	});
	assert.equal(await trigger.webhookMethods.default.delete.call(ctx), true);
	assert.equal(ctx.requests.at(-1).url, 'https://adlib.test/v1/watchlists/w9');
	assert.deepEqual(staticData, {});
});

test('Advertiser > Report Resolve Match posts the report', async () => {
	const ctx = fakeContext(
		{
			resource: 'advertiser',
			operation: 'reportMatch',
			domain: 'https://www.Audi.de/',
			reportKind: 'wrong_role',
			reportAdvertiserId: ' google:AR017 ',
			reportRole: 'agency',
			reportNote: ' agency account, not the brand ',
		},
		() => ({ statusCode: 201, body: { data: { id: 'r1', status: 'open' } } }),
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.equal(out[0].json.id, 'r1');
	assert.equal(ctx.requests[0].method, 'POST');
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/advertisers/resolve/reports');
	assert.deepEqual(ctx.requests[0].body, {
		kind: 'wrong_role',
		domain: 'www.audi.de',
		advertiser_id: 'google:AR017',
		role: 'agency',
		note: 'agency account, not the brand',
	});

	const missing = fakeContext(
		{
			resource: 'advertiser',
			operation: 'reportMatch',
			domain: 'audi.de',
			reportKind: 'missing_match',
		},
		() => ({ statusCode: 201, body: { data: { id: 'r2' } } }),
	);
	await new AdLib().execute.call(missing);
	assert.deepEqual(missing.requests[0].body, { kind: 'missing_match', domain: 'audi.de' });

	const noId = fakeContext(
		{
			resource: 'advertiser',
			operation: 'reportMatch',
			domain: 'audi.de',
			reportKind: 'wrong_match',
		},
		() => ({ statusCode: 201, body: {} }),
	);
	await assert.rejects(new AdLib().execute.call(noId), /Advertiser ID is required/);
	assert.equal(noId.requests.length, 0);
});

test('Advertiser > List Resolve Reports outputs one item per report', async () => {
	const ctx = fakeContext({ resource: 'advertiser', operation: 'listReports' }, () => ({
		statusCode: 200,
		body: { data: [{ id: 'r1' }, { id: 'r2' }] },
	}));
	const [out] = await new AdLib().execute.call(ctx);
	assert.deepEqual(
		out.map((i) => i.json.id),
		['r1', 'r2'],
	);
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/advertisers/resolve/reports');
});

test('Domain > Suggest Domains sends q and limit', async () => {
	const ctx = fakeContext(
		{ resource: 'domain', operation: 'suggest', query: ' nik ', maxResults: 5 },
		() => ({ statusCode: 200, body: { data: [{ domain: 'nike.com' }] } }),
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.equal(out[0].json.domain, 'nike.com');
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/domains/suggest');
	assert.deepEqual(ctx.requests[0].qs, { q: 'nik', limit: 5 });
});

test('Platform > List and Get Status', async () => {
	const list = fakeContext({ resource: 'platform', operation: 'list' }, () => ({
		statusCode: 200,
		body: { data: [{ platform: 'meta' }, { platform: 'google' }] },
	}));
	const [listOut] = await new AdLib().execute.call(list);
	assert.equal(listOut.length, 2);
	assert.equal(list.requests[0].url, 'https://adlib.test/v1/platforms');

	const status = fakeContext({ resource: 'platform', operation: 'getStatus' }, () => ({
		statusCode: 200,
		body: { status: 'operational', version: '1', platforms: [] },
	}));
	const [statusOut] = await new AdLib().execute.call(status);
	assert.equal(statusOut[0].json.status, 'operational');
	assert.equal(status.requests[0].url, 'https://adlib.test/v1/status');
});

test('Webhook > List Deliveries filters by status and paginates', async () => {
	const pages = [
		{ data: [{ id: 1 }], next_cursor: 'c1' },
		{ data: [{ id: 2 }], next_cursor: null },
	];
	const ctx = fakeContext(
		{
			resource: 'webhook',
			operation: 'listDeliveries',
			returnAll: true,
			pageSize: 100,
			maxPages: 5,
			options: { status: 'failed' },
		},
		(_opts, n) => ({ statusCode: 200, body: pages[n - 1] }),
	);
	const [out] = await new AdLib().execute.call(ctx);
	assert.deepEqual(
		out.map((i) => i.json.id),
		[1, 2],
	);
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/webhooks/deliveries');
	assert.deepEqual(ctx.requests[0].qs, { status: 'failed', limit: 100 });
	assert.equal(ctx.requests[1].qs.cursor, 'c1');
});

test('Webhook > Get Delivery, Redeliver and Send Test', async () => {
	const get = fakeContext(
		{ resource: 'webhook', operation: 'getDelivery', deliveryId: ' 42 ' },
		() => ({ statusCode: 200, body: { data: { id: 42, status: 'failed', payload: {} } } }),
	);
	const [getOut] = await new AdLib().execute.call(get);
	assert.equal(getOut[0].json.id, 42);
	assert.equal(get.requests[0].url, 'https://adlib.test/v1/webhooks/deliveries/42');

	const redeliver = fakeContext(
		{ resource: 'webhook', operation: 'redeliver', deliveryId: '42' },
		() => ({ statusCode: 202, body: { delivery_id: 43, status: 'pending' } }),
	);
	const [redOut] = await new AdLib().execute.call(redeliver);
	assert.equal(redOut[0].json.delivery_id, 43);
	assert.equal(redeliver.requests[0].method, 'POST');
	assert.equal(redeliver.requests[0].url, 'https://adlib.test/v1/webhooks/deliveries/42/redeliver');

	const bad = fakeContext(
		{ resource: 'webhook', operation: 'redeliver', deliveryId: 'abc' },
		() => ({ statusCode: 202, body: {} }),
	);
	await assert.rejects(new AdLib().execute.call(bad), /Delivery ID must be a number/);
	assert.equal(bad.requests.length, 0);

	const ping = fakeContext(
		{ resource: 'webhook', operation: 'test', url: ' https://hooks.slack.com/services/x ' },
		() => ({ statusCode: 202, body: { delivery_id: 7, status: 'pending' } }),
	);
	await new AdLib().execute.call(ping);
	assert.equal(ping.requests[0].url, 'https://adlib.test/v1/webhooks/test');
	assert.deepEqual(ping.requests[0].body, { url: 'https://hooks.slack.com/services/x' });
});

test('Webhook > Rotate Secret posts to the rotate endpoint', async () => {
	const ctx = fakeContext({ resource: 'webhook', operation: 'rotateSecret' }, () => ({
		statusCode: 200,
		body: { data: { secret: 'whsec_test' } },
	}));
	const [out] = await new AdLib().execute.call(ctx);
	assert.equal(ctx.requests[0].method, 'POST');
	assert.equal(ctx.requests[0].url, 'https://adlib.test/v1/webhooks/secret/rotate');
	assert.equal(typeof out[0].json.secret, 'string');
});

test('Batch > Create sends min_score and rejects more than 100 items', async () => {
	const ctx = fakeContext(
		{
			resource: 'batch',
			operation: 'create',
			itemType: 'domains',
			items: 'nike.com\nhttps://adidas.com/',
			options: { minScore: 0.8 },
		},
		() => ({ statusCode: 202, body: { data: { id: 'j1', status: 'queued' } } }),
	);
	await new AdLib().execute.call(ctx);
	assert.deepEqual(ctx.requests[0].body, {
		type: 'domains',
		items: ['nike.com', 'adidas.com'],
		options: { min_score: 0.8 },
	});

	const many = fakeContext(
		{
			resource: 'batch',
			operation: 'create',
			itemType: 'ads',
			items: Array.from({ length: 101 }, (_, n) => `meta:${n}`).join(','),
			options: {},
		},
		() => ({ statusCode: 202, body: {} }),
	);
	await assert.rejects(new AdLib().execute.call(many), /at most 100 per batch/);
	assert.equal(many.requests.length, 0);
});
