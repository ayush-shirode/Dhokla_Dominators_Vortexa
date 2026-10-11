import sharp from 'sharp';
import type { PhotoQuality, QualityIssue } from '@repo/shared';
import { config } from '../config.js';

/**
 * Normalises an upload: applies EXIF orientation, downsizes to ≤ 2000 px on the long side,
 * re-encodes as JPEG. sharp drops all metadata (EXIF/GPS) unless asked to keep it.
 */
export async function normalizeImage(input: Buffer): Promise<{ buffer: Buffer; width: number; height: number }> {
  const out = await sharp(input, { failOn: 'error' })
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { buffer: out.data, width: out.info.width, height: out.info.height };
}

/**
 * Cheap, deterministic photo-quality checks:
 *  - sharpness: variance of the Laplacian on a 1000 px greyscale copy (low = blurry)
 *  - brightness: mean luminance (0–255)
 *  - contrast: luminance standard deviation
 */
export async function assessQuality(jpeg: Buffer, width: number, height: number): Promise<PhotoQuality> {
  const { data, info } = await sharp(jpeg)
    .greyscale()
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const hgt = info.height;
  const n = w * hgt;

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const v = data[i]!;
    sum += v;
    sumSq += v * v;
  }
  const brightness = sum / n;
  const contrast = Math.sqrt(Math.max(0, sumSq / n - brightness * brightness));

  let lapSum = 0;
  let lapSq = 0;
  let count = 0;
  for (let y = 1; y < hgt - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = data[i - w]! + data[i + w]! + data[i - 1]! + data[i + 1]! - 4 * data[i]!;
      lapSum += lap;
      lapSq += lap * lap;
      count++;
    }
  }
  const lapMean = count ? lapSum / count : 0;
  const sharpness = count ? lapSq / count - lapMean * lapMean : 0;

  const q = config.quality;
  const issues: QualityIssue[] = [];
  if (Math.min(width, height) < q.minShortSide) issues.push('too_small');
  if (brightness < q.minBrightness) issues.push('too_dark');
  // A white slip or SMS screenshot is bright but keeps contrast; washed-out text loses it.
  if (brightness > q.maxBrightness && contrast < q.minContrast * 1.5) issues.push('overexposed');
  if (contrast < q.minContrast) issues.push('low_contrast');
  if (sharpness < q.minSharpness) issues.push('blurry');

  return {
    ok: issues.length === 0,
    issues,
    metrics: {
      sharpness: Math.round(sharpness * 10) / 10,
      brightness: Math.round(brightness * 10) / 10,
      contrast: Math.round(contrast * 10) / 10,
      width,
      height,
    },
  };
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Paints solid black rectangles over the given regions (with padding). */
export async function maskRegions(jpeg: Buffer, boxes: Box[], width: number, height: number): Promise<Buffer> {
  if (boxes.length === 0) return jpeg;
  const pad = 6;
  const rects = boxes
    .map((b) => {
      const x = Math.max(0, b.left - pad);
      const y = Math.max(0, b.top - pad);
      const w = Math.min(width - x, b.width + 2 * pad);
      const hh = Math.min(height - y, b.height + 2 * pad);
      return `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="#000"/>`;
    })
    .join('');
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects}</svg>`);
  return sharp(jpeg).composite([{ input: svg, top: 0, left: 0 }]).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}
