import { expect } from 'chai';
import { describe, it } from 'mocha';
import { resolvePublicAddresses } from '../src/services/ssrfGuard.js';

describe('resolvePublicAddresses (SSRF guard)', () => {
  it('resolves a real public hostname to at least one address', async () => {
    const addresses = await resolvePublicAddresses('example.com');
    expect(addresses).to.not.be.empty;
  });

  it('rejects loopback IP literals (127.0.0.1)', async () => {
    try {
      await resolvePublicAddresses('127.0.0.1');
      expect.fail('expected resolvePublicAddresses to throw for a loopback address');
    } catch (err) {
      expect((err as Error).message).to.match(/non-public address/);
    }
  });

  it('rejects the IPv6 loopback literal (::1)', async () => {
    try {
      await resolvePublicAddresses('::1');
      expect.fail('expected resolvePublicAddresses to throw for the IPv6 loopback address');
    } catch (err) {
      expect((err as Error).message).to.match(/non-public address/);
    }
  });

  it('rejects the cloud metadata endpoint (169.254.169.254)', async () => {
    try {
      await resolvePublicAddresses('169.254.169.254');
      expect.fail('expected resolvePublicAddresses to throw for the metadata address');
    } catch (err) {
      expect((err as Error).message).to.match(/non-public address/);
    }
  });

  it('rejects private RFC1918 addresses (10.x, 172.16.x, 192.168.x)', async () => {
    for (const address of ['10.0.0.1', '172.16.0.1', '192.168.1.1']) {
      try {
        await resolvePublicAddresses(address);
        expect.fail(`expected resolvePublicAddresses to throw for private address ${address}`);
      } catch (err) {
        expect((err as Error).message).to.match(/non-public address/);
      }
    }
  });

  it('rejects an IPv4-mapped IPv6 address pointing at the metadata endpoint', async () => {
    try {
      await resolvePublicAddresses('::ffff:169.254.169.254');
      expect.fail('expected resolvePublicAddresses to throw for an IPv4-mapped metadata address');
    } catch (err) {
      expect((err as Error).message).to.match(/non-public address/);
    }
  });

  it('rejects a hostname that cannot be resolved', async () => {
    try {
      await resolvePublicAddresses('this-domain-should-not-exist-siteroaster-test.invalid');
      expect.fail('expected resolvePublicAddresses to throw for an unresolvable hostname');
    } catch (err) {
      expect((err as Error).message).to.match(/Could not resolve host/);
    }
  });
});
