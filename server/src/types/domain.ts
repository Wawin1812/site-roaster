// Shared types used across the analyze pipeline (tech detection, security
// checks, performance, and the final aggregated report).

export interface Technology {
  name: string;
  slug: string;
  categories: string[];
  version: string | null;
  confidence: number;
  website?: string;
}

// A detected technology annotated with a per-item verdict: whether it's a
// known-vulnerable/EOL library, a generally "old-school"/legacy choice, or
// something that's only visible at all because it leaked via response
// headers (passive backend fingerprinting). `note` is the professional
// phrasing, `roast` is the sarcastic one for Brutal Roast mode.
export interface TechnologyInsight extends Technology {
  note: string;
  roast: string;
}

export type Severity = 'critical' | 'warning' | 'info';

export interface SecurityFinding {
  id: string;
  severity: Severity;
  title: string;
  advice: string;
  roast: string;
}

export interface SecurityResult {
  score: number;
  findings: SecurityFinding[];
}

export interface PerformanceScores {
  performance: number | null;
  accessibility: number | null;
  bestpractices: number | null;
  seo: number | null;
}

export interface PerformanceMetrics {
  firstContentfulPaint: string | null;
  largestContentfulPaint: string | null;
  totalBlockingTime: string | null;
  cumulativeLayoutShift: string | null;
  speedIndex: string | null;
}

export type PerformanceReport =
  | { available: true; scores: PerformanceScores; metrics: PerformanceMetrics }
  | { available: false; reason: string };

export interface Suggestion {
  id: string;
  source: 'security' | 'performance' | 'tech';
  severity: Severity;
  impact: number;
  title: string;
  advice: string;
  roast: string;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface AnalysisReport {
  url: string;
  grade: Grade;
  overallScore: number;
  roastHeadline: string;
  technologies: TechnologyInsight[];
  security: SecurityResult;
  performance: PerformanceReport;
  suggestions: Suggestion[];
}
