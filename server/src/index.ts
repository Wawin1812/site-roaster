import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { analyzeRouter } from './routes/analyze.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// The analyze route makes outbound requests to arbitrary user-supplied
// URLs, so it gets its own tighter rate limit to protect against abuse
// (e.g. using this server as an SSRF/DoS proxy against third parties).
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many analysis requests. Please try again later.' }
});

app.use('/api/analyze', analyzeLimiter, analyzeRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`site-roaster server listening on port ${PORT}`);
});
