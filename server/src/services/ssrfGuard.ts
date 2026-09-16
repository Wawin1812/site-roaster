import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import ipaddr from 'ipaddr.js';

/** Resolve public addresses and return them for DNS-pinned connections. */
export async function resolvePublicAddresses(hostname: string): Promise<LookupAddress[]> {
  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not resolve host "${hostname}": ${message}`);
  }

  if (addresses.length === 0) {
    throw new Error(`Could not resolve host "${hostname}"`);
  }

  for (const { address } of addresses) {
    if (!isPublicAddress(address)) {
      throw new Error(
        `Refusing to analyze "${hostname}": resolves to a non-public address (${address})`
      );
    }
  }

  return addresses;
}

function isPublicAddress(address: string): boolean {
  let addr;
  try {
    addr = ipaddr.parse(address);
  } catch {
    return false;
  }

  const range = addr.range();
  // Only public unicast addresses are allowed.
  return range === 'unicast';
}
