
export interface Technology {
  name: string;
  slug: string;
  categories: string[];
  version: string | null;
  confidence: number;
  website?: string;
}

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
