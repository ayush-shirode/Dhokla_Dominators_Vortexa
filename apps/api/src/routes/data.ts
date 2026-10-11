/** Households, checks, records, summary, reports (create/list), grievance and filing. */
import { Router, type Response } from 'express';
import { z } from 'zod';
import { buildReadback } from '@repo/shared';
import { deviceOf, h, notFound, ok, param, parse } from '../lib/http.js';
import { checkInputSchema, filingInputSchema, grievanceInputSchema, householdInputSchema, recordInputSchema, templateLanguageSchema } from '../lib/schemas.js';
import {
  deleteCheck,
  deleteRecord,
  getCheck,
  getFiling,
  getRecord,
  listChecks,
  listRecords,
  putCheck,
  putRecord,
  requireCheck,
  summaryFor,
} from '../repo/checks.js';
import { deleteHousehold, getHousehold, listHouseholds, putHousehold, type PutResult } from '../repo/households.js';
import {
  deleteFiling,
  getOrCreateGrievance,
  grievanceDescription,
  putFiling,
  regenerateGrievance,
  updateGrievance,
} from '../services/grievance.js';
import { createReport, listReports } from '../services/reports.js';

export const dataRouter = Router();

function sendPut<T>(res: Response, r: PutResult<T>): void {
  ok(res, r.entity, { status: r.created ? 201 : 200, warnings: r.warnings });
}

// --- Households ---------------------------------------------------------------

dataRouter.get('/households', h((req, res) => ok(res, listHouseholds(deviceOf(req)))));

dataRouter.get('/households/:id', h((req, res) => {
  const hh = getHousehold(deviceOf(req), param(req, 'id'));
  if (!hh) throw notFound('Household');
  ok(res, hh);
}));

dataRouter.put('/households/:id', h((req, res) => {
  sendPut(res, putHousehold(deviceOf(req), param(req, 'id'), parse(householdInputSchema, req.body)));
}));

dataRouter.delete('/households/:id', h((req, res) => {
  deleteHousehold(deviceOf(req), param(req, 'id'));
  ok(res, { deleted: true });
}));

// --- Checks -------------------------------------------------------------------

dataRouter.get('/checks', h((req, res) => {
  const householdId = typeof req.query.householdId === 'string' ? req.query.householdId : undefined;
  ok(res, listChecks(deviceOf(req), householdId));
}));

dataRouter.get('/checks/:id', h((req, res) => {
  const c = getCheck(deviceOf(req), param(req, 'id'));
  if (!c) throw notFound('Check');
  ok(res, c);
}));

dataRouter.put('/checks/:id', h((req, res) => {
  sendPut(res, putCheck(deviceOf(req), param(req, 'id'), parse(checkInputSchema, req.body)));
}));

dataRouter.delete('/checks/:id', h((req, res) => {
  deleteCheck(deviceOf(req), param(req, 'id'));
  ok(res, { deleted: true });
}));

dataRouter.get('/checks/:id/records', h((req, res) => {
  const d = deviceOf(req);
  const id = param(req, 'id');
  requireCheck(d, id);
  ok(res, listRecords(d, id));
}));

dataRouter.get('/checks/:id/summary', h((req, res) => ok(res, summaryFor(deviceOf(req), param(req, 'id')))));

// --- Records ------------------------------------------------------------------

dataRouter.get('/records/:id', h((req, res) => {
  const r = getRecord(deviceOf(req), param(req, 'id'));
  if (!r) throw notFound('Record');
  ok(res, r);
}));

dataRouter.put('/records/:id', h((req, res) => {
  sendPut(res, putRecord(deviceOf(req), param(req, 'id'), parse(recordInputSchema, req.body)));
}));

dataRouter.delete('/records/:id', h((req, res) => {
  deleteRecord(deviceOf(req), param(req, 'id'));
  ok(res, { deleted: true });
}));

// --- Reports (per check) ------------------------------------------------------

const createReportBody = z.object({ language: templateLanguageSchema.default('en') });

dataRouter.post('/checks/:id/reports', h((req, res) => {
  const { language } = parse(createReportBody, req.body ?? {});
  ok(res, createReport(deviceOf(req), param(req, 'id'), language), { status: 201 });
}));

dataRouter.get('/checks/:id/reports', h((req, res) => {
  const d = deviceOf(req);
  const id = param(req, 'id');
  requireCheck(d, id);
  ok(res, listReports(d, id));
}));

// --- Grievance helper -----------------------------------------------------------

dataRouter.get('/checks/:id/grievance', h((req, res) => {
  const { draft, warnings } = getOrCreateGrievance(deviceOf(req), param(req, 'id'));
  ok(res, draft, { warnings });
}));

dataRouter.put('/checks/:id/grievance', h((req, res) => {
  const { draft, warnings } = updateGrievance(deviceOf(req), param(req, 'id'), parse(grievanceInputSchema, req.body));
  ok(res, draft, { warnings });
}));

dataRouter.post('/checks/:id/grievance/regenerate', h((req, res) => {
  const { language } = parse(createReportBody, req.body ?? {});
  const { draft, warnings } = regenerateGrievance(deviceOf(req), param(req, 'id'), language);
  ok(res, draft, { warnings });
}));

dataRouter.get('/checks/:id/grievance/readback', h((req, res) => {
  const { text, language } = grievanceDescription(deviceOf(req), param(req, 'id'));
  ok(res, buildReadback(text, language));
}));

// --- Filing -------------------------------------------------------------------

dataRouter.get('/checks/:id/filing', h((req, res) => {
  const d = deviceOf(req);
  const id = param(req, 'id');
  requireCheck(d, id);
  ok(res, getFiling(d, id));
}));

dataRouter.put('/checks/:id/filing', h((req, res) => {
  ok(res, putFiling(deviceOf(req), param(req, 'id'), parse(filingInputSchema, req.body)));
}));

dataRouter.delete('/checks/:id/filing', h((req, res) => {
  deleteFiling(deviceOf(req), param(req, 'id'));
  ok(res, { deleted: true });
}));
