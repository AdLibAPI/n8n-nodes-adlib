import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type JsonObject,
} from 'n8n-workflow';
import { buildProperties } from './descriptions';
import { DEFAULT_MAX_PAGES, fetchAllPages, listOf } from './pagination';
import {
	adLibApiRequest,
	cleanDomain,
	encodeSegment,
	splitList,
	CREDENTIAL_NAME,
} from './transport';

type Ctx = IExecuteFunctions;

/** Unwrap {data, meta}: single objects come back as `data`, with `meta` kept as `_meta`. */
function unwrap(body: IDataObject): IDataObject {
	const data = body.data;
	if (!data || typeof data !== 'object' || Array.isArray(data)) return body;
	const out: IDataObject = { ...(data as IDataObject) };
	if (body.meta !== undefined) out._meta = body.meta;
	return out;
}

/** "a,b" for multiOptions values, undefined when empty. */
function csv(value: unknown): string | undefined {
	const list = splitList(value);
	return list.length ? list.join(',') : undefined;
}

/**
 * Run a paginated list endpoint. Without Return All, one request with
 * limit=Limit. With Return All, follow next_cursor up to Max Pages.
 * Returns the pages as received.
 */
async function listPages(
	ctx: Ctx,
	i: number,
	path: string,
	qs: IDataObject,
	startCursor: string | undefined,
): Promise<IDataObject[]> {
	const returnAll = ctx.getNodeParameter('returnAll', i, false) as boolean;
	if (!returnAll) {
		const limit = ctx.getNodeParameter('limit', i, 50) as number;
		const page = await adLibApiRequest.call(ctx, 'GET', path, {
			qs: { ...qs, limit, cursor: startCursor },
		});
		return [page];
	}
	const pageSize = ctx.getNodeParameter('pageSize', i, 25) as number;
	const maxPages = ctx.getNodeParameter('maxPages', i, DEFAULT_MAX_PAGES) as number;
	return await fetchAllPages(
		(cursor) => adLibApiRequest.call(ctx, 'GET', path, { qs: { ...qs, limit: pageSize, cursor } }),
		maxPages,
		startCursor,
	);
}

/** One output object per result, or the pages themselves with Raw Pages. */
function flatten(pages: IDataObject[], raw: boolean, key = 'data'): IDataObject[] {
	if (raw) return pages;
	return pages.flatMap((page) => listOf(page, key));
}

async function runOperation(
	ctx: Ctx,
	i: number,
	resource: string,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	const options = (ctx.getNodeParameter('options', i, {}) ?? {}) as IDataObject;
	const raw = options.rawPages === true;
	const cursor =
		typeof options.cursor === 'string' && options.cursor.trim() ? options.cursor.trim() : undefined;

	if (resource === 'advertiser') {
		if (operation === 'resolve') {
			const domain = cleanDomain(ctx.getNodeParameter('domain', i));
			if (!domain) throw new NodeOperationError(ctx.getNode(), 'Domain is empty', { itemIndex: i });
			const body = await adLibApiRequest.call(ctx, 'GET', '/v1/advertisers/resolve', {
				qs: {
					domain,
					platform: csv(options.platforms),
					max_per_platform: options.maxPerPlatform as number | undefined,
				},
			});
			const data = unwrap(body);
			const minScore = Number(options.minScore ?? 0);
			const advertisers = listOf(data, 'advertisers').filter(
				(a) => !minScore || Number(a.score ?? 0) >= minScore,
			);
			if (options.split === true) return advertisers;
			return { ...data, advertisers };
		}
		const id = encodeSegment(ctx.getNodeParameter('advertiserId', i));
		const base = `/v1/advertisers/${id}`;
		switch (operation) {
			case 'get':
				return unwrap(
					await adLibApiRequest.call(ctx, 'GET', base, {
						qs: { refresh: options.refresh === true ? true : undefined },
					}),
				);
			case 'getStats':
				return unwrap(await adLibApiRequest.call(ctx, 'GET', `${base}/stats`));
			case 'getAds': {
				const pages = await listPages(
					ctx,
					i,
					`${base}/ads`,
					{ status: options.status, source: options.source, sort: options.sort },
					cursor,
				);
				return flatten(pages, raw);
			}
			case 'getChanges': {
				const pages = await listPages(
					ctx,
					i,
					`${base}/changes`,
					{ since: String(ctx.getNodeParameter('since', i)).trim(), types: csv(options.types) },
					cursor,
				);
				return flatten(pages, raw);
			}
			case 'getTimeline': {
				const pages = await listPages(
					ctx,
					i,
					`${base}/timeline`,
					{ from: options.from, to: options.to },
					cursor,
				);
				return flatten(pages, raw);
			}
		}
	}

	if (resource === 'ad') {
		if (operation === 'search') {
			const searchBy = ctx.getNodeParameter('searchBy', i) as string;
			let term = String(ctx.getNodeParameter('searchTerm', i) ?? '').trim();
			if (searchBy === 'domain') term = cleanDomain(term);
			if (!term)
				throw new NodeOperationError(ctx.getNode(), 'Search Term is empty', { itemIndex: i });
			const pages = await listPages(
				ctx,
				i,
				'/v1/search',
				{
					[searchBy]: term,
					platform: csv(ctx.getNodeParameter('platforms', i, [])),
					country:
						typeof options.country === 'string' ? options.country.trim().toUpperCase() : undefined,
					status: options.status,
					from: options.from,
					to: options.to,
					format: options.format,
					source: options.source,
					sort: options.sort,
				},
				cursor,
			);
			return flatten(pages, raw);
		}
		const id = encodeSegment(ctx.getNodeParameter('adId', i));
		if (operation === 'get') {
			return unwrap(
				await adLibApiRequest.call(ctx, 'GET', `/v1/ads/${id}`, {
					qs: { max_age: options.maxAge as number | undefined },
				}),
			);
		}
		if (operation === 'getHistory') {
			return unwrap(await adLibApiRequest.call(ctx, 'GET', `/v1/ads/${id}/history`));
		}
	}

	if (resource === 'domain' && operation === 'check') {
		const domain = cleanDomain(ctx.getNodeParameter('domain', i));
		if (!domain) throw new NodeOperationError(ctx.getNode(), 'Domain is empty', { itemIndex: i });
		return unwrap(
			await adLibApiRequest.call(ctx, 'GET', `/v1/domains/${encodeSegment(domain)}/check`, {
				qs: { platform: csv(options.platforms) },
			}),
		);
	}

	if (resource === 'watchlist') {
		switch (operation) {
			case 'list':
				return listOf(await adLibApiRequest.call(ctx, 'GET', '/v1/watchlists'));
			case 'create': {
				const body: IDataObject = {
					advertisers: splitList(ctx.getNodeParameter('advertiserIds', i)),
				};
				if (typeof options.name === 'string' && options.name.trim())
					body.name = options.name.trim();
				if (options.intervalHours !== undefined) body.interval_hours = options.intervalHours;
				if (options.archiveVideos !== undefined) body.archive_videos = options.archiveVideos;
				if (typeof options.webhookUrl === 'string' && options.webhookUrl.trim()) {
					body.webhook_url = options.webhookUrl.trim();
				}
				return unwrap(await adLibApiRequest.call(ctx, 'POST', '/v1/watchlists', { body }));
			}
		}
		const id = encodeSegment(ctx.getNodeParameter('watchlistId', i));
		switch (operation) {
			case 'get':
				return unwrap(await adLibApiRequest.call(ctx, 'GET', `/v1/watchlists/${id}`));
			case 'addAdvertisers':
				return unwrap(
					await adLibApiRequest.call(ctx, 'POST', `/v1/watchlists/${id}/advertisers`, {
						body: { advertisers: splitList(ctx.getNodeParameter('advertiserIds', i)) },
					}),
				);
			case 'removeAdvertiser': {
				const advertiserId = String(ctx.getNodeParameter('advertiserId', i)).trim();
				await adLibApiRequest.call(
					ctx,
					'DELETE',
					`/v1/watchlists/${id}/advertisers/${encodeSegment(advertiserId)}`,
				);
				return { removed: true, watchlist_id: decodeURIComponent(id), advertiser_id: advertiserId };
			}
			case 'delete':
				await adLibApiRequest.call(ctx, 'DELETE', `/v1/watchlists/${id}`);
				return { deleted: true, id: decodeURIComponent(id) };
		}
	}

	if (resource === 'batch') {
		if (operation === 'create') {
			const items = splitList(ctx.getNodeParameter('items', i));
			if (!items.length)
				throw new NodeOperationError(ctx.getNode(), 'Items is empty', { itemIndex: i });
			if (items.length > 1000) {
				throw new NodeOperationError(
					ctx.getNode(),
					`Items: at most 1,000 per batch (got ${items.length})`,
					{ itemIndex: i, description: 'Split the list into smaller batches' },
				);
			}
			const type = ctx.getNodeParameter('itemType', i) as string;
			const batchOptions: IDataObject = {};
			if (typeof options.country === 'string' && options.country.trim()) {
				batchOptions.country = options.country.trim().toUpperCase();
			}
			if (options.includeAds !== undefined) batchOptions.include_ads = options.includeAds;
			if (options.maxPages !== undefined) batchOptions.max_pages = options.maxPages;
			const platforms = splitList(options.platforms);
			if (platforms.length) batchOptions.platforms = platforms;
			if (options.status) batchOptions.status = options.status;
			const body: IDataObject = {
				type,
				items: type === 'domains' ? items.map(cleanDomain).filter((d) => d) : items,
			};
			if (Object.keys(batchOptions).length) body.options = batchOptions;
			if (typeof options.webhookUrl === 'string' && options.webhookUrl.trim()) {
				body.webhook_url = options.webhookUrl.trim();
			}
			return unwrap(await adLibApiRequest.call(ctx, 'POST', '/v1/batch', { body }));
		}
		if (operation === 'get') {
			const jobId = encodeSegment(ctx.getNodeParameter('jobId', i));
			const pages = await listPages(ctx, i, `/v1/batch/${jobId}`, {}, cursor);
			const last = pages[pages.length - 1] ?? {};
			return {
				...((pages[0]?.data as IDataObject) ?? {}),
				items: pages.flatMap((p) => listOf(p, 'items')),
				next_cursor: last.next_cursor ?? null,
			};
		}
	}

	if (resource === 'usage' && operation === 'get') {
		return unwrap(
			await adLibApiRequest.call(ctx, 'GET', '/v1/usage', {
				qs: { days: ctx.getNodeParameter('days', i, 30) as number },
			}),
		);
	}

	throw new NodeOperationError(
		ctx.getNode(),
		`Unsupported operation "${operation}" for resource "${resource}"`,
		{ itemIndex: i },
	);
}

export class AdLib implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AdLib',
		name: 'adLib',
		icon: { light: 'file:../../icons/adlib.svg', dark: 'file:../../icons/adlib.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Search the ad libraries of Meta, Google, TikTok, LinkedIn, Pinterest and X, resolve advertisers and watch competitors via the AdLib API',
		defaults: {
			name: 'AdLib',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: CREDENTIAL_NAME, required: true }],
		properties: buildProperties(),
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const result = await runOperation(this, i, resource, operation);
				const list = Array.isArray(result) ? result : [result];
				for (const json of list) out.push({ json, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// Both constructors hand back an error that already has the right class.
				if (error instanceof NodeApiError)
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [out];
	}
}
