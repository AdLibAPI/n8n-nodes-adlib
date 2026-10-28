import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { DEFAULT_MAX_PAGES } from './pagination';

export const PLATFORM_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Amazon', value: 'amazon' },
	{ name: 'Apple', value: 'apple' },
	{ name: 'Google', value: 'google' },
	{ name: 'LinkedIn', value: 'linkedin' },
	{ name: 'Meta (Facebook, Instagram)', value: 'meta' },
	{ name: 'Microsoft (Beta)', value: 'microsoft' },
	{ name: 'Pinterest', value: 'pinterest' },
	{ name: 'Snapchat', value: 'snapchat' },
	{ name: 'TikTok', value: 'tiktok' },
	{ name: 'X', value: 'x' },
];

/** Search also takes youtube and play: Google ads on YouTube or Google Play. */
export const SEARCH_PLATFORM_OPTIONS: INodePropertyOptions[] = [
	...PLATFORM_OPTIONS,
	{ name: 'Google Play (Google Ads on Play)', value: 'play' },
	{ name: 'YouTube (Google Ads on YouTube)', value: 'youtube' },
].sort((a, b) => a.name.localeCompare(b.name));

const STATUS_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Active', value: 'active' },
	{ name: 'All', value: 'all' },
	{ name: 'Inactive', value: 'inactive' },
];

const SOURCE_OPTIONS: INodePropertyOptions[] = [
	{
		name: 'History',
		value: 'history',
		description: 'Our archive, including ads that are gone from the platform',
	},
	{ name: 'Live', value: 'live', description: 'Fetched from the platform now' },
];

const SORT_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Days Running', value: 'days_running', description: 'Longest-running ads first' },
	{ name: 'Newest', value: 'newest' },
];

export const RESOURCES: INodePropertyOptions[] = [
	{ name: 'Ad', value: 'ad' },
	{ name: 'Advertiser', value: 'advertiser' },
	{ name: 'Batch', value: 'batch' },
	{ name: 'Domain', value: 'domain' },
	{ name: 'Usage', value: 'usage' },
	{ name: 'Watchlist', value: 'watchlist' },
];

/** Operations per resource. `paginated` operations get Return All / Limit. */
export const OPERATIONS: Record<
	string,
	Array<INodePropertyOptions & { paginated?: { maxLimit: number; defaultLimit: number } }>
> = {
	advertiser: [
		{
			name: 'Get',
			value: 'get',
			action: 'Get an advertiser',
			description: 'Get an advertiser including ad counts',
		},
		{
			name: 'Get Ads',
			value: 'getAds',
			action: 'Get ads of an advertiser',
			description: 'All ads of an advertiser, live or from history',
			paginated: { maxLimit: 100, defaultLimit: 25 },
		},
		{
			name: 'Get Changes',
			value: 'getChanges',
			action: 'Get changes of an advertiser',
			description: 'New, stopped and changed ads since a point in time',
			paginated: { maxLimit: 200, defaultLimit: 50 },
		},
		{
			name: 'Get Stats',
			value: 'getStats',
			action: 'Get stats of an advertiser',
			description:
				'Ads by status, format, country and language, run times, and the longest-running ads',
		},
		{
			name: 'Get Timeline',
			value: 'getTimeline',
			action: 'Get the timeline of an advertiser',
			description: 'When which ads started and stopped',
			paginated: { maxLimit: 200, defaultLimit: 50 },
		},
		{
			name: 'Resolve by Domain',
			value: 'resolve',
			action: 'Resolve advertisers by domain',
			description: "Find a brand's advertiser IDs on all platforms from its domain",
		},
	],
	ad: [
		{
			name: 'Get',
			value: 'get',
			action: 'Get an ad',
			description: 'Get one ad, live from its platform or from our archive',
		},
		{
			name: 'Get Ad Features',
			value: 'getFeatures',
			action: 'Get the creative features of an ad',
			description:
				'Hook, offers, urgency, social proof, format, video length, cuts and on-image text of an ad',
		},
		{
			name: 'Get History',
			value: 'getHistory',
			action: 'Get the history of an ad',
			description: 'All observed versions, status changes and daily EU reach of an ad',
		},
		{
			name: 'Parse Library URL',
			value: 'parseLibraryUrl',
			action: 'Parse an ad library URL',
			description: 'Turn a link copied from an ad library into an AdLib ad or advertiser ID',
		},
		{
			name: 'Search',
			value: 'search',
			action: 'Search ads',
			description: 'Search ads by keyword, advertiser or domain across platforms',
			paginated: { maxLimit: 100, defaultLimit: 25 },
		},
	],
	domain: [
		{
			name: 'Check if Advertising',
			value: 'check',
			action: 'Check if a domain is advertising',
			description: 'Is this company advertising right now, and on which platforms?',
		},
		{
			name: 'Get Company Profile',
			value: 'getCompany',
			action: 'Get the company profile of a domain',
			description: 'All ad accounts of a domain across platforms, with combined stats',
		},
	],
	watchlist: [
		{
			name: 'Add Advertisers',
			value: 'addAdvertisers',
			action: 'Add advertisers to a watchlist',
		},
		{
			name: 'Create',
			value: 'create',
			action: 'Create a watchlist',
			description:
				'Watch advertisers; they are crawled regularly and changes go to your webhook or email',
		},
		{ name: 'Delete', value: 'delete', action: 'Delete a watchlist' },
		{
			name: 'Get',
			value: 'get',
			action: 'Get a watchlist',
			description: 'Get a watchlist with the crawl status per advertiser',
		},
		{ name: 'List', value: 'list', action: 'List watchlists' },
		{
			name: 'Remove Advertiser',
			value: 'removeAdvertiser',
			action: 'Remove an advertiser from a watchlist',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update a watchlist',
			description: "Change a watchlist's name, webhook URL or email alerts",
		},
	],
	batch: [
		{
			name: 'Create',
			value: 'create',
			action: 'Create a batch job',
			description: 'Start an asynchronous job for many advertisers, domains or ad IDs',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get a batch job',
			description: 'Status and results of a batch job',
			paginated: { maxLimit: 100, defaultLimit: 20 },
		},
	],
	usage: [
		{
			name: 'Get',
			value: 'get',
			action: 'Get usage',
			description: 'Your billed credits per day and endpoint',
		},
	],
};

/** Default operation per resource. */
export const DEFAULT_OPERATION: Record<string, string> = {
	advertiser: 'resolve',
	ad: 'search',
	domain: 'check',
	watchlist: 'list',
	batch: 'create',
	usage: 'get',
};

const show = (resource: string, operation: string[], extra: Record<string, unknown[]> = {}) => ({
	show: { resource: [resource], operation, ...extra },
});

function advertiserIdField(operations: string[]): INodeProperties {
	return {
		displayName: 'Advertiser ID',
		name: 'advertiserId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'meta:15087023444',
		description:
			'Our advertiser ID in the form platform:ID. Get it with Advertiser > Resolve by Domain.',
		displayOptions: show('advertiser', operations),
	};
}

function paginationFields(resource: string, operation: string): INodeProperties[] {
	const op = OPERATIONS[resource].find((o) => o.value === operation);
	const { maxLimit, defaultLimit } = op?.paginated ?? { maxLimit: 100, defaultLimit: 25 };
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			hint: 'Follows next_cursor page by page until the last page or Max Pages. Credits are billed per delivered result.',
			displayOptions: show(resource, [operation]),
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1, maxValue: maxLimit },
			description: 'Max number of results to return',
			displayOptions: show(resource, [operation], { returnAll: [false] }),
		},
		{
			displayName: 'Page Size',
			name: 'pageSize',
			type: 'number',
			default: defaultLimit,
			typeOptions: { minValue: 1, maxValue: maxLimit },
			description: 'Results requested per API call',
			displayOptions: show(resource, [operation], { returnAll: [true] }),
		},
		{
			displayName: 'Max Pages',
			name: 'maxPages',
			type: 'number',
			default: DEFAULT_MAX_PAGES,
			typeOptions: { minValue: 1, maxValue: 1000 },
			description: 'Stop after this many pages (API calls) even if more results exist',
			displayOptions: show(resource, [operation], { returnAll: [true] }),
		},
	];
}

const cursorOption: INodeProperties = {
	displayName: 'Start Cursor',
	name: 'cursor',
	type: 'string',
	default: '',
	description: 'A next_cursor from an earlier response to continue from',
};

const rawOption: INodeProperties = {
	displayName: 'Raw Pages',
	name: 'rawPages',
	type: 'boolean',
	default: false,
	description:
		'Whether to output each API page as it came (with next_cursor and meta) instead of one item per result',
};

const advertiserProperties: INodeProperties[] = [
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'nike.com',
		description: 'Company domain. A full URL also works, only the host is used.',
		displayOptions: show('advertiser', ['resolve']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('advertiser', ['resolve']),
		options: [
			{
				displayName: 'Max per Platform',
				name: 'maxPerPlatform',
				type: 'number',
				default: 3,
				typeOptions: { minValue: 1, maxValue: 10 },
				description: 'Most candidates returned per platform',
			},
			{
				displayName: 'Minimum Score',
				name: 'minScore',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				description: 'Only keep advertisers whose confidence score (0 to 1) is at least this value',
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: PLATFORM_OPTIONS,
				default: [],
				description: 'Platforms to search. Leave empty for all.',
			},
			{
				displayName: 'Split Into Items',
				name: 'split',
				type: 'boolean',
				default: false,
				description: 'Whether to output one item per advertiser instead of one item per domain',
			},
		],
	},
	advertiserIdField(['get', 'getAds', 'getChanges', 'getStats', 'getTimeline']),
	{
		displayName: 'Since',
		name: 'since',
		type: 'string',
		required: true,
		default: '',
		placeholder: '2026-10-01',
		description: 'Changes at or after this date (YYYY-MM-DD or RFC 3339)',
		displayOptions: show('advertiser', ['getChanges']),
	},
	...paginationFields('advertiser', 'getAds'),
	...paginationFields('advertiser', 'getChanges'),
	...paginationFields('advertiser', 'getTimeline'),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('advertiser', ['get']),
		options: [
			{
				displayName: 'Refresh',
				name: 'refresh',
				type: 'boolean',
				default: false,
				description:
					"Whether to crawl the first page of the advertiser's ads live before answering",
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('advertiser', ['getAds']),
		options: [
			rawOption,
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: SORT_OPTIONS,
				default: 'newest',
				description: 'Only for Source: History',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: SOURCE_OPTIONS,
				default: 'live',
			},
			cursorOption,
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: STATUS_OPTIONS,
				default: 'all',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('advertiser', ['getChanges']),
		options: [
			{
				displayName: 'Change Types',
				name: 'types',
				type: 'multiOptions',
				options: [
					{ name: 'Changed', value: 'changed' },
					{ name: 'Discovered', value: 'discovered' },
					{
						name: 'Removed',
						value: 'removed',
						description: "The platform's library no longer shows the ad (AdLib keeps it)",
					},
					{ name: 'Started', value: 'started' },
					{ name: 'Stopped', value: 'stopped' },
				],
				default: ['started', 'stopped', 'changed'],
			},
			rawOption,
			cursorOption,
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('advertiser', ['getTimeline']),
		options: [
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: '2026-01-01',
				description: 'Events at or after this date (YYYY-MM-DD or RFC 3339)',
			},
			rawOption,
			cursorOption,
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '2026-12-31',
				description: 'Events before this date (YYYY-MM-DD or RFC 3339)',
			},
		],
	},
];

const adProperties: INodeProperties[] = [
	{
		displayName: 'Ad ID',
		name: 'adId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'meta:1234567890',
		description: 'Our ad ID in the form platform:ad-ID (for example meta:1234567890)',
		displayOptions: show('ad', ['get', 'getFeatures', 'getHistory']),
	},
	{
		displayName: 'Library URL',
		name: 'libraryUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://www.linkedin.com/ad-library/detail/123456789',
		description:
			'A link copied from the Meta Ad Library, Google Ads Transparency Center, TikTok Ad Library, LinkedIn Ad Library, Pinterest Ads Repository or an X post',
		displayOptions: show('ad', ['parseLibraryUrl']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('ad', ['get']),
		options: [
			{
				displayName: 'Max Age (Seconds)',
				name: 'maxAge',
				type: 'number',
				default: 3600,
				typeOptions: { minValue: 0 },
				description:
					'Serve from our archive if we saw the ad within this many seconds. 0 always fetches live.',
			},
		],
	},
	{
		displayName: 'Search By',
		name: 'searchBy',
		type: 'options',
		options: [
			{
				name: 'Advertiser',
				value: 'advertiser',
				description: 'Advertiser name, or our advertiser ID platform:ID',
			},
			{ name: 'Domain', value: 'domain', description: 'Landing page or advertiser domain' },
			{ name: 'Keyword', value: 'q', description: 'Keyword in the ad text' },
		],
		default: 'q',
		displayOptions: show('ad', ['search']),
	},
	{
		displayName: 'Search Term',
		name: 'searchTerm',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'running shoes',
		description: 'Keyword, advertiser name or ID, or domain, depending on Search By',
		displayOptions: show('ad', ['search']),
	},
	{
		displayName: 'Platforms',
		name: 'platforms',
		type: 'multiOptions',
		options: SEARCH_PLATFORM_OPTIONS,
		default: [],
		description:
			'Platforms to search. Leave empty for all platforms that support the search. YouTube and Google Play are Google ads with that placement.',
		displayOptions: show('ad', ['search']),
	},
	...paginationFields('ad', 'search'),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('ad', ['search']),
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'DE',
				description: 'Two-letter country code (ISO 3166-1 alpha-2)',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Carousel', value: 'carousel' },
					{ name: 'Image', value: 'image' },
					{ name: 'Text', value: 'text' },
					{ name: 'Video', value: 'video' },
				],
				default: '',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: '2026-01-01',
				description: 'Shown on or after this date (YYYY-MM-DD)',
			},
			{
				displayName: 'Placement',
				name: 'placement',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Google Maps', value: 'maps' },
					{ name: 'Google Play', value: 'play' },
					{ name: 'Google Search', value: 'search' },
					{ name: 'Google Shopping', value: 'shopping' },
					{ name: 'YouTube', value: 'youtube' },
				],
				default: '',
				description:
					'Google only: where the ad ran. Limits a live search to Google. YouTube with Format: Video gives YouTube video ads.',
			},
			{
				displayName: 'Political Ads',
				name: 'political',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Exclude', value: 'false', description: 'No political or issue ads' },
					{
						name: 'Only',
						value: 'true',
						description:
							'Only political or issue ads. Only Meta labels them, so this limits results to Meta.',
					},
				],
				default: '',
			},
			rawOption,
			{
				displayName: 'Removed Ads',
				name: 'removed',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{
						name: 'Exclude',
						value: 'false',
						description: "Only ads the platforms' libraries still show",
					},
					{
						name: 'Only',
						value: 'true',
						description:
							"Only ads the platforms' libraries no longer show (taken down, deleted or aged out), which AdLib kept",
					},
				],
				default: '',
				description: 'Only for Source: History',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: SORT_OPTIONS,
				default: 'newest',
				description: 'Only for Source: History',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: SOURCE_OPTIONS,
				default: 'live',
			},
			cursorOption,
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: STATUS_OPTIONS,
				default: 'all',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: '2026-12-31',
				description: 'Shown before this date (YYYY-MM-DD)',
			},
		],
	},
];

const domainProperties: INodeProperties[] = [
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'nike.com',
		description: 'Company domain. A full URL also works, only the host is used.',
		displayOptions: show('domain', ['check', 'getCompany']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('domain', ['check']),
		options: [
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: PLATFORM_OPTIONS,
				default: [],
				description: 'Platforms to check. Leave empty for all.',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('domain', ['getCompany']),
		options: [
			{
				displayName: 'Include Related Accounts',
				name: 'includeRelated',
				type: 'boolean',
				default: false,
				description:
					'Whether to count agency, reseller and partner accounts (listed under related) in the platform totals and stats too',
			},
			{
				displayName: 'Max per Platform',
				name: 'maxPerPlatform',
				type: 'number',
				default: 5,
				typeOptions: { minValue: 1, maxValue: 10 },
				description:
					'Most accounts per platform. Brands often run several (countries, product lines).',
			},
			{
				displayName: 'Minimum Score',
				name: 'minScore',
				type: 'number',
				default: 0.75,
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				description:
					'Accounts below this confidence score (0 to 1) are listed as candidates and not counted in the totals',
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: PLATFORM_OPTIONS,
				default: [],
				description: 'Platforms to include. Leave empty for all.',
			},
		],
	},
];

const watchlistProperties: INodeProperties[] = [
	{
		displayName: 'Watchlist ID',
		name: 'watchlistId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID (UUID) of the watchlist',
		displayOptions: show('watchlist', [
			'get',
			'addAdvertisers',
			'removeAdvertiser',
			'update',
			'delete',
		]),
	},
	{
		displayName: 'Advertiser IDs',
		name: 'advertiserIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'meta:15087023444, google:AR123',
		description:
			'Comma-separated advertiser IDs (platform:ID). Find them with Advertiser > Resolve by Domain.',
		displayOptions: show('watchlist', ['create', 'addAdvertisers']),
	},
	{
		displayName: 'Advertiser ID',
		name: 'advertiserId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'meta:15087023444',
		description: 'Advertiser ID (platform:ID) to remove',
		displayOptions: show('watchlist', ['removeAdvertiser']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('watchlist', ['create']),
		options: [
			{
				displayName: 'Archive Videos',
				name: 'archiveVideos',
				type: 'boolean',
				default: true,
				description: 'Whether to keep full video files for these advertisers',
			},
			{
				displayName: 'Crawl Interval (Hours)',
				name: 'intervalHours',
				type: 'number',
				default: 24,
				typeOptions: { minValue: 1, maxValue: 168 },
			},
			{
				displayName: 'Email Alerts',
				name: 'emailAlerts',
				type: 'boolean',
				default: false,
				description:
					"Whether to mail a digest of each crawl's changes (new, stopped, changed, removed ads) to your account's email",
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/hooks/adlib',
				description:
					'Receives signed advertiser.changes events. Slack and Discord webhook URLs get a readable message. To trigger an n8n workflow, use the AdLib Trigger node instead.',
			},
		],
	},
];

watchlistProperties.push({
	displayName: 'Update Fields',
	name: 'updateFields',
	type: 'collection',
	placeholder: 'Add field',
	default: {},
	displayOptions: show('watchlist', ['update']),
	options: [
		{
			displayName: 'Email Alerts',
			name: 'emailAlerts',
			type: 'boolean',
			default: false,
			description: "Whether to mail a digest of each crawl's changes to your account's email",
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Webhook URL',
			name: 'webhookUrl',
			type: 'string',
			default: '',
			placeholder: 'https://example.com/hooks/adlib',
			description:
				'New webhook URL. Slack and Discord webhook URLs get a readable message. Leave empty to remove the webhook.',
		},
	],
});

const batchProperties: INodeProperties[] = [
	{
		displayName: 'Item Type',
		name: 'itemType',
		type: 'options',
		options: [
			{ name: 'Ad IDs', value: 'ads' },
			{ name: 'Advertiser IDs', value: 'advertisers' },
			{ name: 'Domains', value: 'domains' },
		],
		default: 'domains',
		description: 'What the items are',
		displayOptions: show('batch', ['create']),
	},
	{
		displayName: 'Items',
		name: 'items',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		placeholder: 'nike.com, adidas.com',
		description: 'Comma- or newline-separated advertiser IDs, domains or ad IDs (max 1,000)',
		displayOptions: show('batch', ['create']),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('batch', ['create']),
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'DE',
				description: 'Two-letter country code (ISO 3166-1 alpha-2)',
			},
			{
				displayName: 'Include Ads',
				name: 'includeAds',
				type: 'boolean',
				default: false,
				description:
					'Whether to also fetch the first page of ads of each matched advertiser (domains only)',
			},
			{
				displayName: 'Max Pages per Advertiser',
				name: 'maxPages',
				type: 'number',
				default: 3,
				typeOptions: { minValue: 0, maxValue: 20 },
				description: 'Pages of ads fetched per advertiser (advertisers only)',
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: PLATFORM_OPTIONS,
				default: [],
				description: 'Restrict domain resolution to these platforms (domains only)',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Any', value: '' },
					{ name: 'Active', value: 'active' },
					{ name: 'Inactive', value: 'inactive' },
				],
				default: '',
			},
			{
				displayName: 'Webhook URL',
				name: 'webhookUrl',
				type: 'string',
				default: '',
				description: 'Receives a signed batch.completed event when the job is done',
			},
		],
	},
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID (UUID) of the batch job',
		displayOptions: show('batch', ['get']),
	},
	...paginationFields('batch', 'get'),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: show('batch', ['get']),
		options: [cursorOption],
	},
];

const usageProperties: INodeProperties[] = [
	{
		displayName: 'Days',
		name: 'days',
		type: 'number',
		default: 30,
		typeOptions: { minValue: 1, maxValue: 92 },
		description: 'Number of past days to include',
		displayOptions: show('usage', ['get']),
	},
];

export function buildProperties(): INodeProperties[] {
	const properties: INodeProperties[] = [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: RESOURCES,
			default: 'advertiser',
		},
	];
	for (const resource of RESOURCES) {
		const ops = OPERATIONS[resource.value as string];
		const operation: INodeProperties = {
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: [resource.value] } },
			options: ops.map(({ name, value, action, description }) => ({
				name,
				value,
				action,
				...(description ? { description } : {}),
			})),
			default: '',
		};
		operation.default = DEFAULT_OPERATION[resource.value as string] ?? ops[0].value;
		properties.push(operation);
	}
	properties.push(
		...advertiserProperties,
		...adProperties,
		...domainProperties,
		...watchlistProperties,
		...batchProperties,
		...usageProperties,
	);
	return properties;
}
