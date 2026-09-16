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

// Limit the SSRF-capable analysis route.
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
