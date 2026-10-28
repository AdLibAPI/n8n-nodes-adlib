import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';
import { PLATFORM_OPTIONS } from '../AdLib/descriptions';
import {
	adLibApiRequest,
	cleanDomain,
	CREDENTIAL_NAME,
	encodeSegment,
	splitList,
} from '../AdLib/transport';
import { SIGNATURE_HEADER, splitChanges, verifySignature } from './signature';

type StaticData = { watchlistId?: string; webhookUrl?: string; secret?: string };

function httpCodeOf(error: unknown): string | undefined {
	const code = (error as { httpCode?: unknown })?.httpCode;
	return code === undefined || code === null ? undefined : String(code);
}

/** The advertiser IDs to watch: entered directly, or resolved from a domain. */
async function advertisersToWatch(this: IHookFunctions): Promise<string[]> {
	const watchBy = this.getNodeParameter('watchBy') as string;
	if (watchBy === 'advertiserIds') {
		const ids = splitList(this.getNodeParameter('advertiserIds'));
		if (!ids.length)
			throw new NodeOperationError(this.getNode(), 'Enter at least one advertiser ID');
		return ids;
	}
	const domain = cleanDomain(this.getNodeParameter('domain'));
	if (!domain) throw new NodeOperationError(this.getNode(), 'Domain is empty');
	const platforms = splitList(this.getNodeParameter('platforms', []));
	const minScore = Number(this.getNodeParameter('minScore', 0.5));
	const maxPerPlatform = Number(this.getNodeParameter('maxPerPlatform', 1));
	const body = await adLibApiRequest.call(this, 'GET', '/v1/advertisers/resolve', {
		qs: {
			domain,
			platform: platforms.length ? platforms.join(',') : undefined,
			max_per_platform: maxPerPlatform,
		},
	});
	const advertisers = ((body.data as IDataObject)?.advertisers ?? []) as IDataObject[];
	const ids = advertisers
		.filter((a) => Number(a.score ?? 0) >= minScore && typeof a.id === 'string')
		.map((a) => a.id as string);
	if (!ids.length) {
		throw new NodeOperationError(
			this.getNode(),
			`No advertisers found for ${domain} with a score of at least ${minScore}`,
			{ description: 'Lower Minimum Score, add platforms, or enter advertiser IDs directly' },
		);
	}
	return ids;
}

export class AdLibTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AdLib Trigger',
		name: 'adLibTrigger',
		icon: { light: 'file:../../icons/adlib.svg', dark: 'file:../../icons/adlib.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle:
			'={{"Watch " + ($parameter["watchBy"] === "domain" ? $parameter["domain"] : $parameter["advertiserIds"])}}',
		description:
			'Starts the workflow when watched advertisers start, stop, change or remove ads (AdLib watchlist webhook)',
		defaults: {
			name: 'AdLib Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: CREDENTIAL_NAME, required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'On activation this node creates an AdLib watchlist that sends changes to this workflow, and deletes it on deactivation. The first crawl is the baseline, so events arrive from the second crawl on.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Watch By',
				name: 'watchBy',
				type: 'options',
				options: [
					{
						name: 'Advertiser IDs',
						value: 'advertiserIds',
						description: 'Watch advertisers you already know the IDs of',
					},
					{
						name: 'Domain',
						value: 'domain',
						description: "Resolve a company's advertisers from its domain, then watch them",
					},
				],
				default: 'advertiserIds',
			},
			{
				displayName: 'Advertiser IDs',
				name: 'advertiserIds',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'meta:15087023444, google:AR123',
				description: 'Comma-separated advertiser IDs (platform:ID)',
				displayOptions: { show: { watchBy: ['advertiserIds'] } },
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'competitor.com',
				description: 'Company domain whose advertisers to watch',
				displayOptions: { show: { watchBy: ['domain'] } },
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: PLATFORM_OPTIONS,
				default: [],
				description: 'Platforms to resolve the domain on. Leave empty for all.',
				displayOptions: { show: { watchBy: ['domain'] } },
			},
			{
				displayName: 'Minimum Score',
				name: 'minScore',
				type: 'number',
				default: 0.5,
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				description:
					'Only watch advertisers whose match confidence (0 to 1) is at least this value',
				displayOptions: { show: { watchBy: ['domain'] } },
			},
			{
				displayName: 'Max per Platform',
				name: 'maxPerPlatform',
				type: 'number',
				default: 1,
				typeOptions: { minValue: 1, maxValue: 10 },
				description: 'Most advertisers watched per platform',
				displayOptions: { show: { watchBy: ['domain'] } },
			},
			{
				displayName: 'Crawl Interval (Hours)',
				name: 'intervalHours',
				type: 'number',
				default: 24,
				typeOptions: { minValue: 1, maxValue: 168 },
				description:
					'How often AdLib crawls the advertisers. Shortest per plan: Free and Starter 24, Growth 12, Pro 6, Business 1.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Archive Videos',
						name: 'archiveVideos',
						type: 'boolean',
						default: true,
						description: 'Whether AdLib keeps full video files for these advertisers',
					},
					{
						displayName: 'Email Alerts',
						name: 'emailAlerts',
						type: 'boolean',
						default: false,
						description:
							"Whether AdLib also mails a digest of each crawl's changes to your account's email",
					},
					{
						displayName: 'Split Into Ads',
						name: 'splitIntoAds',
						type: 'boolean',
						default: false,
						description:
							'Whether to output one item per new, started, stopped, changed or removed ad instead of one item per event',
					},
					{
						displayName: 'Watchlist Name',
						name: 'watchlistName',
						type: 'string',
						default: '',
						description:
							'Name of the watchlist in AdLib. Defaults to "n8n: " plus the workflow name.',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as StaticData;
				if (!staticData.watchlistId) return false;
				const webhookUrl = this.getNodeWebhookUrl('default');
				try {
					const body = await adLibApiRequest.call(
						this,
						'GET',
						`/v1/watchlists/${encodeSegment(staticData.watchlistId)}`,
					);
					const watchlist = (body.data ?? {}) as IDataObject;
					return watchlist.webhook_url === webhookUrl;
				} catch (error) {
					if (httpCodeOf(error) === '404') {
						delete staticData.watchlistId;
						delete staticData.webhookUrl;
						return false;
					}
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as StaticData;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const options = this.getNodeParameter('options', {}) as IDataObject;

				// A watchlist left over from an earlier activation with another URL.
				if (staticData.watchlistId) {
					try {
						await adLibApiRequest.call(
							this,
							'DELETE',
							`/v1/watchlists/${encodeSegment(staticData.watchlistId)}`,
						);
					} catch (error) {
						if (httpCodeOf(error) !== '404')
							throw new NodeApiError(this.getNode(), error as JsonObject);
					}
					delete staticData.watchlistId;
				}

				const advertisers = await advertisersToWatch.call(this);
				const name =
					(typeof options.watchlistName === 'string' && options.watchlistName.trim()) ||
					`n8n: ${this.getWorkflow().name ?? this.getWorkflow().id ?? 'workflow'}`;
				const body: IDataObject = {
					name: name.slice(0, 200),
					advertisers,
					webhook_url: webhookUrl,
					interval_hours: this.getNodeParameter('intervalHours', 24) as number,
				};
				if (options.archiveVideos !== undefined) body.archive_videos = options.archiveVideos;
				if (options.emailAlerts !== undefined) body.email_alerts = options.emailAlerts;

				const created = await adLibApiRequest.call(this, 'POST', '/v1/watchlists', { body });
				const id = (created.data as IDataObject)?.id;
				if (typeof id !== 'string' || !id) {
					throw new NodeOperationError(this.getNode(), 'AdLib did not return a watchlist ID');
				}
				staticData.watchlistId = id;
				staticData.webhookUrl = webhookUrl;

				const secret = await adLibApiRequest.call(this, 'GET', '/v1/webhooks/secret');
				const value = (secret.data as IDataObject)?.secret;
				if (typeof value === 'string') staticData.secret = value;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as StaticData;
				if (staticData.watchlistId) {
					try {
						await adLibApiRequest.call(
							this,
							'DELETE',
							`/v1/watchlists/${encodeSegment(staticData.watchlistId)}`,
						);
					} catch (error) {
						if (httpCodeOf(error) !== '404') return false;
					}
				}
				delete staticData.watchlistId;
				delete staticData.webhookUrl;
				delete staticData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const staticData = this.getWorkflowStaticData('node') as StaticData;
		const body = this.getBodyData() as IDataObject;

		if (!req.rawBody && typeof req.readRawBody === 'function') await req.readRawBody();
		const rawBody: Buffer = req.rawBody ?? Buffer.from(JSON.stringify(body));
		const header = this.getHeaderData()[SIGNATURE_HEADER];

		let check = verifySignature(header, rawBody, staticData.secret ?? '');
		if (
			!check.valid &&
			(check.reason === 'signature mismatch' || check.reason === 'no webhook secret')
		) {
			// The secret may have been rotated since activation: fetch it once more.
			const secret = await adLibApiRequest.call(this, 'GET', '/v1/webhooks/secret');
			const value = (secret.data as IDataObject)?.secret;
			if (typeof value === 'string' && value !== staticData.secret) {
				staticData.secret = value;
				check = verifySignature(header, rawBody, value);
			}
		}
		if (!check.valid) {
			res.status(401).json({ error: `invalid signature: ${check.reason}` });
			return { noWebhookResponse: true };
		}

		const event = String(body.event ?? this.getHeaderData()['x-adlib-event'] ?? '');
		if (event === 'webhook.ping') {
			// Signed test pings (POST /v1/webhooks/test) only start manual test runs.
			if (this.getMode() === 'manual') return { workflowData: [[{ json: body }]] };
			return { webhookResponse: { ok: true } };
		}
		if (event !== 'advertiser.changes') return { webhookResponse: { ok: true, ignored: event } };
		if (
			staticData.watchlistId &&
			body.watchlist_id &&
			body.watchlist_id !== staticData.watchlistId
		) {
			return { webhookResponse: { ok: true, ignored: 'other watchlist' } };
		}

		const options = this.getNodeParameter('options', {}) as IDataObject;
		if (options.splitIntoAds === true) {
			const items = splitChanges(body);
			if (!items.length) return { webhookResponse: { ok: true } };
			return { workflowData: [this.helpers.returnJsonArray(items)] };
		}
		return { workflowData: [[{ json: body }]] };
	}
}
