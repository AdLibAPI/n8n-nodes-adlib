'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
	verifySignature,
	parseSignatureHeader,
	computeSignature,
	splitChanges,
} = require('../dist/nodes/AdLibTrigger/signature');

const secret = 'whsec_test';
const body = '{"event":"advertiser.changes","watchlist_id":"w1"}';
const now = 1_800_000_000;
// Same algorithm as the API's worker.Sign: hex HMAC-SHA256 over "<t>.<body>".
const sign = (t, b = body, key = secret) =>
	`t=${t},v1=${crypto.createHmac('sha256', key).update(`${t}.${b}`).digest('hex')}`;

test('computeSignature matches the reference HMAC', () => {
	assert.equal(sign(now).split('v1=')[1], computeSignature(secret, now, body));
	assert.equal(
		computeSignature(secret, now, Buffer.from(body)),
		computeSignature(secret, now, body),
	);
});

test('parses the header', () => {
	assert.deepEqual(parseSignatureHeader('t=12,v1=AB,v1=cd'), { t: 12, v1: ['ab', 'cd'] });
	assert.deepEqual(parseSignatureHeader(undefined), { v1: [] });
});

test('accepts a valid signature within 5 minutes', () => {
	assert.deepEqual(verifySignature(sign(now), body, secret, now), { valid: true });
	assert.deepEqual(verifySignature(sign(now - 299), Buffer.from(body), secret, now), {
		valid: true,
	});
	assert.deepEqual(verifySignature(sign(now + 299), body, secret, now), { valid: true });
});

test('rejects old timestamps, wrong secret, tampered body and junk', () => {
	assert.equal(
		verifySignature(sign(now - 301), body, secret, now).reason,
		'timestamp outside tolerance',
	);
	assert.equal(
		verifySignature(sign(now, body, 'other'), body, secret, now).reason,
		'signature mismatch',
	);
	assert.equal(verifySignature(sign(now), body + ' ', secret, now).reason, 'signature mismatch');
	assert.equal(verifySignature('garbage', body, secret, now).valid, false);
	assert.equal(verifySignature(`t=${now},v1=zz`, body, secret, now).valid, false);
	assert.equal(verifySignature(sign(now), body, '', now).valid, false);
});

test('splitChanges emits one item per ad event with context', () => {
	const event = {
		event: 'advertiser.changes',
		watchlist_id: 'w1',
		advertiser_id: 'meta:1',
		crawled_at: '2026-10-26T00:00:00Z',
		summary: { new: 1, started: 0, stopped: 1, changed: 1 },
		new: [{ type: 'discovered', ad_id: 'meta:a' }],
		started: [],
		stopped: [{ type: 'stopped', ad_id: 'meta:b' }],
		changed: [{ type: 'changed', ad_id: 'meta:c' }],
	};
	const items = splitChanges(event);
	assert.deepEqual(
		items.map((i) => [i.change, i.ad_id]),
		[
			['new', 'meta:a'],
			['stopped', 'meta:b'],
			['changed', 'meta:c'],
		],
	);
	assert.equal(items[0].advertiser_id, 'meta:1');
	assert.equal(items[0].watchlist_id, 'w1');
});
