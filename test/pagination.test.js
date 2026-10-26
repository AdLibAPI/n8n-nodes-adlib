'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchAllPages, nextCursorOf, listOf } = require('../dist/nodes/AdLib/pagination');

const page = (ids, next) => ({ data: ids.map((id) => ({ id })), next_cursor: next, meta: {} });

test('nextCursorOf reads next_cursor and treats null/empty as last page', () => {
	assert.equal(nextCursorOf(page([], 'c1')), 'c1');
	assert.equal(nextCursorOf(page([], null)), undefined);
	assert.equal(nextCursorOf(page([], '')), undefined);
	assert.equal(nextCursorOf(undefined), undefined);
});

test('fetchAllPages follows cursors until next_cursor is null', async () => {
	const pages = [page(['1', '2'], 'c1'), page(['3'], 'c2'), page(['4'], null)];
	const cursors = [];
	const result = await fetchAllPages(async (cursor) => {
		cursors.push(cursor);
		return pages[cursors.length - 1];
	}, 10);
	assert.deepEqual(cursors, [undefined, 'c1', 'c2']);
	assert.deepEqual(
		result.flatMap((p) => listOf(p)).map((a) => a.id),
		['1', '2', '3', '4'],
	);
});

test('fetchAllPages stops at maxPages and on a repeated cursor', async () => {
	let calls = 0;
	await fetchAllPages(async () => (calls++, page(['x'], `c${calls}`)), 3);
	assert.equal(calls, 3);
	calls = 0;
	await fetchAllPages(async () => (calls++, page(['x'], 'same')), 10);
	assert.equal(calls, 2);
});

test('fetchAllPages starts from a given cursor', async () => {
	const cursors = [];
	await fetchAllPages(async (c) => (cursors.push(c), page([], null)), 5, 'start');
	assert.deepEqual(cursors, ['start']);
});

test('listOf tolerates null data', () => {
	assert.deepEqual(listOf({ data: null }), []);
	assert.deepEqual(listOf({ items: [{ a: 1 }] }, 'items'), [{ a: 1 }]);
});
