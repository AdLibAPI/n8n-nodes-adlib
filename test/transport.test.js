'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	cleanDomain,
	encodeSegment,
	splitList,
	apiErrorMessage,
	normalizeBaseUrl,
	compact,
} = require('../dist/nodes/AdLib/transport');

test('cleanDomain keeps only the host', () => {
	assert.equal(cleanDomain(' https://www.Nike.com/de/?x=1 '), 'www.nike.com');
	assert.equal(cleanDomain('nike.com'), 'nike.com');
	assert.equal(cleanDomain('http://shop.example.co.uk:8080/path'), 'shop.example.co.uk');
	assert.equal(cleanDomain(''), '');
});

test('encodeSegment keeps the platform colon', () => {
	assert.equal(encodeSegment(' meta:123 '), 'meta:123');
	assert.equal(encodeSegment('google:AR1/2'), 'google:AR1%2F2');
});

test('splitList splits commas and newlines', () => {
	assert.deepEqual(splitList('a, b\nc,,'), ['a', 'b', 'c']);
	assert.deepEqual(splitList(['x', ' y ']), ['x', 'y']);
	assert.deepEqual(splitList(undefined), []);
});

test('apiErrorMessage reads the AdLib error format', () => {
	assert.equal(
		apiErrorMessage({ error: { code: 'not_found', message: 'no such ad' } }),
		'no such ad',
	);
	assert.equal(apiErrorMessage({ detail: 'bad' }), 'bad');
	assert.equal(apiErrorMessage(null), undefined);
});

test('normalizeBaseUrl and compact', () => {
	assert.equal(normalizeBaseUrl('https://x.test/// '), 'https://x.test');
	assert.equal(normalizeBaseUrl(''), 'https://api.adlibapi.com');
	assert.deepEqual(compact({ a: 1, b: undefined, c: '', d: null, e: [], f: false }), {
		a: 1,
		f: false,
	});
});
