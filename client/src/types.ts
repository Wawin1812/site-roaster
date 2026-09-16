// Types for the server's analysis response.

export type Severity = 'critical' | 'warning' | 'info';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface Technology {
  name: string;
  slug: string;
  categories: string[];
  version: string | null;
  confidence: number;
  website?: string;
  note: string;
  roast: string;
}

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

export type PerformanceReport =
  | { available: true; scores: PerformanceScores }
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

export interface AnalysisReport {
  url: string;
  grade: Grade;
  overallScore: number;
  roastHeadline: string;
  technologies: Technology[];
  security: SecurityResult;
  performance: PerformanceReport;
  suggestions: Suggestion[];
}
