# Site Roaster 🔥

Analyze a public website's stack, security headers, and PageSpeed signals, then get an A–F score with actionable roast suggestions.

## Live

- App: [website-roaster.netlify.app](https://website-roaster.netlify.app/)
- API health: [site-roaster.onrender.com/api/health](https://site-roaster.onrender.com/api/health)
- Source: [github.com/Wawin1812/site-roaster](https://github.com/Wawin1812/site-roaster)

## Stack

- React + Vite client
- Express + TypeScript API
- `simple-wappalyzer` for passive stack detection
- Google PageSpeed Insights for performance data

## Security

The API fetches user-supplied URLs, so it:

- blocks private, loopback, link-local, and metadata IP ranges;
- revalidates and DNS-pins every redirect target;
- limits protocols, redirects, body size, time, and request rate;
- escapes report content in React and does not use `dangerouslySetInnerHTML`.

## Local development

Requires Node.js 18+.

```bash
npm install
cp server/.env.example server/.env
npm run dev:server
npm run dev:client
```

Open `http://localhost:5173`. `GOOGLE_PSI_API_KEY` is optional; `PORT` defaults to `3001`.

## API

```http
POST /api/analyze
Content-Type: application/json

{"url":"https://example.com"}
```

## Tests

```bash
npm test --workspace=server
npm run build --workspace=server
npm run build --workspace=client
```
