import type {
  AnalysisReport,
  Grade,
  PerformanceReport,
  SecurityResult,
  Severity,
  Suggestion,
  Technology
} from '../types/domain.js';
import { buildRoastHeadline, buildTechInsight } from './roastCopy.js';

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
const SEVERITY_IMPACT: Record<Severity, number> = { critical: 3, warning: 2, info: 1 };

export interface BuildReportInput {
  finalUrl: string;
  technologies: Technology[];
  security: SecurityResult;
  performance: PerformanceReport;
}

/** Combine findings, performance, and technologies into one report. */
export function buildReport({ finalUrl, technologies, security, performance }: BuildReportInput): AnalysisReport {
  const overallScore = computeOverallScore(security, performance);
  const grade = scoreToGrade(overallScore);
  const suggestions = buildSuggestions({ security, performance, technologies });
  const roastHeadline = buildRoastHeadline(grade, overallScore);
  const annotatedTechnologies = technologies.map(buildTechInsight);

  return {
    url: finalUrl,
    grade,
    overallScore,
    roastHeadline,
    technologies: annotatedTechnologies,
    security,
    performance,
    suggestions
  };
}

function computeOverallScore(security: SecurityResult, performance: PerformanceReport): number {
  // Security carries more weight; unavailable PSI data does not reduce the score.
  if (!performance.available) {
    return Math.round(security.score);
  }

  const perfAverage = average(Object.values(performance.scores).filter((v): v is number => typeof v === 'number'));
  if (perfAverage === null) {
    return Math.round(security.score);
  }

  return Math.round(security.score * 0.7 + perfAverage * 0.3);
}

function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

interface BuildSuggestionsInput {
  security: SecurityResult;
  performance: PerformanceReport;
  technologies: Technology[];
}

function buildSuggestions({ security, performance, technologies }: BuildSuggestionsInput): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const finding of security.findings) {
    suggestions.push({
      id: finding.id,
      source: 'security',
      severity: finding.severity,
      impact: SEVERITY_IMPACT[finding.severity] ?? 1,
      title: finding.title,
      advice: finding.advice,
      roast: finding.roast
    });
  }

  if (performance.available) {
    const { scores } = performance;
    const perfLabels: Record<string, string> = {
      performance: 'Performance',
      accessibility: 'Accessibility',
      bestpractices: 'Best Practices',
      seo: 'SEO'
    };
    for (const [key, value] of Object.entries(scores)) {
      if (typeof value !== 'number') continue;
      const label = perfLabels[key] || key;
      if (value < 50) {
        suggestions.push({
          id: `perf-${key}`,
          source: 'performance',
          severity: 'critical',
          impact: 3,
          title: `${label} score is poor (${value}/100)`,
          advice: `Lighthouse ${label} score is ${value}/100. Review the PageSpeed Insights report for this URL for specific fixes.`,
          roast: `${label} score of ${value}/100. Users are aging in real time waiting on this page — Lighthouse basically gave it a participation trophy.`
        });
      } else if (value < 90) {
        suggestions.push({
          id: `perf-${key}`,
          source: 'performance',
          severity: 'warning',
          impact: 2,
          title: `${label} score has room to improve (${value}/100)`,
          advice: `Lighthouse ${label} score is ${value}/100. Review the PageSpeed Insights report for this URL for specific fixes.`,
          roast: `${label} score of ${value}/100. Not a disaster, but not exactly a highlight reel either.`
        });
      }
    }
  } else {
    suggestions.push({
      id: 'perf-unavailable',
      source: 'performance',
      severity: 'info',
      impact: 1,
      title: 'Performance data unavailable',
      advice: performance.reason || 'PageSpeed Insights data could not be retrieved for this URL.',
      roast: `Couldn't even get a performance reading in: ${performance.reason || 'PageSpeed Insights was unavailable.'} Even Google needed a breather.`
    });
  }

  if (technologies.length === 0) {
    suggestions.push({
      id: 'tech-none',
      source: 'tech',
      severity: 'info',
      impact: 1,
      title: 'No recognizable technologies detected',
      advice: 'Could not confidently fingerprint the tech stack from headers/HTML. This can happen with heavily obfuscated or minimal sites.',
      roast: "Couldn't fingerprint a single technology here. Either this site is a fortress of minimalism, or it's just really, really bare."
    });
  }

  suggestions.sort((a, b) => {
    const rankDiff = (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3);
    if (rankDiff !== 0) return rankDiff;
    return b.impact - a.impact;
  });

  return suggestions;
}
