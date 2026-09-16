import wappalyzer from 'simple-wappalyzer';
import type { Headers } from 'node-fetch';
import type { Technology } from '../types/domain.js';

export interface DetectTechnologiesInput {
  url: string;
  html: string;
  statusCode: number;
  headers: Headers;
}

/**
 * Detects the technology stack (frameworks, CMS, server, CDN, analytics,
 * etc.) of a page using simple-wappalyzer, fed with data we've already
 * fetched via safeFetch (no extra network calls, no headless browser).
 */
export async function detectTechnologies({ url, html, statusCode, headers }: DetectTechnologiesInput): Promise<Technology[]> {
  const applications = await wappalyzer({
    url,
    html,
    statusCode,
    headers: normalizeHeaders(headers)
  });

  return applications
    .map(app => ({
      name: app.name,
      slug: app.slug,
      categories: (app.categories || []).map(c => c.name),
      version: app.version || null,
      confidence: app.confidence,
      website: app.website
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

// node-fetch Headers -> plain object of lower-cased header names to string
// values, the shape simple-wappalyzer expects.
function normalizeHeaders(headers: Headers): Record<string, string> {
  const plain: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    plain[key.toLowerCase()] = value;
  }
  return plain;
}

