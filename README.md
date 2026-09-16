# Site Roaster 🔥

Point Site Roaster at a website and get an accurate, no-nonsense report on:

- **Tech stack** — frameworks, CMS, server software, CDN, analytics, etc. (via [simple-wappalyzer](https://www.npmjs.com/package/simple-wappalyzer), using headers/HTML we fetch ourselves — no headless browser, no paid API).
- **Security posture** — HTTPS usage, missing security headers (HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy), server/version disclosure, cookie flag issues, mixed content, and known-vulnerable/EOL client-side libraries (jQuery, Bootstrap, AngularJS, Lodash, Moment, Handlebars, Underscore).
- **Performance** — Lighthouse scores (Performance, Accessibility, Best Practices, SEO) via the [Google PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started).

All of this is combined into an overall A-F grade plus a ranked list of actionable "roast" suggestions.

## How it works

- `server/` — an Express API (`POST /api/analyze { url }`) that safely fetches the target URL server-side, runs tech/security/performance analysis, and returns one consolidated JSON report.
- `client/` — a Vite + React single-page app: enter a URL, hit "Roast it", see the grade, detected technologies, security findings, performance scores, and suggestions.

### Security

Since the server fetches arbitrary user-supplied URLs, SSRF protection is built in from the ground up:

- [`server/src/services/ssrfGuard.ts`](server/src/services/ssrfGuard.ts) resolves the hostname via DNS and rejects private, loopback, link-local (including the `169.254.169.254` cloud metadata endpoint), and other non-public IP ranges.
- [`server/src/services/safeFetch.ts`](server/src/services/safeFetch.ts) only allows `http`/`https`, manually follows redirects (re-validating the target on every hop), pins each connection's actual socket to the already-validated IP address (via a custom DNS `lookup` on the request `Agent`) to prevent DNS-rebinding TOCTOU attacks, and enforces a request timeout and response size cap.
- [`server/src/routes/analyze.ts`](server/src/routes/analyze.ts) does basic input validation before any network access, and the route is rate-limited to reduce abuse potential.
- The React client never uses `dangerouslySetInnerHTML` — all data from the analyzed site (headers, detected library names, etc.) is rendered as plain text and automatically escaped by React.

## Setup

Requires Node.js 18+ (for native `fetch`/`AbortController` support).

```bash
npm install
```

This installs dependencies for both workspaces (`server` and `client`).

### Environment variables

Copy the example env file and (optionally) add a PageSpeed Insights API key:

```bash
cp server/.env.example server/.env
```

- `GOOGLE_PSI_API_KEY` (optional) — without a key, PageSpeed Insights works at a low quota; set a key for higher limits. Get one at https://developers.google.com/speed/docs/insights/v5/get-started (enable the "PageSpeed Insights API" in a Google Cloud project, then create an API key). Performance analysis fails soft — if PSI is unavailable or rate-limited, the rest of the report still renders.
- `PORT` (optional, default `3001`) — port the API server listens on.

### Running

In separate terminals:

```bash
npm run dev:server   # starts the API on http://localhost:3001
npm run dev:client   # starts the Vite dev server on http://localhost:5173
```

Open http://localhost:5173, enter a URL (e.g. `https://example.com`), and click "Roast it".

### API

```
POST /api/analyze
Content-Type: application/json

{ "url": "https://example.com" }
```

Returns a JSON report: `{ url, grade, overallScore, technologies, security, performance, suggestions }`.

### Tests

The server has a Mocha + Chai test suite covering the security header/cookie/library checks, scoring/grading logic, URL validation, and the SSRF guard (loopback, link-local/metadata, private RFC1918 ranges, IPv4-mapped IPv6, unresolvable hosts):

```bash
npm test --workspace=server
```

## Project structure

```
server/
  src/
    index.ts              # Express app entrypoint
    routes/analyze.ts      # POST /api/analyze
    services/
      ssrfGuard.ts          # blocks private/loopback/link-local IPs
      safeFetch.ts          # SSRF-safe fetch, DNS-pinned + redirect re-validation
      techDetect.ts         # wraps simple-wappalyzer
      libraryAdvisories.ts  # curated known-vulnerable/EOL library table
      securityChecks.ts     # security header/cookie/library scoring
      performance.ts        # Google PageSpeed Insights wrapper
      scoring.ts            # aggregates everything into a grade + suggestions
    types/domain.ts        # shared report/finding/technology types
  test/                    # Mocha + Chai unit tests
client/
  src/App.tsx              # single-page UI
  src/types.ts             # client-side copy of the report shape
```

Both `server` and `client` are written in TypeScript. `npm run build --workspace=server` compiles to `server/dist`; `npm run build --workspace=client` produces a static `client/dist` bundle.
