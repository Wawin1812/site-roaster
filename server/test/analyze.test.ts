import { expect } from 'chai';
import { validateUrl } from '../src/routes/analyze.js';

describe('validateUrl', () => {
  it('rejects a missing url', () => {
    expect(validateUrl(undefined)).to.match(/Missing required/);
  });

  it('rejects a non-string url', () => {
    expect(validateUrl(12345)).to.match(/Missing required/);
  });

  it('rejects an empty string', () => {
    expect(validateUrl('   ')).to.match(/between 1 and 2048/);
  });

  it('rejects a url longer than 2048 characters', () => {
    const longUrl = `https://example.com/${'a'.repeat(2048)}`;
    expect(validateUrl(longUrl)).to.match(/between 1 and 2048/);
  });

  it('rejects a malformed, non-absolute url', () => {
    expect(validateUrl('not a url')).to.match(/not a valid, absolute URL/);
  });

  it('rejects unsupported protocols like ftp', () => {
    expect(validateUrl('ftp://example.com')).to.match(/Unsupported protocol/);
  });

  it('rejects javascript: and data: pseudo-protocols', () => {
    expect(validateUrl('javascript:alert(1)')).to.match(/Unsupported protocol/);
    expect(validateUrl('data:text/html,<script>alert(1)</script>')).to.match(/Unsupported protocol/);
  });

  it('accepts a well-formed http url', () => {
    expect(validateUrl('http://example.com')).to.be.null;
  });

  it('accepts a well-formed https url', () => {
    expect(validateUrl('https://example.com/path?query=1')).to.be.null;
  });
});
