import dns from 'node:dns/promises';
import type { LookupAddress } from 'node:dns';
import ipaddr from 'ipaddr.js';

/**
 * Resolves a hostname and validates that every address it returns is public
 * (rejects private, loopback, link-local — including the 169.254.169.254
 * cloud metadata endpoint — and other non-public ranges).
 *
 * Returns the validated addresses so the caller can pin its connection to
 * one of them. This is important: merely checking "does this hostname
 * resolve to a public address?" and then handing the same hostname to an
 * HTTP client is vulnerable to DNS rebinding (a TOCTOU attack where a
 * malicious authoritative DNS server returns a public IP for this check and
 * a private/internal IP moments later when the HTTP client itself resolves
 * the name to connect). Pinning to the address we already validated closes
 * that gap.
 */
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
  // ipaddr.js classifies ranges as one of:
  // 'unicast' (public) is the only range we allow.
  // Everything else (private, loopback, linkLocal, uniqueLocal,
  // carrierGradeNat, reserved, multicast, broadcast, etc.) is blocked.
  return range === 'unicast';
}
