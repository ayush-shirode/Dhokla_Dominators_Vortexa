import { Router } from 'express';
import { z } from 'zod';
import { buildReadback, buildReportSpokenSummary, isTemplateLanguage, type LanguageCode } from '@repo/shared';
import { AppError, deviceOf, h, ok, param, parse } from '../lib/http.js';
import { languageSchema } from '../lib/schemas.js';
import { renderHtml, renderPdf } from '../services/export.js';
import { reportTextIn, requireReport } from '../services/reports.js';
import { getFiling } from '../repo/checks.js';

export const reportsRouter = Router();

reportsRouter.get('/reports/:id', h((req, res) => ok(res, requireReport(deviceOf(req), param(req, 'id')))));

const exportQuery = z.object({
  format: z.enum(['txt', 'html', 'pdf', 'json']).default('txt'),
  lang: languageSchema.optional(),
});

reportsRouter.get('/reports/:id/export', h(async (req, res) => {
  const d = deviceOf(req);
  const report = requireReport(d, param(req, 'id'));
  const q = parse(exportQuery, req.query);
  const base = `rationsaathi-report-${report.snapshot.period}-v${report.version}`;
  const attach = (ext: string, lang: string) => res.setHeader('Content-Disposition', `attachment; filename="${base}-${lang}.${ext}"`);
  res.setHeader('Cache-Control', 'no-store');

  if (q.format === 'json') {
    attach('json', report.language);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify({ report, filing: getFiling(d, report.checkId) }, null, 2));
    return;
  }
  const { text, language } = reportTextIn(d, report, q.lang);
  if (q.format === 'txt') {
    attach('txt', language);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(text);
  } else if (q.format === 'html') {
    attach('html', language);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderHtml(report, text, language));
  } else {
    if (!isTemplateLanguage(language)) {
      throw new AppError(422, 'UNSUPPORTED_LANGUAGE', 'PDF export is available in English and Hindi. Use format=html and print to PDF for other languages.');
    }
    const pdf = await renderPdf(report, text, language);
    attach('pdf', language);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  }
}));

reportsRouter.get('/reports/:id/readback', h((req, res) => {
  const d = deviceOf(req);
  const report = requireReport(d, param(req, 'id'));
  const lang: LanguageCode = parse(z.object({ lang: languageSchema.optional() }), req.query).lang ?? report.language;
  if (isTemplateLanguage(lang)) return ok(res, buildReportSpokenSummary(report.snapshot, lang));
  const { text } = reportTextIn(d, report, lang);
  ok(res, buildReadback(text, lang));
}));
