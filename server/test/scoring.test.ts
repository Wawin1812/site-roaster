import { expect } from 'chai';
import { buildReport } from '../src/services/scoring.js';
import type { PerformanceReport, SecurityResult, Technology } from '../src/types/domain.js';

const cleanSecurity: SecurityResult = { score: 100, findings: [] };
const failingSecurity: SecurityResult = {
  score: 20,
  findings: [
    { id: 'no-https', severity: 'critical', title: 'Site is served over plain HTTP', advice: 'Use HTTPS.', roast: 'Plain HTTP? Bold choice.' },
    { id: 'csp', severity: 'warning', title: 'Missing CSP header', advice: 'Add CSP.', roast: 'No CSP, no chill.' }
  ]
};
const unavailablePerformance: PerformanceReport = { available: false, reason: 'Rate limited' };
const goodPerformance: PerformanceReport = {
  available: true,
  scores: { performance: 95, accessibility: 95, bestpractices: 95, seo: 95 },
  metrics: {
    firstContentfulPaint: null,
    largestContentfulPaint: null,
    totalBlockingTime: null,
    cumulativeLayoutShift: null,
    speedIndex: null
  }
};
const poorPerformance: PerformanceReport = {
  available: true,
  scores: { performance: 30, accessibility: 40, bestpractices: 95, seo: 95 },
  metrics: {
    firstContentfulPaint: null,
    largestContentfulPaint: null,
    totalBlockingTime: null,
    cumulativeLayoutShift: null,
    speedIndex: null
  }
};

describe('buildReport', () => {
  it('grades an A for a clean security score when performance is unavailable', () => {
    const report = buildReport({
      finalUrl: 'https://example.com',
      technologies: [],
      security: cleanSecurity,
      performance: unavailablePerformance
    });

    expect(report.overallScore).to.equal(100);
    expect(report.grade).to.equal('A');
  });

  it('blends security (70%) and performance (30%) when performance data is available', () => {
    const report = buildReport({
      finalUrl: 'https://example.com',
      technologies: [],
      security: cleanSecurity,
      performance: goodPerformance
    });

    // 100 * 0.7 + 95 * 0.3 = 98.5 -> rounds to 99 (banker's/half-up per Math.round)
    expect(report.overallScore).to.equal(99);
    expect(report.grade).to.equal('A');
  });

  it('grades an F for a site with critical security failures', () => {
    const report = buildReport({
      finalUrl: 'http://example.com',
      technologies: [],
      security: failingSecurity,
      performance: unavailablePerformance
    });

    expect(report.overallScore).to.equal(20);
    expect(report.grade).to.equal('F');
  });

  it('includes security findings as suggestions, ranked before lower-severity ones', () => {
    const report = buildReport({
      finalUrl: 'http://example.com',
      technologies: [],
      security: failingSecurity,
      performance: unavailablePerformance
    });

    expect(report.suggestions[0].severity).to.equal('critical');
    expect(report.suggestions[0].source).to.equal('security');
  });

  it('adds a critical performance suggestion when a Lighthouse category scores below 50', () => {
    const report = buildReport({
      finalUrl: 'https://example.com',
      technologies: [],
      security: cleanSecurity,
      performance: poorPerformance
    });

    const perfSuggestions = report.suggestions.filter((s) => s.source === 'performance');
    expect(perfSuggestions.some((s) => s.severity === 'critical')).to.be.true;
  });

  it('adds an info suggestion explaining why performance data is unavailable', () => {
    const report = buildReport({
      finalUrl: 'https://example.com',
      technologies: [],
      security: cleanSecurity,
      performance: unavailablePerformance
    });

    const perfSuggestion = report.suggestions.find((s) => s.source === 'performance');
    expect(perfSuggestion?.severity).to.equal('info');
    expect(perfSuggestion?.advice).to.include('Rate limited');
  });

  it('adds an info suggestion when no technologies were detected', () => {
    const report = buildReport({
      finalUrl: 'https://example.com',
      technologies: [],
      security: cleanSecurity,
      performance: unavailablePerformance
    });

    expect(report.suggestions.some((s) => s.source === 'tech')).to.be.true;
  });

  it('does not add a "no technologies detected" suggestion when technologies were found', () => {
    const technologies: Technology[] = [
      { name: 'React', slug: 'react', categories: ['JavaScript frameworks'], version: '18.0.0', confidence: 100 }
    ];

    const report = buildReport({
      finalUrl: 'https://example.com',
      technologies,
      security: cleanSecurity,
      performance: unavailablePerformance
    });

    expect(report.suggestions.some((s) => s.source === 'tech')).to.be.false;
  });

  it('assigns letter grades matching the documented score thresholds', () => {
    const grades: [number, string][] = [
      [95, 'A'],
      [85, 'B'],
      [75, 'C'],
      [65, 'D'],
      [40, 'F']
    ];

    for (const [score, expectedGrade] of grades) {
      const report = buildReport({
        finalUrl: 'https://example.com',
        technologies: [],
        security: { score, findings: [] },
        performance: unavailablePerformance
      });
      expect(report.grade).to.equal(expectedGrade);
    }
  });

  it('includes a non-empty sarcastic roastHeadline that varies by grade', () => {
    const goodReport = buildReport({
      finalUrl: 'https://example.com',
      technologies: [],
      security: cleanSecurity,
      performance: unavailablePerformance
    });
    const badReport = buildReport({
      finalUrl: 'http://example.com',
      technologies: [],
      security: failingSecurity,
      performance: unavailablePerformance
    });

    expect(goodReport.roastHeadline).to.be.a('string').and.not.empty;
    expect(badReport.roastHeadline).to.be.a('string').and.not.empty;
    expect(goodReport.roastHeadline).to.not.equal(badReport.roastHeadline);
  });

  it('carries an id and roast line through onto every suggestion', () => {
    const report = buildReport({
      finalUrl: 'http://example.com',
      technologies: [],
      security: failingSecurity,
      performance: unavailablePerformance
    });

    for (const suggestion of report.suggestions) {
      expect(suggestion.id).to.be.a('string').and.not.empty;
      expect(suggestion.roast).to.be.a('string').and.not.empty;
    }
  });
});
