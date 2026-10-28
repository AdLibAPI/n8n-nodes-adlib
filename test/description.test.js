'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AdLib } = require('../dist/nodes/AdLib/AdLib.node');
const { AdLibTrigger } = require('../dist/nodes/AdLibTrigger/AdLibTrigger.node');
const { AdLibApi } = require('../dist/credentials/AdLibApi.credentials');
const {
	OPERATIONS,
	RESOURCES,
	PLATFORM_OPTIONS,
	SEARCH_PLATFORM_OPTIONS,
} = require('../dist/nodes/AdLib/descriptions');

const node = new AdLib();
const props = node.description.properties;
const credential = new AdLibApi();

test('node is usable as a tool and uses the credential', () => {
	assert.equal(node.description.usableAsTool, true);
	assert.deepEqual(
		node.description.credentials.map((c) => c.name),
		[credential.name],
	);
	assert.deepEqual(
		new AdLibTrigger().description.credentials.map((c) => c.name),
		[credential.name],
	);
});

test('credential sends X-API-Key and tests GET /v1/usage', () => {
	assert.equal(credential.authenticate.properties.headers['X-API-Key'].includes('apiKey'), true);
	assert.equal(credential.test.request.url, '/v1/usage');
	assert.equal(credential.test.request.method, 'GET');
	const baseUrl = credential.properties.find((p) => p.name === 'baseUrl');
	assert.equal(baseUrl.default, 'https://api.adlibapi.com');
});

test('all requested operations exist', () => {
	const expected = {
		advertiser: ['resolve', 'get', 'getAds', 'getChanges', 'getStats', 'getTimeline'],
		ad: ['search', 'get', 'getFeatures', 'getHistory', 'parseLibraryUrl'],
		domain: ['check', 'getCompany'],
		watchlist: ['create', 'get', 'list', 'addAdvertisers', 'removeAdvertiser', 'update', 'delete'],
		batch: ['create', 'get'],
		usage: ['get'],
	};
	assert.deepEqual(RESOURCES.map((r) => r.value).sort(), Object.keys(expected).sort());
	for (const [resource, ops] of Object.entries(expected)) {
		const prop = props.find(
			(p) => p.name === 'operation' && p.displayOptions.show.resource.includes(resource),
		);
		assert.ok(prop, resource);
		assert.deepEqual(prop.options.map((o) => o.value).sort(), [...ops].sort(), resource);
		assert.ok(
			prop.options.some((o) => o.value === prop.default),
			`${resource} default operation exists`,
		);
		for (const o of prop.options) assert.ok(o.action, `${resource}.${o.value} has an action`);
	}
});

test('option lists are sorted by name', () => {
	for (const p of props.filter((p) => p.name === 'operation' || p.name === 'resource')) {
		const names = p.options.map((o) => o.name);
		assert.deepEqual(
			names,
			[...names].sort((a, b) => a.localeCompare(b)),
		);
	}
});

test('platform options list every platform, search adds the YouTube and Play aliases', () => {
	assert.deepEqual(PLATFORM_OPTIONS.map((o) => o.value).sort(), [
		'amazon',
		'apple',
		'google',
		'linkedin',
		'meta',
		'microsoft',
		'pinterest',
		'snapchat',
		'tiktok',
		'x',
	]);
	assert.deepEqual(
		SEARCH_PLATFORM_OPTIONS.map((o) => o.value).sort(),
		[...PLATFORM_OPTIONS.map((o) => o.value), 'play', 'youtube'].sort(),
	);
	for (const list of [PLATFORM_OPTIONS, SEARCH_PLATFORM_OPTIONS]) {
		const names = list.map((o) => o.name);
		assert.deepEqual(
			names,
			[...names].sort((a, b) => a.localeCompare(b)),
		);
	}
	const search = props.find(
		(p) => p.name === 'platforms' && p.displayOptions.show.resource.includes('ad'),
	);
	assert.equal(search.options, SEARCH_PLATFORM_OPTIONS);
});

test('paginated operations have Return All, Limit and Max Pages', () => {
	for (const [resource, ops] of Object.entries(OPERATIONS)) {
		for (const op of ops.filter((o) => o.paginated)) {
			for (const name of ['returnAll', 'limit', 'maxPages']) {
				assert.ok(
					props.some(
						(p) =>
							p.name === name &&
							p.displayOptions.show.resource.includes(resource) &&
							p.displayOptions.show.operation.includes(op.value),
					),
					`${resource}.${op.value} ${name}`,
				);
			}
		}
	}
});

test('trigger is a webhook trigger with no inputs', () => {
	const d = new AdLibTrigger().description;
	assert.deepEqual(d.inputs, []);
	assert.equal(d.webhooks[0].httpMethod, 'POST');
	assert.ok(d.properties.some((p) => p.name === 'intervalHours'));
});
