import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import type { LookupAddress } from 'node:dns';
import fetch, { type Response } from 'node-fetch';
import { resolvePublicAddresses } from './ssrfGuard.js';

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB cap to avoid unbounded downloads

/** Fetch with protocol, redirect, timeout, size, and DNS-pinning safeguards. */
export interface SafeFetchResult {
  response: Response;
  body: string;
  finalUrl: string;
}

export async function safeFetch(inputUrl: string): Promise<SafeFetchResult> {
  let currentUrl = inputUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const parsed = new URL(currentUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Unsupported protocol "${parsed.protocol}"`);
    }

    const addresses = await resolvePublicAddresses(parsed.hostname);
    const agent = pinnedAgent(parsed.protocol, addresses);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        agent,
        headers: {
          'User-Agent': 'SiteRoasterBot/1.0 (+https://github.com/; automated stack analysis)'
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect response missing Location header`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    const body = await readBodyWithLimit(response, MAX_BODY_BYTES);
    return { response, body, finalUrl: currentUrl };
  }

  throw new Error(`Too many redirects (> ${MAX_REDIRECTS})`);
}

// Pin socket DNS lookup to the addresses already validated by ssrfGuard.
function pinnedAgent(protocol: string, addresses: LookupAddress[]): http.Agent | https.Agent {
  const lookup: LookupFunction = (hostname, options, callback) => {
    if (options && typeof options === 'object' && options.all) {
      callback(null, addresses.map(({ address, family }) => ({ address, family })));
    } else {
      const { address, family } = addresses[0];
      callback(null, address, family);
    }
  };

  const AgentClass = protocol === 'https:' ? https.Agent : http.Agent;
  return new AgentClass({ lookup });
}

async function readBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body;
  if (!reader) {
    return '';
  }
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of reader) {
    const buf = chunk as Buffer;
    total += buf.length;
    if (total > maxBytes) {
      throw new Error(`Response body exceeded ${maxBytes} byte limit`);
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks).toString('utf-8');
}
