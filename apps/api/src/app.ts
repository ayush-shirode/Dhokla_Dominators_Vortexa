import express, { type Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { APP_CONFIG } from '@repo/shared';
import { config } from './config.js';
import { sendError } from './lib/http.js';
import { requireDevice } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { aiRouter } from './routes/ai.js';
import { channelsRouter } from './routes/channels.js';
import { dataRouter } from './routes/data.js';
import { devicesRouter } from './routes/devices.js';
import { metaRouter } from './routes/meta.js';
import { photosRouter } from './routes/photos.js';
import { reportsRouter } from './routes/reports.js';
import { syncRouter } from './routes/sync.js';

function limiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req: Request) => (req as Request & { deviceId?: string }).deviceId ?? ipKeyGenerator(req.ip ?? 'unknown'),
    handler: (_req, res) => sendError(res, 429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.'),
    skip: () => config.isTest,
  });
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: config.frontendOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Admin-Token'],
      exposedHeaders: ['Content-Disposition', 'Retry-After', 'RateLimit', 'RateLimit-Policy'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  // Log method, path, status and timing only — never bodies (they can contain personal data).
  if (!config.isTest) app.use(morgan(':method :url :status :response-time ms'));

  app.get('/', (_req, res) => {
    res.json({ name: 'RationSaathi API', status: 'online', version: config.apiVersion, documentation: `${APP_CONFIG.API_PREFIX}/meta` });
  });

  const api = express.Router();
  // Public
  api.use(metaRouter);
  api.use(channelsRouter);
  api.post('/devices', limiter(60 * 60 * 1000, 30));
  api.use(devicesRouter);
  // Device-authenticated
  api.use(requireDevice);
  api.use('/ai', limiter(60 * 1000, 30));
  api.use('/photos', limiter(60 * 1000, 30));
  api.use(limiter(60 * 1000, 600));
  api.use(dataRouter);
  api.use(photosRouter);
  api.use(reportsRouter);
  api.use(aiRouter);
  api.use(syncRouter);

  app.use(APP_CONFIG.API_PREFIX, api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
