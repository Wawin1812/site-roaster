import { expect } from 'chai';
import { Headers } from 'node-fetch';
import { runSecurityChecks } from '../src/services/securityChecks.js';
import type { Technology } from '../src/types/domain.js';

function findingIds(findings: { id: string }[]): string[] {
  return findings.map((f) => f.id);
}

describe('runSecurityChecks', () => {
  it('flags plain HTTP and all missing security headers on a bare-bones response', () => {
    const result = runSecurityChecks({
      finalUrl: 'http://example.com',
      headers: new Headers(),
      html: '<html></html>',
      technologies: []
    });

    expect(findingIds(result.findings)).to.include.members([
      'no-https',
      'hsts',
      'csp',
      'ctoption',
      'xfo',
      'referrer',
      'permissions'
    ]);
    // no-https (30) + hsts(15) + csp(20) + ctoption(10) + xfo(10) + referrer(5) + permissions(5) = 95
    expect(result.score).to.equal(5);
  });

  it('gives a clean score for an HTTPS response with all recommended headers set', () => {
    const headers = new Headers({
      'strict-transport-security': 'max-age=31536000',
      'content-security-policy': "default-src 'self'",
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'geolocation=()'
    });

    const result = runSecurityChecks({
      finalUrl: 'https://example.com',
      headers,
      html: '<html></html>',
      technologies: []
    });

    expect(result.findings).to.be.empty;
    expect(result.score).to.equal(100);
  });

  it('does not flag missing HTTPS-only checks (Secure cookie flag) on a plain HTTP site', () => {
    const headers = new Headers();
    headers.append('set-cookie', 'session=abc; HttpOnly; SameSite=Lax');

    const result = runSecurityChecks({
      finalUrl: 'http://example.com',
      headers,
      html: '<html></html>',
      technologies: []
    });

    expect(findingIds(result.findings)).to.not.include('cookie-secure');
  });

  it('flags cookies missing Secure/HttpOnly/SameSite on an HTTPS site', () => {
    const headers = new Headers({
      'strict-transport-security': 'max-age=31536000',
      'content-security-policy': "default-src 'self'",
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'geolocation=()'
    });
    headers.append('set-cookie', 'session=abc');

    const result = runSecurityChecks({
      finalUrl: 'https://example.com',
      headers,
      html: '<html></html>',
      technologies: []
    });

    expect(findingIds(result.findings)).to.include.members([
      'cookie-secure',
      'cookie-httponly',
      'cookie-samesite'
    ]);
  });

  it('flags mixed content (HTTP resources loaded on an HTTPS page)', () => {
    const headers = new Headers({
      'strict-transport-security': 'max-age=31536000',
      'content-security-policy': "default-src 'self'",
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'geolocation=()'
    });

    const result = runSecurityChecks({
      finalUrl: 'https://example.com',
      headers,
      html: '<html><script src="http://cdn.example.com/app.js"></script></html>',
      technologies: []
    });

    expect(findingIds(result.findings)).to.include('mixed-content');
  });

  it('discloses server/x-powered-by version info as an info-level finding', () => {
    const headers = new Headers({
      server: 'Apache/2.4.29',
      'x-powered-by': 'PHP/7.2.1'
    });

    const result = runSecurityChecks({
      finalUrl: 'https://example.com',
      headers,
      html: '<html></html>',
      technologies: []
    });

    const serverFinding = result.findings.find((f) => f.id === 'server-disclosure');
    const poweredByFinding = result.findings.find((f) => f.id === 'x-powered-by-disclosure');
    expect(serverFinding?.severity).to.equal('info');
    expect(poweredByFinding?.severity).to.equal('info');
  });

  it('flags an outdated jQuery version against the known-vulnerable advisory table', () => {
    const technologies: Technology[] = [
      { name: 'jQuery', slug: 'jquery', categories: ['JavaScript libraries'], version: '1.12.4', confidence: 100 }
    ];

    const result = runSecurityChecks({
      finalUrl: 'https://example.com',
      headers: new Headers(),
      html: '<html></html>',
      technologies
    });

    expect(findingIds(result.findings)).to.include('outdated-lib-jquery');
  });

  it('does not flag a modern, patched jQuery version', () => {
    const technologies: Technology[] = [
      { name: 'jQuery', slug: 'jquery', categories: ['JavaScript libraries'], version: '3.7.1', confidence: 100 }
    ];

    const result = runSecurityChecks({
      finalUrl: 'https://example.com',
      headers: new Headers(),
      html: '<html></html>',
      technologies
    });

    expect(findingIds(result.findings)).to.not.include('outdated-lib-jquery');
  });

  it('always flags AngularJS (EOL, null minSafeVersion) regardless of version', () => {
    const technologies: Technology[] = [
      { name: 'AngularJS', slug: 'angularjs', categories: ['JavaScript frameworks'], version: '1.8.3', confidence: 100 }
    ];

    const result = runSecurityChecks({
      finalUrl: 'https://example.com',
      headers: new Headers(),
      html: '<html></html>',
      technologies
    });

    expect(findingIds(result.findings)).to.include('outdated-lib-angularjs');
  });

  it('never lets the score go below 0 even with many deductions', () => {
    const technologies: Technology[] = [
      { name: 'jQuery', slug: 'jquery', categories: [], version: '1.4.0', confidence: 100 },
      { name: 'AngularJS', slug: 'angularjs', categories: [], version: '1.0.0', confidence: 100 },
      { name: 'Moment.js', slug: 'moment', categories: [], version: '2.0.0', confidence: 100 },
      { name: 'Underscore.js', slug: 'underscore', categories: [], version: '1.0.0', confidence: 100 }
    ];
    const headers = new Headers();
    headers.append('set-cookie', 'a=1');
    headers.append('set-cookie', 'b=2');

    const result = runSecurityChecks({
      finalUrl: 'http://example.com',
      headers,
      html: '<html></html>',
      technologies
    });

    expect(result.score).to.equal(0);
  });

  it('gives every finding a non-empty roast line distinct from its professional advice', () => {
    const result = runSecurityChecks({
      finalUrl: 'http://example.com',
      headers: new Headers(),
      html: '<html></html>',
      technologies: []
    });

    expect(result.findings).to.not.be.empty;
    for (const finding of result.findings) {
      expect(finding.roast).to.be.a('string').and.not.empty;
      expect(finding.roast).to.not.equal(finding.advice);
    }
  });
});
