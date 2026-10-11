import { Router } from 'express';
import { INDIAN_STATES } from '@repo/shared';
import { AppError, h, notFound, ok, param, parse } from '../lib/http.js';
import { channelInputSchema } from '../lib/schemas.js';
import { requireAdmin } from '../middleware/auth.js';
import { deleteChannel, getChannel, listChannels, putChannel } from '../repo/channels.js';

export const channelsRouter = Router();

channelsRouter.get('/grievance-channels', h((req, res) => {
  const stateCode = typeof req.query.stateCode === 'string' ? req.query.stateCode : undefined;
  if (stateCode && !INDIAN_STATES.some((s) => s.code === stateCode)) throw new AppError(400, 'VALIDATION_FAILED', 'Unknown stateCode');
  ok(res, listChannels(stateCode));
}));

channelsRouter.get('/grievance-channels/:id', h((req, res) => {
  const c = getChannel(param(req, 'id'));
  if (!c) throw notFound('Channel');
  ok(res, c);
}));

channelsRouter.put('/grievance-channels/:id', requireAdmin, h((req, res) => {
  const { channel, created } = putChannel(param(req, 'id'), parse(channelInputSchema, req.body));
  ok(res, channel, { status: created ? 201 : 200 });
}));

channelsRouter.delete('/grievance-channels/:id', requireAdmin, h((req, res) => {
  deleteChannel(param(req, 'id'));
  ok(res, { deleted: true });
}));
