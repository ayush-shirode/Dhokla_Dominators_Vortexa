/**
 * Local OCR via the tesseract CLI. Runs on this server only — no third-party calls — so it is
 * used to find and mask Aadhaar/VID numbers before a photo is stored or sent anywhere, and as
 * the offline extraction engine.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findSensitiveTokenRuns } from '@repo/shared';
import { config } from '../config.js';
import type { Box } from './image.js';

export interface OcrWord extends Box {
  text: string;
  conf: number;
  line: string; // block-par-line key
}

export interface OcrResult {
  words: OcrWord[];
  text: string;
  meanConf: number;
}

let cached: { available: boolean; langs: string[] } | null = null;

export function ocrCapability(): { available: boolean; langs: string[] } {
  if (cached) return cached;
  if (config.ocr.disabled) return (cached = { available: false, langs: [] });
  try {
    const r = spawnSync(config.ocr.bin, ['--list-langs', '--tessdata-dir', config.ocr.tessdataDir], { encoding: 'utf8', timeout: 5000 });
    const all = `${r.stdout ?? ''}`.split('\n').slice(1).map((s) => s.trim()).filter(Boolean);
    const wanted = config.ocr.langs.split('+');
    const langs = wanted.filter((l) => all.includes(l) && fs.existsSync(path.join(config.ocr.tessdataDir, `${l}.traineddata`)));
    cached = { available: r.status === 0 && langs.includes('eng'), langs };
  } catch {
    cached = { available: false, langs: [] };
  }
  return cached;
}

export function runOcr(jpeg: Buffer): Promise<OcrResult> {
  const cap = ocrCapability();
  if (!cap.available) return Promise.reject(new Error('Local OCR unavailable'));
  return new Promise((resolve, reject) => {
    const proc = spawn(config.ocr.bin, ['stdin', 'stdout', '--tessdata-dir', config.ocr.tessdataDir, '-l', cap.langs.join('+'), '--psm', '3',
      // TSV via -c flags: the "tsv" config file is not present in a custom tessdata dir.
      '-c', 'tessedit_create_tsv=1', '-c', 'tessedit_create_txt=0'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('OCR timed out'));
    }, 60_000);
    proc.stdout.on('data', (c: Buffer) => chunks.push(c));
    proc.stderr.on('data', () => {});
    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`tesseract exited with ${code}`));
      resolve(parseTsv(Buffer.concat(chunks).toString('utf8')));
    });
    proc.stdin.end(jpeg);
  });
}

function parseTsv(tsv: string): OcrResult {
  const words: OcrWord[] = [];
  const lines = tsv.split('\n').slice(1);
  for (const l of lines) {
    const c = l.split('\t');
    if (c.length < 12 || c[0] !== '5') continue;
    const text = c.slice(11).join('\t').trim();
    const conf = Number(c[10]);
    if (!text || conf < 0) continue;
    words.push({
      left: Number(c[6]),
      top: Number(c[7]),
      width: Number(c[8]),
      height: Number(c[9]),
      conf,
      text,
      line: `${c[2]}-${c[3]}-${c[4]}`,
    });
  }
  const byLine = new Map<string, string[]>();
  for (const w of words) byLine.set(w.line, [...(byLine.get(w.line) ?? []), w.text]);
  const text = [...byLine.values()].map((ws) => ws.join(' ')).join('\n');
  const meanConf = words.length ? words.reduce((s, w) => s + w.conf, 0) / words.length : 0;
  return { words, text, meanConf };
}

/** Boxes covering Aadhaar/VID numbers found in the OCR words (runs of 1–4 numeric tokens). */
export function sensitiveBoxes(words: OcrWord[]): Box[] {
  const boxes: Box[] = [];
  // Search line by line so a number is not stitched together across lines.
  const lines = new Map<string, OcrWord[]>();
  for (const w of words) lines.set(w.line, [...(lines.get(w.line) ?? []), w]);
  for (const ws of lines.values()) {
    for (const run of findSensitiveTokenRuns(ws.map((w) => w.text))) {
      const part = ws.slice(run.start, run.end + 1);
      const left = Math.min(...part.map((w) => w.left));
      const top = Math.min(...part.map((w) => w.top));
      const right = Math.max(...part.map((w) => w.left + w.width));
      const bottom = Math.max(...part.map((w) => w.top + w.height));
      boxes.push({ left, top, width: right - left, height: bottom - top });
    }
  }
  return boxes;
}
