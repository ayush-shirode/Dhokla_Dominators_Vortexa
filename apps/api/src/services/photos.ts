import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { classifyText, redactSensitiveIds, type DocType, type Photo, type PhotoQuality } from '@repo/shared';
import { config } from '../config.js';
import { getDb, type Row } from '../db/index.js';
import { AppError, nowIso } from '../lib/http.js';
import { assessQuality, maskRegions, normalizeImage } from './image.js';
import { ocrCapability, runOcr, sensitiveBoxes } from './ocr.js';

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export function photoDir(deviceId: string): string {
  return path.join(config.dataDir, 'photos', deviceId);
}

function rowToPhoto(r: Row): Photo {
  return {
    id: r.id as string,
    mime: 'image/jpeg',
    width: r.width as number,
    height: r.height as number,
    bytes: r.bytes as number,
    quality: JSON.parse(r.quality_json as string) as PhotoQuality,
    sensitiveIdsMasked: r.sensitive_masked as number,
    maskingPerformed: r.masking_performed === 1,
    docType: JSON.parse(r.doc_type_json as string) as Photo['docType'],
    createdAt: r.created_at as string,
  };
}

export function getPhotoRow(deviceId: string, id: string): Row | undefined {
  return getDb().prepare('SELECT * FROM photos WHERE id = ? AND device_id = ?').get(id, deviceId) as Row | undefined;
}

export function getPhoto(deviceId: string, id: string): Photo | null {
  const r = getPhotoRow(deviceId, id);
  return r ? rowToPhoto(r) : null;
}

export function photoFilePath(deviceId: string, row: Row): string {
  return path.join(photoDir(deviceId), row.file_name as string);
}

function localDocType(text: string, meanConf: number, wordCount: number): { value: DocType; confidence: number } {
  const c = classifyText(text);
  if (c.value !== 'unknown') return c;
  if (wordCount > 0 && wordCount < 60 && meanConf < 55) return { value: 'handwritten_note', confidence: 0.45 };
  return { value: 'photo_note', confidence: 0.35 };
}

export interface UploadOptions {
  skipQualityGate: boolean;
  userConfirmedNoIds: boolean;
}

/**
 * Upload pipeline. The original image only ever exists in memory:
 * normalise → quality gate → local OCR → mask Aadhaar/VID → store the masked JPEG.
 */
export async function processUpload(deviceId: string, input: Buffer, mime: string, opts: UploadOptions): Promise<Photo> {
  if (!ACCEPTED.has(mime)) throw new AppError(415, 'UNSUPPORTED_MEDIA', 'Upload a JPEG, PNG or WebP photo');
  let norm: Awaited<ReturnType<typeof normalizeImage>>;
  try {
    norm = await normalizeImage(input);
  } catch {
    throw new AppError(415, 'UNSUPPORTED_MEDIA', 'The image could not be read. Try a JPEG or PNG.');
  }

  const quality = await assessQuality(norm.buffer, norm.width, norm.height);
  if (!quality.ok && !opts.skipQualityGate) {
    throw new AppError(422, 'RETAKE_PHOTO', 'The photo is not clear enough to read reliably. Please retake it.', quality);
  }

  let masked = norm.buffer;
  let maskedCount = 0;
  let maskingPerformed = false;
  let ocrText: string | null = null;
  let meanConf: number | null = null;
  let docType: Photo['docType'] = { value: 'unknown', confidence: 0, engine: 'local' };

  if (ocrCapability().available) {
    try {
      const ocr = await runOcr(norm.buffer);
      const boxes = sensitiveBoxes(ocr.words);
      masked = await maskRegions(norm.buffer, boxes, norm.width, norm.height);
      const red = redactSensitiveIds(ocr.text);
      maskedCount = Math.max(boxes.length, red.count);
      maskingPerformed = true;
      ocrText = red.text;
      meanConf = ocr.meanConf;
      docType = { ...localDocType(red.text, ocr.meanConf, ocr.words.length), engine: 'local' };
    } catch (e) {
      console.warn('[photos] local OCR failed:', (e as Error).message);
    }
  }
  if (!maskingPerformed && !opts.userConfirmedNoIds) {
    throw new AppError(
      422,
      'MASKING_UNAVAILABLE',
      'This server cannot scan the photo for Aadhaar numbers. Make sure none is visible (cover or crop it), then upload again with userConfirmedNoIds=true.',
    );
  }

  const id = `p_${crypto.randomUUID().replace(/-/g, '')}`;
  const fileName = `${id}.jpg`;
  fs.mkdirSync(photoDir(deviceId), { recursive: true });
  fs.writeFileSync(path.join(photoDir(deviceId), fileName), masked, { mode: 0o600 });

  getDb()
    .prepare(`INSERT INTO photos (id, device_id, file_name, width, height, bytes, sha256, quality_json, sensitive_masked,
      masking_performed, doc_type_json, ocr_text, ocr_mean_conf, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(
      id, deviceId, fileName, norm.width, norm.height, masked.length,
      crypto.createHash('sha256').update(masked).digest('hex'), JSON.stringify(quality), maskedCount,
      maskingPerformed ? 1 : 0, JSON.stringify(docType), ocrText, meanConf, nowIso(),
    );
  return getPhoto(deviceId, id)!;
}

export function deletePhoto(deviceId: string, id: string): void {
  const row = getPhotoRow(deviceId, id);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Photo not found');
  const used = getDb().prepare('SELECT id FROM records WHERE photo_id = ? AND deleted_at IS NULL LIMIT 1').get(id);
  if (used) throw new AppError(409, 'CONFLICT', 'A record still uses this photo as evidence');
  fs.rmSync(photoFilePath(deviceId, row), { force: true });
  getDb().prepare('DELETE FROM photos WHERE id = ?').run(id);
}
