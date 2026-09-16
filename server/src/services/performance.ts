import fetch from 'node-fetch';
import type { PerformanceMetrics, PerformanceReport, PerformanceScores } from '../types/domain.js';

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PSI_TIMEOUT_MS = 25_000;
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'] as const;

// Only model fields used by the report.
interface PsiAudit {
  displayValue?: string;
}

interface PsiCategory {
  score: number | null;
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: Record<string, PsiCategory>;
    audits?: Record<string, PsiAudit>;
  };
}

/** Fetch Lighthouse scores; failures are non-fatal to the report. */
export async function getPerformanceReport(targetUrl: string): Promise<PerformanceReport> {
  const apiKey = process.env.GOOGLE_PSI_API_KEY;

  const params = new URLSearchParams({ url: targetUrl, strategy: 'mobile' });
  for (const category of CATEGORIES) {
    params.append('category', category);
  }
  if (apiKey) {
    params.set('key', apiKey);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  try {
    const response = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      let reason = `PageSpeed Insights request failed with status ${response.status}`;
      if (response.status === 429) {
        reason = 'PageSpeed Insights rate limit exceeded. Set GOOGLE_PSI_API_KEY for a higher quota.';
      } else if (body) {
        reason = `${reason}: ${body.slice(0, 300)}`;
      }
      return { available: false, reason };
    }

    const data = (await response.json()) as PsiResponse;
    const categories = data.lighthouseResult?.categories;
    if (!categories) {
      return { available: false, reason: 'PageSpeed Insights response was missing Lighthouse results.' };
    }

    const scores = {} as PerformanceScores;
    for (const category of CATEGORIES) {
      const key = category.replace('-', '') as keyof PerformanceScores;
      const raw = categories[category] ?? categories[category.replace('-', '')];
      scores[key] = raw && typeof raw.score === 'number' ? Math.round(raw.score * 100) : null;
    }

    const audits = data.lighthouseResult?.audits || {};
    const metrics: PerformanceMetrics = {
      firstContentfulPaint: audits['first-contentful-paint']?.displayValue || null,
      largestContentfulPaint: audits['largest-contentful-paint']?.displayValue || null,
      totalBlockingTime: audits['total-blocking-time']?.displayValue || null,
      cumulativeLayoutShift: audits['cumulative-layout-shift']?.displayValue || null,
      speedIndex: audits['speed-index']?.displayValue || null
    };

    return { available: true, scores, metrics };
  } catch (err) {
    const reason = err instanceof Error && err.name === 'AbortError'
      ? 'PageSpeed Insights request timed out.'
      : `PageSpeed Insights request failed: ${err instanceof Error ? err.message : String(err)}`;
    return { available: false, reason };
  } finally {
    clearTimeout(timeout);
  }
}
