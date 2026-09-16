import wappalyzer from 'simple-wappalyzer';
import type { Headers } from 'node-fetch';
import type { Technology } from '../types/domain.js';

export interface DetectTechnologiesInput {
  url: string;
  html: string;
  statusCode: number;
  headers: Headers;
}

/** Detect technologies from the HTML and headers already fetched. */
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

// Convert node-fetch headers to the shape simple-wappalyzer expects.
function normalizeHeaders(headers: Headers): Record<string, string> {
  const plain: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    plain[key.toLowerCase()] = value;
  }
  return plain;
}
