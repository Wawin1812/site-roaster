import { Router, type Request, type Response } from 'express';
import { safeFetch } from '../services/safeFetch.js';
import { detectTechnologies } from '../services/techDetect.js';
import { getPerformanceReport } from '../services/performance.js';
import { runSecurityChecks } from '../services/securityChecks.js';
import { buildReport } from '../services/scoring.js';
import type { AnalysisReport } from '../types/domain.js';

export const analyzeRouter = Router();

const ANALYZE_TIMEOUT_MS = 30_000;

analyzeRouter.post('/', async (req: Request, res: Response) => {
  const { url } = req.body ?? {};

  const validationError = validateUrl(url);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const report = await withTimeout(analyze((url as string).trim()), ANALYZE_TIMEOUT_MS, 'Analysis timed out');
    return res.json(report);
  } catch (err) {
    // Anything that reaches here is either a fetch/SSRF-guard failure or an
    // unexpected error; neither should ever crash the server or leak
    // internals to the client.
    const message = err instanceof Error ? err.message : 'Failed to analyze URL';
    return res.status(502).json({ error: message });
  }
});

async function analyze(url: string): Promise<AnalysisReport> {
  const { response, body: html, finalUrl } = await safeFetch(url);

  const [technologies, performance] = await Promise.all([
    detectTechnologies({
      url: finalUrl,
      html,
      statusCode: response.status,
      headers: response.headers
    }).catch(() => []),
    getPerformanceReport(finalUrl)
  ]);

  const security = runSecurityChecks({
    finalUrl,
    headers: response.headers,
    html,
    technologies
  });

  return buildReport({ finalUrl, technologies, security, performance });
}

// Basic, cheap validation done before any network access. The deep SSRF
// checks (DNS resolution, private/reserved IP blocking) live in
// ssrfGuard.ts/safeFetch.ts and run regardless of what happens here.
// Exported so it can be unit tested directly without spinning up a server.
export function validateUrl(url: unknown): string | null {
  if (!url || typeof url !== 'string') {
    return 'Missing required "url" field (string).';
  }

  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return 'URL must be between 1 and 2048 characters.';
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'URL is not a valid, absolute URL (e.g. https://example.com).';
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return `Unsupported protocol "${parsed.protocol}". Only http and https are allowed.`;
  }

  if (!parsed.hostname) {
    return 'URL must include a hostname.';
  }

  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}
