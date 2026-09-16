import { expect } from 'chai';
import { buildTechInsight, buildRoastHeadline } from '../src/services/roastCopy.js';
import type { Technology } from '../src/types/domain.js';

function tech(overrides: Partial<Technology>): Technology {
  return {
    name: 'Example Tech',
    slug: 'example-tech',
    categories: [],
    version: null,
    confidence: 100,
    ...overrides
  };
}

describe('buildTechInsight', () => {
  it('flags an outdated jQuery version using the shared library advisory table', () => {
    const insight = buildTechInsight(tech({ name: 'jQuery', slug: 'jquery', version: '1.9.0' }));
    expect(insight.note).to.match(/XSS/);
    expect(insight.roast).to.match(/jQuery/);
    expect(insight.roast).to.not.equal(insight.note);
  });

  it('gives a distinct, positive-leaning verdict for an up-to-date advisory-listed library', () => {
    const insight = buildTechInsight(tech({ name: 'jQuery', slug: 'jquery', version: '3.7.1' }));
    expect(insight.note).to.match(/currently supported/);
    expect(insight.roast).to.match(/up to date/);
  });

  it('always flags AngularJS (EOL, null minSafeVersion) regardless of version', () => {
    const insight = buildTechInsight(tech({ name: 'AngularJS', slug: 'angularjs', version: '1.8.3' }));
    expect(insight.note).to.match(/end-of-life/);
  });

  it('applies a curated legacy-tech hint for well-known old-school technologies', () => {
    const insight = buildTechInsight(tech({ name: 'WordPress', slug: 'wordpress', version: '6.4' }));
    expect(insight.note).to.match(/WordPress/);
    expect(insight.roast).to.match(/WordPress/);
  });

  it('flags backend/infra technologies detected via passive fingerprinting', () => {
    const insight = buildTechInsight(tech({
      name: 'Apache',
      slug: 'apache',
      categories: ['Web servers'],
      version: '2.4.29'
    }));
    expect(insight.note).to.match(/response headers/);
    expect(insight.roast).to.match(/free recon/);
  });

  it('falls back to a neutral verdict for an unremarkable, modern technology', () => {
    const insight = buildTechInsight(tech({ name: 'React', slug: 'react', categories: ['JavaScript frameworks'] }));
    expect(insight.note).to.match(/No specific known issues/);
    expect(insight.roast).to.match(/nothing to roast/i);
  });

  it('preserves all original technology fields on the annotated result', () => {
    const original = tech({ name: 'Cloudflare', slug: 'cloudflare', categories: ['CDN'], confidence: 100 });
    const insight = buildTechInsight(original);
    expect(insight.name).to.equal(original.name);
    expect(insight.slug).to.equal(original.slug);
    expect(insight.categories).to.deep.equal(original.categories);
    expect(insight.confidence).to.equal(original.confidence);
  });
});

describe('buildRoastHeadline', () => {
  it('returns a non-empty, grade-specific headline for every grade', () => {
    const grades: Array<['A' | 'B' | 'C' | 'D' | 'F', number]> = [
      ['A', 95], ['B', 85], ['C', 75], ['D', 65], ['F', 30]
    ];
    const headlines = grades.map(([grade, score]) => buildRoastHeadline(grade, score));
    for (const headline of headlines) {
      expect(headline).to.be.a('string').and.not.empty;
    }
    expect(new Set(headlines).size).to.equal(headlines.length);
  });
});
