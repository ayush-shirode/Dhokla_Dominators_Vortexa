import fs from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import { LIMITS } from '@repo/shared';
import { AppError, deviceOf, h, notFound, ok, param } from '../lib/http.js';
import { deletePhoto, getPhoto, getPhotoRow, photoFilePath, processUpload } from '../services/photos.js';

export const photosRouter = Router();

// Memory storage: the unmasked original is never written to disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMITS.maxPhotoBytes, files: 1 } });

photosRouter.post('/photos', upload.single('image'), h(async (req, res) => {
  if (!req.file) throw new AppError(400, 'VALIDATION_FAILED', 'Attach the photo as multipart field "image"');
  const photo = await processUpload(deviceOf(req), req.file.buffer, req.file.mimetype, {
    skipQualityGate: req.query.skipQualityGate === 'true',
    userConfirmedNoIds: req.query.userConfirmedNoIds === 'true',
  });
  // Drop our reference to the original bytes as soon as possible.
  req.file.buffer = Buffer.alloc(0);
  ok(res, photo, { status: 201 });
}));

photosRouter.get('/photos/:id', h((req, res) => {
  const d = deviceOf(req);
  const row = getPhotoRow(d, param(req, 'id'));
  if (!row) throw notFound('Photo');
  const file = photoFilePath(d, row);
  if (!fs.existsSync(file)) throw notFound('Photo file');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(file).pipe(res);
}));

photosRouter.get('/photos/:id/meta', h((req, res) => {
  const p = getPhoto(deviceOf(req), param(req, 'id'));
  if (!p) throw notFound('Photo');
  ok(res, p);
}));

photosRouter.delete('/photos/:id', h((req, res) => {
  deletePhoto(deviceOf(req), param(req, 'id'));
  ok(res, { deleted: true });
}));
