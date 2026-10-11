import { Router, Request, Response } from 'express';
import { HealthStatus, createSuccessResponse } from '@repo/shared';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const status: HealthStatus = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'api-service',
    environment: process.env.NODE_ENV || 'development',
  };

  res.json(createSuccessResponse(status, 'Service is healthy'));
});
