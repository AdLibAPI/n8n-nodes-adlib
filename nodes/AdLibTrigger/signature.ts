import { createHmac, timingSafeEqual } from 'crypto';
import type { IDataObject } from 'n8n-workflow';

export const SIGNATURE_HEADER = 'x-adlib-signature';
export const TOLERANCE_SECONDS = 300;

export type SignatureCheck = { valid: true } | { valid: false; reason: string };

/** Parse "t=<unix>,v1=<hex>[,v1=<hex>]" into the timestamp and all v1 signatures. */
export function parseSignatureHeader(header: unknown): { t?: number; v1: string[] } {
	const out: { t?: number; v1: string[] } = { v1: [] };
	const value = Array.isArray(header) ? header[0] : header;
	if (typeof value !== 'string') return out;
	for (const part of value.split(',')) {
		const idx = part.indexOf('=');
		if (idx < 0) continue;
		const key = part.slice(0, idx).trim();
		const val = part.slice(idx + 1).trim();
		if (key === 't' && /^\d+$/.test(val)) out.t = Number(val);
		else if (key === 'v1' && val) out.v1.push(val.toLowerCase());
	}
	return out;
}

/** Hex HMAC-SHA256 of "<t>.<raw body>" with the webhook secret. */
export function computeSignature(
	secret: string,
	timestamp: number | string,
	rawBody: Buffer | string,
): string {
	return createHmac('sha256', secret)
		.update(`${timestamp}.`)
		.update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody)
		.digest('hex');
}

/**
 * Verify an X-AdLib-Signature header against the raw request body.
 * Rejects missing or malformed headers, timestamps more than 5 minutes away
 * from now, and signatures that do not match.
 */
export function verifySignature(
	header: unknown,
	rawBody: Buffer | string,
	secret: string,
	nowSeconds: number = Math.floor(Date.now() / 1000),
	toleranceSeconds: number = TOLERANCE_SECONDS,
): SignatureCheck {
	if (!secret) return { valid: false, reason: 'no webhook secret' };
	const { t, v1 } = parseSignatureHeader(header);
	if (t === undefined || v1.length === 0)
		return { valid: false, reason: 'missing or malformed signature header' };
	if (Math.abs(nowSeconds - t) > toleranceSeconds)
		return { valid: false, reason: 'timestamp outside tolerance' };
	const expected = Buffer.from(computeSignature(secret, t, rawBody), 'hex');
	for (const candidate of v1) {
		if (!/^[0-9a-f]+$/.test(candidate) || candidate.length !== expected.length * 2) continue;
		if (timingSafeEqual(expected, Buffer.from(candidate, 'hex'))) return { valid: true };
	}
	return { valid: false, reason: 'signature mismatch' };
}

export const CHANGE_KINDS = ['new', 'started', 'stopped', 'changed'] as const;

/**
 * Split an advertiser.changes event into one object per ad event, each with
 * `change` (new, started, stopped, changed) and the event's context.
 */
export function splitChanges(event: IDataObject): IDataObject[] {
	const out: IDataObject[] = [];
	for (const kind of CHANGE_KINDS) {
		const list = event[kind];
		if (!Array.isArray(list)) continue;
		for (const entry of list as IDataObject[]) {
			out.push({
				change: kind,
				watchlist_id: event.watchlist_id,
				advertiser_id: event.advertiser_id,
				crawled_at: event.crawled_at,
				...entry,
			});
		}
	}
	return out;
}
