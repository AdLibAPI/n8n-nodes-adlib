import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export const DEFAULT_BASE_URL = 'https://api.adlibapi.com';

/** Base URL from the credential, without trailing slashes. Shared by the credential test and the nodes. */
export const BASE_URL_EXPRESSION =
	"={{ String($credentials.baseUrl || '" + DEFAULT_BASE_URL + "').trim().replace(/\\/+$/, '') }}";

export class AdLibApi implements ICredentialType {
	name = 'adLibApi';

	displayName = 'AdLib API';

	icon: Icon = { light: 'file:../icons/adlib.svg', dark: 'file:../icons/adlib.dark.svg' };

	documentationUrl = 'https://github.com/AdLibAPI/n8n-nodes-adlib?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your AdLib API key. It is sent in the X-API-Key header.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: DEFAULT_BASE_URL,
			placeholder: DEFAULT_BASE_URL,
			description: 'Root URL of the AdLib API, without /v1',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{ String($credentials.apiKey).trim() }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: BASE_URL_EXPRESSION,
			url: '/v1/usage',
			method: 'GET',
			qs: { days: 1 },
		},
	};
}
