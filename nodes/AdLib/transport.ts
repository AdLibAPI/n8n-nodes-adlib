import {
	NodeApiError,
	type IDataObject,
	type IExecuteFunctions,
	type IHookFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type IWebhookFunctions,
	type JsonObject,
} from 'n8n-workflow';
import { DEFAULT_BASE_URL } from '../../credentials/AdLibApi.credentials';

export const CREDENTIAL_NAME = 'adLibApi';

type Context = IExecuteFunctions | IHookFunctions | IWebhookFunctions | ILoadOptionsFunctions;

const HINTS: Record<number, string> = {
	400: 'The API rejected the request. Check the IDs, domain or filters you passed.',
	401: 'Check the API key and the Base URL in the AdLib API credential.',
	402: 'Your AdLib credits are used up. Top up your plan, then run the node again.',
	403: "The API key is not allowed to use this endpoint, or (code history_limit) the ad is older than your plan's archive window.",
	404: 'Nothing was found for the given ID or domain.',
	422: 'One of the parameters has an invalid format, for example an advertiser ID without the "platform:" prefix.',
	429: 'Rate limit reached. Wait a moment, or enable "Retry On Fail" in the node settings.',
};

/** Pull a readable message out of an AdLib error body: {"error": {"code", "message", ...}}. */
export function apiErrorMessage(body: unknown): string | undefined {
	if (typeof body === 'string') return body.trim() ? body.trim().slice(0, 500) : undefined;
	if (!body || typeof body !== 'object') return undefined;
	const b = body as IDataObject;
	for (const key of ['error', 'message', 'detail', 'title']) {
		const v = b[key];
		if (typeof v === 'string' && v) return v;
		if (v && typeof v === 'object' && typeof (v as IDataObject).message === 'string') {
			return (v as IDataObject).message as string;
		}
	}
	return undefined;
}

/** Root URL from the credential, without trailing slashes. */
export function normalizeBaseUrl(value: unknown): string {
	return (String(value ?? '').trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/**
 * Encode one path segment. Our IDs look like "meta:123"; the colon is kept as
 * is so the URL stays readable, everything else is percent-encoded.
 */
export function encodeSegment(value: unknown): string {
	return encodeURIComponent(String(value ?? '').trim()).replace(/%3A/gi, ':');
}

/** Split a comma- or newline-separated list, trimming and dropping empty entries. */
export function splitList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter((v) => v);
	return String(value ?? '')
		.split(/[,\n]/)
		.map((s) => s.trim())
		.filter((s) => s);
}

/** "https://www.Nike.com/de/" -> "www.nike.com". Keeps subdomains, drops scheme, path and port. */
export function cleanDomain(value: unknown): string {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
		.replace(/^[^@/]*@/, '')
		.split(/[/?#]/)[0]
		.replace(/:\d+$/, '')
		.replace(/\.+$/, '');
}

/** Drop undefined, null and empty-string values from a query or body object. */
export function compact(obj: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value) && value.length === 0) continue;
		out[key] = value;
	}
	return out;
}

/**
 * One authenticated request to the AdLib API. Errors become a NodeApiError
 * carrying the API's own message, the HTTP status and a hint.
 */
export async function adLibApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	path: string,
	options: { qs?: IDataObject; body?: IDataObject } = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials(CREDENTIAL_NAME);
	const request: IHttpRequestOptions = {
		method,
		url: `${normalizeBaseUrl(credentials.baseUrl)}${path}`,
		headers: { Accept: 'application/json' },
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (options.qs) request.qs = compact(options.qs);
	if (options.body) request.body = options.body;

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		CREDENTIAL_NAME,
		request,
	)) as { statusCode: number; body: unknown };

	const status = Number(response.statusCode);
	if (status >= 400) {
		const apiMessage = apiErrorMessage(response.body);
		const errorBody: JsonObject =
			response.body && typeof response.body === 'object'
				? (response.body as JsonObject)
				: { error: String(response.body ?? '') };
		throw new NodeApiError(this.getNode(), errorBody, {
			message: `AdLib API error ${status}${apiMessage ? `: ${apiMessage}` : ''}`,
			description:
				HINTS[status] ??
				(status >= 500 ? 'The API had a temporary problem. Try again shortly.' : undefined),
			httpCode: String(status),
		});
	}
	if (response.body && typeof response.body === 'object') return response.body as IDataObject;
	return {};
}
