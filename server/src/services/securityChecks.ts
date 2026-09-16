import semver from 'semver';
import type { Headers } from 'node-fetch';
import { LIBRARY_ADVISORIES } from './libraryAdvisories.js';
import type { SecurityFinding, SecurityResult, Technology } from '../types/domain.js';

const SECURITY_HEADERS = [
  {
    header: 'strict-transport-security',
    id: 'hsts',
    label: 'HTTP Strict Transport Security (HSTS)',
    weight: 15,
    advice: 'Add a Strict-Transport-Security header (e.g. "max-age=31536000; includeSubDomains; preload") to force browsers to always use HTTPS for this domain.',
    roast: "No HSTS header, so browsers will happily downgrade back to plain HTTP the second anything looks at it funny. It's a five-minute header. You had time."
  },
  {
    header: 'content-security-policy',
    id: 'csp',
    label: 'Content-Security-Policy (CSP)',
    weight: 20,
    advice: 'Add a Content-Security-Policy header to restrict where scripts, styles, and other resources can be loaded from, mitigating XSS and data-injection attacks.',
    roast: "Zero Content-Security-Policy. If a rogue script ever sneaks onto this page, the browser will run it with zero questions asked — no ID check, no bouncer, straight to the dance floor."
  },
  {
    header: 'x-content-type-options',
    id: 'ctoption',
    label: 'X-Content-Type-Options',
    weight: 10,
    advice: 'Add "X-Content-Type-Options: nosniff" to stop browsers from MIME-sniffing responses away from the declared content type.',
    roast: 'No X-Content-Type-Options, so browsers are free to "guess" what a file actually is. Letting browsers freestyle content types is how bad afternoons start.'
  },
  {
    header: 'x-frame-options',
    id: 'xfo',
    label: 'X-Frame-Options / frame-ancestors',
    weight: 10,
    advice: 'Add "X-Frame-Options: DENY" (or a CSP frame-ancestors directive) to prevent clickjacking via iframe embedding.',
    roast: 'No clickjacking protection. Anyone could slap this whole site into an invisible iframe and trick people into clicking things they never meant to. Cheap fix, apparently zero effort spent.'
  },
  {
    header: 'referrer-policy',
    id: 'referrer',
    label: 'Referrer-Policy',
    weight: 5,
    advice: 'Add a Referrer-Policy header (e.g. "strict-origin-when-cross-origin") to limit how much referrer information is leaked to other sites.',
    roast: "No Referrer-Policy, so every outbound link hands over a little breadcrumb trail of exactly where your visitors came from. Not catastrophic, just... sloppy."
  },
  {
    header: 'permissions-policy',
    id: 'permissions',
    label: 'Permissions-Policy',
    weight: 5,
    advice: 'Add a Permissions-Policy header to explicitly disable browser features (camera, microphone, geolocation, etc.) your site does not use.',
    roast: 'No Permissions-Policy, meaning every third-party script you load is implicitly trusted with camera/mic/geolocation access it will never responsibly use. Lock the doors.'
  }
];

export interface RunSecurityChecksInput {
  finalUrl: string;
  headers: Headers;
  html: string;
  technologies: Technology[];
}

export function runSecurityChecks({ finalUrl, headers, html, technologies }: RunSecurityChecksInput): SecurityResult {
  const findings: SecurityFinding[] = [];
  let scoreDeductions = 0;

  const isHttps = new URL(finalUrl).protocol === 'https:';
  if (!isHttps) {
    findings.push(critical(
      'no-https',
      'Site is served over plain HTTP',
      'All traffic (including any forms/logins) is unencrypted and vulnerable to eavesdropping and tampering. Migrate to HTTPS with a valid TLS certificate.',
      "Cute, serving traffic over plain HTTP like it's 1999. Anyone on the same coffee-shop wifi as your customers can read every request in plain text. TLS certificates are free now — there's no excuse."
    ));
    scoreDeductions += 30;
  }

  for (const check of SECURITY_HEADERS) {
    if (!headers.get(check.header)) {
      findings.push(warning(check.id, `Missing ${check.label} header`, check.advice, check.roast));
      scoreDeductions += check.weight;
    }
  }

  const serverHeader = headers.get('server');
  const poweredBy = headers.get('x-powered-by');
  if (serverHeader && /[\d]/.test(serverHeader)) {
    findings.push(info(
      'server-disclosure',
      `Server header discloses version info: "${serverHeader}"`,
      'Consider suppressing or generalizing the Server header so attackers cannot easily fingerprint the exact server software/version in use.',
      `The Server header is out here announcing itself as "${serverHeader}" like a name tag at a networking event. Great for attackers doing recon, less great for you.`
    ));
    scoreDeductions += 5;
  }
  if (poweredBy) {
    findings.push(info(
      'x-powered-by-disclosure',
      `X-Powered-By header discloses backend technology: "${poweredBy}"`,
      'Disable the X-Powered-By header (e.g. app.disable("x-powered-by") in Express) to avoid revealing backend technology to attackers.',
      `X-Powered-By is broadcasting "${poweredBy}" to anyone who sends a single curl request. One line of code makes this go away, and yet.`
    ));
    scoreDeductions += 5;
  }

  const setCookieHeaders = headers.raw ? headers.raw()['set-cookie'] || [] : [];
  for (const cookie of setCookieHeaders) {
    const lower = cookie.toLowerCase();
    const name = cookie.split('=')[0];
    if (!lower.includes('secure') && isHttps) {
      findings.push(warning(
        'cookie-secure',
        `Cookie "${name}" is missing the Secure flag`,
        'Add the Secure flag so this cookie is only ever sent over HTTPS.',
        `Cookie "${name}" skips the Secure flag, so it's happy to travel over an unencrypted connection if one's ever offered. It will not ask questions.`
      ));
      scoreDeductions += 3;
    }
    if (!lower.includes('httponly')) {
      findings.push(warning(
        'cookie-httponly',
        `Cookie "${name}" is missing the HttpOnly flag`,
        'Add the HttpOnly flag so this cookie cannot be read by client-side JavaScript, reducing XSS impact.',
        `Cookie "${name}" is missing HttpOnly, so any script on the page — friendly or not — can just read it. An open book.`
      ));
      scoreDeductions += 3;
    }
    if (!lower.includes('samesite')) {
      findings.push(warning(
        'cookie-samesite',
        `Cookie "${name}" is missing the SameSite attribute`,
        'Add SameSite=Lax or SameSite=Strict to reduce CSRF risk.',
        `Cookie "${name}" has no SameSite attribute — basically an open invitation to cross-site request shenanigans.`
      ));
      scoreDeductions += 3;
    }
  }

  if (isHttps) {
    const mixedContentMatches = html.match(/(?:src|href)=["']http:\/\/[^"']+["']/gi) || [];
    if (mixedContentMatches.length > 0) {
      findings.push(warning(
        'mixed-content',
        `Found ${mixedContentMatches.length} resource(s) loaded over plain HTTP on an HTTPS page`,
        'Update all asset URLs (scripts, stylesheets, images) to use HTTPS to avoid mixed-content warnings and blocked resources.',
        `Found ${mixedContentMatches.length} resource(s) still loading over plain HTTP on an HTTPS page. That's like locking the front door and leaving the windows wide open.`
      ));
      scoreDeductions += 10;
    }
  }

  for (const tech of technologies) {
    const advisory = LIBRARY_ADVISORIES[tech.slug];
    if (!advisory) continue;

    const version = tech.version && semver.valid(semver.coerce(tech.version));
    const isOutdated = advisory.minSafeVersion === null
      || (version && semver.lt(version, advisory.minSafeVersion));

    if (advisory.minSafeVersion === null || isOutdated || !tech.version) {
      const versionLabel = tech.version ? ` v${tech.version}` : '';
      findings.push(critical(
        `outdated-lib-${tech.slug}`,
        `${tech.name}${versionLabel} is outdated or unmaintained`,
        advisory.reason,
        `${tech.name}${versionLabel} is still in production and it's old enough to have its own retirement plan. ${advisory.reason}`
      ));
      scoreDeductions += 15;
    }
  }

  const score = Math.max(0, 100 - scoreDeductions);
  return { score, findings };
}

function critical(id: string, title: string, advice: string, roast: string): SecurityFinding {
  return { id, severity: 'critical', title, advice, roast };
}
function warning(id: string, title: string, advice: string, roast: string): SecurityFinding {
  return { id, severity: 'warning', title, advice, roast };
}
function info(id: string, title: string, advice: string, roast: string): SecurityFinding {
  return { id, severity: 'info', title, advice, roast };
}
