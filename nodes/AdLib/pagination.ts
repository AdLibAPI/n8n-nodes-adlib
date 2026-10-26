import type { IDataObject } from 'n8n-workflow';

export const DEFAULT_MAX_PAGES = 10;

/** The cursor for the next page, or undefined on the last page (next_cursor null or empty). */
export function nextCursorOf(page: IDataObject | undefined): string | undefined {
	const cursor = page?.next_cursor;
	return typeof cursor === 'string' && cursor ? cursor : undefined;
}

/**
 * Fetch pages by following next_cursor (passed back as cursor) until the last
 * page, a repeated cursor, or maxPages. Returns every page as received.
 */
export async function fetchAllPages(
	fetchPage: (cursor: string | undefined) => Promise<IDataObject>,
	maxPages: number,
	startCursor?: string,
): Promise<IDataObject[]> {
	const limit =
		Number.isFinite(maxPages) && maxPages > 0 ? Math.floor(maxPages) : DEFAULT_MAX_PAGES;
	const pages: IDataObject[] = [];
	const seen = new Set<string>();
	let cursor = startCursor || undefined;
	if (cursor) seen.add(cursor);
	for (let i = 0; i < limit; i++) {
		const page = await fetchPage(cursor);
		pages.push(page);
		cursor = nextCursorOf(page);
		if (!cursor || seen.has(cursor)) break;
		seen.add(cursor);
	}
	return pages;
}

/** The array under `key` of a page, or [] if missing or null. */
export function listOf(page: IDataObject, key = 'data'): IDataObject[] {
	const value = page[key];
	return Array.isArray(value) ? (value as IDataObject[]) : [];
}
