import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import router from './routes';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '5000', 10);

// ── Middleware ────────────────────────────────────────────────────────
// Allow any localhost port in development, strict origin in production
const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL ?? 'http://localhost:3000')
  : /^http:\/\/localhost:\d+$/;

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));  // large limit for base64 image payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────
app.use('/api', router);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ┌────────────────────────────────────────────┐
  │   🖨️  Britannia Digi Print — API Server    │
  │   Listening on http://0.0.0.0:${PORT}         │
  │   Environment: ${process.env.NODE_ENV ?? 'development'}              │
  └────────────────────────────────────────────┘
  `);
});

export default app;
