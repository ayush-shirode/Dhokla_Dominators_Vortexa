import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { APP_CONFIG, createErrorResponse } from '@repo/shared';
import { healthRouter } from './routes/health.route.js';
import { userRouter } from './routes/user.route.js';

dotenv.config();

const app = express();
const port = process.env.PORT || APP_CONFIG.DEFAULT_API_PORT;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({ origin: [frontendUrl, 'http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: APP_CONFIG.APP_NAME,
    status: 'online',
    version: '1.0.0',
    documentation: `${APP_CONFIG.API_PREFIX}`,
  });
});

app.use(`${APP_CONFIG.API_PREFIX}/health`, healthRouter);
app.use(`${APP_CONFIG.API_PREFIX}/users`, userRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json(createErrorResponse('Route not found', 'Not Found'));
});

// Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err);
  res.status(500).json(createErrorResponse(err.message || 'Internal Server Error', 'Server Error'));
});

app.listen(port, () => {
  console.log(`🚀 [API] Server running at http://localhost:${port}`);
  console.log(`🔗 [API] Health check available at http://localhost:${port}${APP_CONFIG.API_PREFIX}/health`);
});
