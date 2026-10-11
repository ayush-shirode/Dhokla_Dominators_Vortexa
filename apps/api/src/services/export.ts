import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { SUPPORTED_LANGUAGES, type LanguageCode, type Report } from '@repo/shared';
import { config } from '../config.js';
import { AppError } from '../lib/http.js';

const FONTS = {
  latin: 'NotoSans-Regular.ttf',
  latinBold: 'NotoSans-Bold.ttf',
  deva: 'NotoSansDevanagari-Regular.ttf',
  devaBold: 'NotoSansDevanagari-Bold.ttf',
};

export function pdfLanguages(): Array<'en' | 'hi'> {
  const has = (f: string) => fs.existsSync(path.join(config.fontDir, f));
  const out: Array<'en' | 'hi'> = [];
  if (has(FONTS.latin)) out.push('en');
  if (has(FONTS.latin) && has(FONTS.deva)) out.push('hi');
  return out;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderHtml(report: Report, text: string, lang: LanguageCode): string {
  const rtl = SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RationSaathi report — ${escapeHtml(report.snapshot.period)} (v${report.version})</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&family=Noto+Sans+Bengali&family=Noto+Sans+Tamil&family=Noto+Sans+Telugu&family=Noto+Sans+Gujarati&family=Noto+Sans+Kannada&family=Noto+Sans+Malayalam&family=Noto+Sans+Gurmukhi&family=Noto+Sans+Oriya&family=Noto+Nastaliq+Urdu&family=Noto+Sans+Mono&display=swap">
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #fff; color: #1e2a3a; font-family: 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Bengali', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Gujarati', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Noto Sans Gurmukhi', 'Noto Sans Oriya', 'Noto Nastaliq Urdu', system-ui, sans-serif; }
  main { max-width: 820px; margin: 0 auto; padding: 24px 16px 48px; }
  pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 14px; line-height: 1.6; margin: 0; }
  .bar { display: flex; gap: 8px; margin-bottom: 16px; }
  button { font: inherit; padding: 8px 14px; border: 1px solid #1e2a3a; background: #1e2a3a; color: #fff; border-radius: 4px; cursor: pointer; }
  @media print { .bar { display: none; } main { padding: 0; } }
</style>
</head>
<body>
<main>
  <div class="bar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <pre>${escapeHtml(text)}</pre>
</main>
</body>
</html>`;
}

const DEVA = /[ऀ-ॿ᳐-᳿꣠-ꣿ]/;

/** Splits a line into runs of Devanagari vs other text so each run uses a font that has its glyphs. */
function scriptRuns(line: string): Array<{ text: string; deva: boolean }> {
  const runs: Array<{ text: string; deva: boolean }> = [];
  for (const ch of line) {
    const isDeva = DEVA.test(ch) || (/[\s\d.,:;()\-/"'=+%]/.test(ch) && runs.length > 0 && runs[runs.length - 1]!.deva);
    const last = runs[runs.length - 1];
    if (last && last.deva === isDeva) last.text += ch;
    else runs.push({ text: ch, deva: isDeva });
  }
  return runs;
}

export function renderPdf(report: Report, text: string, lang: 'en' | 'hi'): Promise<Buffer> {
  if (!pdfLanguages().includes(lang)) {
    throw new AppError(422, 'UNSUPPORTED_LANGUAGE', `PDF export in ${lang} is not available on this server (fonts not installed). Use format=html and print to PDF.`);
  }
  const font = (f: string) => path.join(config.fontDir, f);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 56, bottom: 56, left: 56, right: 56 },
      info: { Title: `RationSaathi report ${report.snapshot.period} v${report.version}`, Creator: 'RationSaathi', Producer: 'RationSaathi' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('latin', font(FONTS.latin));
    doc.registerFont('latinBold', fs.existsSync(font(FONTS.latinBold)) ? font(FONTS.latinBold) : font(FONTS.latin));
    if (lang === 'hi') {
      doc.registerFont('deva', font(FONTS.deva));
      doc.registerFont('devaBold', fs.existsSync(font(FONTS.devaBold)) ? font(FONTS.devaBold) : font(FONTS.deva));
    }

    const lines = text.split('\n');
    lines.forEach((line, i) => {
      const isHeading = i === 0 || /^\d\. /.test(line);
      const size = i === 0 ? 14 : isHeading ? 11.5 : 10;
      if (isHeading && i > 0) doc.moveDown(0.4);
      if (!line.trim()) {
        doc.moveDown(0.5);
        return;
      }
      if (/^─+$/.test(line.trim())) {
        const y = doc.y + 4;
        doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).lineWidth(0.6).strokeColor('#555').stroke();
        doc.moveDown(0.6);
        return;
      }
      const runs = lang === 'hi' ? scriptRuns(line) : [{ text: line, deva: false }];
      runs.forEach((run, j) => {
        const f = run.deva ? (isHeading ? 'devaBold' : 'deva') : isHeading ? 'latinBold' : 'latin';
        doc.font(f).fontSize(size).text(run.text, { continued: j < runs.length - 1, lineGap: 2 });
      });
    });
    doc.end();
  });
}
