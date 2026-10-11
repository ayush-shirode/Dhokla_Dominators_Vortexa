import crypto from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { RULE_DEFAULTS, checkNeutrality } from '@repo/shared';
import { createApp } from '../src/app.js';
import { openDb, setDb } from '../src/db/index.js';
import { ocrCapability } from '../src/services/ocr.js';

setDb(openDb(':memory:'));
const app = createApp();
const API = '/api/v1';
const uid = () => crypto.randomUUID();

async function newDevice() {
  const r = await request(app).post(`${API}/devices`).send({});
  expect(r.status).toBe(201);
  const token = r.body.data.token as string;
  const auth = { Authorization: `Bearer ${token}` };
  return {
    token,
    get: (p: string) => request(app).get(`${API}${p}`).set(auth),
    put: (p: string, b: unknown) => request(app).put(`${API}${p}`).set(auth).send(b as object),
    post: (p: string, b: unknown = {}) => request(app).post(`${API}${p}`).set(auth).send(b as object),
    del: (p: string) => request(app).delete(`${API}${p}`).set(auth),
    upload: (buf: Buffer, q = '') => request(app).post(`${API}/photos${q}`).set(auth).attach('image', buf, { filename: 'p.jpg', contentType: 'image/jpeg' }),
  };
}
type Device = Awaited<ReturnType<typeof newDevice>>;

const household = (over: object = {}) => ({
  label: 'Test household',
  cardType: 'PHH',
  members: 4,
  rule: { ...RULE_DEFAULTS[0]! },
  ruleConfirmed: true,
  stateCode: 'MH',
  district: 'Pune',
  fpsNo: '0417',
  fpsName: 'Shop 17',
  ...over,
});

async function setup(dev: Device) {
  const hh = uid();
  const ck = uid();
  expect((await dev.put(`/households/${hh}`, household())).status).toBe(201);
  expect((await dev.put(`/checks/${ck}`, { householdId: hh, period: '2026-10' })).status).toBe(201);
  const record = (body: object, id = uid()) =>
    dev.put(`/records/${id}`, { checkId: ck, unclear: false, createdVia: 'manual', confirmed: true, ...body });
  return { hh, ck, record };
}

async function receiptImage(lines: string[]): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${120 + lines.length * 90}">
    <rect width="100%" height="100%" fill="#fff"/>
    ${lines.map((l, i) => `<text x="60" y="${110 + i * 90}" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-size="54" fill="#000">${l}</text>`).join('')}
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

describe('auth & meta', () => {
  it('serves public meta and rejects unauthenticated data calls', async () => {
    const meta = await request(app).get(`${API}/meta`);
    expect(meta.body.data.ruleDefaults.map((r: { cardType: string }) => r.cardType)).toEqual(['PHH', 'AAY']);
    expect(meta.body.data.capabilities.cloudAi).toBe(false);
    expect((await request(app).get(`${API}/households`)).status).toBe(401);
    expect((await request(app).get(`${API}/households`).set('Authorization', 'Bearer not-a-real-token-xxxxxxxx')).status).toBe(401);
  });
  it('isolates devices from each other', async () => {
    const a = await newDevice();
    const b = await newDevice();
    const { hh } = await setup(a);
    expect((await b.get(`/households/${hh}`)).status).toBe(404);
    expect((await b.put(`/households/${hh}`, household())).status).toBe(409);
  });
});

describe('rule confirmation (P1)', () => {
  it('blocks the summary until confirmed and un-confirms on edits', async () => {
    const dev = await newDevice();
    const hh = uid();
    const ck = uid();
    await dev.put(`/households/${hh}`, household({ ruleConfirmed: false }));
    await dev.put(`/checks/${ck}`, { householdId: hh, period: '2026-10' });
    expect((await dev.get(`/checks/${ck}/summary`)).body.error.code).toBe('RULE_NOT_CONFIRMED');
    expect((await dev.post(`/checks/${ck}/reports`)).status).toBe(409);

    const confirmed = await dev.put(`/households/${hh}`, household());
    expect(confirmed.body.data.ruleConfirmed).toBe(true);
    const at = confirmed.body.data.ruleConfirmedAt;
    expect((await dev.get(`/checks/${ck}/summary`)).body.data.entitlement.formula).toBe('5 kg × 4 members = 20 kg');

    // Re-sending the same confirmed rule keeps the original confirmation time.
    expect((await dev.put(`/households/${hh}`, household())).body.data.ruleConfirmedAt).toBe(at);
    // Changing members without re-confirming clears it.
    const edited = await dev.put(`/households/${hh}`, household({ members: 5, ruleConfirmed: false }));
    expect(edited.body.data.ruleConfirmed).toBe(false);
  });
  it('validates rule fields', async () => {
    const dev = await newDevice();
    const r = await dev.put(`/households/${uid()}`, household({ members: 0, rule: { ...RULE_DEFAULTS[0]!, perUnitKg: 5.0001 } }));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('VALIDATION_FAILED');
    expect(r.body.error.details.map((d: { path: string }) => d.path)).toEqual(expect.arrayContaining(['members', 'rule.perUnitKg']));
  });
});

describe('card name', () => {
  it('stores the state\'s card name and prints it in the saved report', async () => {
    const dev = await newDevice();
    const hh = uid();
    const ck = uid();
    const put = await dev.put(`/households/${hh}`, household({ cardType: 'CUSTOM', cardName: 'APL (Farmer)', rule: { ...RULE_DEFAULTS[0]!, perUnitKg: 3, sourceTitle: 'Maharashtra order', sourceNote: 'typed by the household' } }));
    expect(put.body.data.cardName).toBe('APL (Farmer)');
    await dev.put(`/checks/${ck}`, { householdId: hh, period: '2026-10' });
    const rep = (await dev.post(`/checks/${ck}/reports`, { language: 'en' })).body.data;
    expect(rep.snapshot.household.cardName).toBe('APL (Farmer)');
    expect(rep.text).toContain('CUSTOM — APL (Farmer)');
  });
});

describe('records (P3, P4, P6)', () => {
  it('enforces evidence rules and confirmation', async () => {
    const dev = await newDevice();
    const { record } = await setup(dev);
    expect((await record({ date: '2026-10-05', quantityKg: 5, evidenceType: 'none', evidenceContent: 'x' })).status).toBe(400);
    expect((await record({ date: '2026-10-05', quantityKg: 5, evidenceType: 'photo' })).status).toBe(400);
    expect((await record({ date: '2026-10-05', quantityKg: 5, evidenceType: 'sms' })).status).toBe(400);
    expect((await record({ date: '2026-10-05', quantityKg: 5, evidenceType: 'receipt', evidenceContent: 'TX1', confirmed: false })).status).toBe(400);
    expect((await record({ date: '2099-01-01', quantityKg: 5, evidenceType: 'receipt', evidenceContent: 'TX1' })).status).toBe(400);
  });
  it('rejects accusatory notes but keeps verbatim SMS text with a warning', async () => {
    const dev = await newDevice();
    const { record } = await setup(dev);
    const note = await record({ date: '2026-10-05', quantityKg: 4, evidenceType: 'note', evidenceContent: 'The dealer stole 5 kg' });
    expect(note.status).toBe(422);
    expect(note.body.error.code).toBe('NEUTRALITY_CHECK_FAILED');
    const sms = await record({ date: '2026-10-05', quantityKg: 4, evidenceType: 'sms', evidenceContent: 'Rice 4 kg collected. Beware of fraud calls.' });
    expect(sms.status).toBe(201);
    expect(sms.body.warnings.map((w: { code: string }) => w.code)).toContain('NEUTRALITY_TERMS');
  });
  it('redacts Aadhaar numbers from evidence text', async () => {
    const dev = await newDevice();
    const { record } = await setup(dev);
    const r = await record({ date: '2026-10-05', quantityKg: 4, evidenceType: 'sms', evidenceContent: 'UID 2345 6789 0124 got 4 kg' });
    expect(r.body.data.evidenceContent).toBe('UID [ID REMOVED] got 4 kg');
    expect(r.body.warnings.map((w: { code: string }) => w.code)).toContain('SENSITIVE_ID_REDACTED');
  });
  it('computes the acceptance-scenario summary on the server', async () => {
    const dev = await newDevice();
    const { ck, record } = await setup(dev);
    await record({ date: '2026-10-05', quantityKg: 12, evidenceType: 'sms', evidenceContent: 'Rice 12kg' });
    await record({ date: '2026-10-08', quantityKg: 4, evidenceType: 'note', evidenceContent: 'Got 4 kg, told rest next week' });
    const none = await record({ date: '2026-10-09', quantityKg: 3, evidenceType: 'none' });
    expect(none.body.data.labels).toEqual(['unrecorded']);
    const late = await record({ date: '2026-09-30', quantityKg: 1, evidenceType: 'receipt', evidenceContent: 'TX9' });
    expect(late.body.data.labels).toEqual(['late']);
    const s = (await dev.get(`/checks/${ck}/summary`)).body.data;
    expect(s.totals.countedKg).toBe(17);
    expect(s.differenceKg).toBe(3);
    expect(s.labels).toEqual(['shortfall', 'late', 'unrecorded']);
  });
});

describe('reports, grievance and filing (P6, P7)', () => {
  it('runs the whole flow', async () => {
    const dev = await newDevice();
    const { ck, record } = await setup(dev);
    await record({ date: '2026-10-05', quantityKg: 12, evidenceType: 'sms', evidenceContent: 'Rice 12kg dt 05-10-26' });
    await record({ date: '2026-10-09', quantityKg: 3, evidenceType: 'none' });

    const rep = await dev.post(`/checks/${ck}/reports`, { language: 'en' });
    expect(rep.status).toBe(201);
    const report = rep.body.data;
    expect(report.version).toBe(1);
    expect(report.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(report.snapshot.summary.differenceKg).toBe(8);
    expect(report.text).toContain('Counted received total: 12 kg');
    expect((await dev.get(`/checks/${ck}`)).body.data.status).toBe('reported');

    const g = (await dev.get(`/checks/${ck}/grievance`)).body.data;
    expect(g.rationCardNo).toBeNull();
    expect(g.copyFields.find((f: { key: string }) => f.key === 'rationCardNo')).toMatchObject({ clientOnly: true, value: null });
    expect(g.category.code).toBe('NOT_GETTING_NFSA_QUANTITY');
    expect(g.stateName).toBe('Maharashtra');
    expect(g.portal.url).toMatch(/^https:\/\//);
    expect(g.languageAdvice.portalAcceptsVernacular).toBeNull();
    expect(checkNeutrality(g.description).ok).toBe(true);
    expect(g.description).toContain('has not been established');

    const bad = await dev.put(`/checks/${ck}/grievance`, { description: 'The shopkeeper is corrupt and cheated us out of 8 kg this month.' });
    expect(bad.status).toBe(422);
    const hi = (await dev.post(`/checks/${ck}/grievance/regenerate`, { language: 'hi' })).body;
    expect(hi.data.descriptionLanguage).toBe('hi');
    expect(hi.warnings[0].code).toBe('LANGUAGE_ACCEPTANCE_UNKNOWN');
    const rb = (await dev.get(`/checks/${ck}/grievance/readback`)).body.data;
    expect(rb.speechLang).toBe('hi-IN');
    expect(rb.segments.length).toBeGreaterThan(1);

    const filing = await dev.put(`/checks/${ck}/filing`, { referenceNumber: 'NFSA/2026/000123', filedDate: '2026-10-11' });
    expect(filing.status).toBe(200);
    expect(filing.body.data.reportId).toBe(report.id);
    expect((await dev.get(`/checks/${ck}`)).body.data.status).toBe('filed');

    const txt = await dev.get(`/reports/${report.id}/export?format=txt`);
    expect(txt.headers['content-type']).toContain('text/plain');
    expect(txt.text).toContain('NFSA/2026/000123');
    const hiTxt = await dev.get(`/reports/${report.id}/export?format=txt&lang=hi`);
    expect(hiTxt.text).toContain('पात्रता');
    const html = await dev.get(`/reports/${report.id}/export?format=html&lang=hi`);
    expect(html.text).toContain('lang="hi"');
    for (const lang of ['en', 'hi']) {
      const pdf = await dev.get(`/reports/${report.id}/export?format=pdf&lang=${lang}`).buffer(true).parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
      expect(pdf.status).toBe(200);
      expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
    }
    expect((await dev.get(`/reports/${report.id}/export?format=txt&lang=ta`)).body.error.code).toBe('UNSUPPORTED_LANGUAGE');
    expect((await dev.get(`/reports/${report.id}/readback?lang=en`)).body.data.segments[0]).toContain('October 2026');

    // A new report version keeps old ones immutable.
    await record({ date: '2026-10-10', quantityKg: 8, evidenceType: 'receipt', evidenceContent: 'TX77' });
    const v2 = (await dev.post(`/checks/${ck}/reports`)).body.data;
    expect(v2.version).toBe(2);
    expect(v2.snapshot.summary.status).toBe('matches');
    expect((await dev.get(`/reports/${report.id}`)).body.data.snapshot.summary.differenceKg).toBe(8);
  });
});

describe('AI drafts (P4) — local engines, no cloud', () => {
  it('extract-text → review → confirm; unchecked low-confidence fields make the record Unclear', async () => {
    const dev = await newDevice();
    const { ck } = await setup(dev);
    const d = await dev.post('/ai/extract-text', { text: 'Rice 5 kg given. Txn No 4411', sourceType: 'sms', checkId: ck });
    expect(d.status).toBe(201);
    const draft = d.body.data;
    expect(draft.status).toBe('pending');
    expect(draft.engine).toBe('local');
    expect(draft.result.fields.quantityKg.value).toBe(5);
    expect(draft.result.lowConfidenceFields).toContain('date'); // no date in the text

    // Nothing is saved before confirmation.
    expect((await dev.get(`/checks/${ck}/records`)).body.data).toHaveLength(0);

    const recordId = uid();
    // User accepts but does not fill a date of their own → still the AI's null? No: user must give a date; give one and keep quantity.
    const c = await dev.post(`/ai/drafts/${draft.id}/confirm`, {
      record: { id: recordId, checkId: ck, date: '2026-10-06', quantityKg: 5, evidenceType: 'sms', evidenceContent: 'Rice 5 kg given. Txn No 4411', unclear: false, createdVia: 'manual', confirmed: true },
    });
    expect(c.status).toBe(200);
    expect(c.body.data.record.createdVia).toBe('ocr');
    expect(c.body.data.record.aiAssist.lowConfidenceFields).toEqual([]); // user supplied the date → resolved
    expect(c.body.data.record.unclear).toBe(false);
    expect((await dev.post(`/ai/drafts/${draft.id}/confirm`, {})).body.error.code).toBe('DRAFT_NOT_PENDING');
  });

  it('voice: "half" is computed from the confirmed entitlement and stays unclear unless verified', async () => {
    const dev = await newDevice();
    const { ck } = await setup(dev);
    const d = (await dev.post('/ai/voice/parse', { transcript: 'on the 5th I only got half, no slip', language: 'en', checkId: ck })).body.data;
    expect(d.result.fields.quantityKg.value).toBe(10);
    expect(d.result.fields.date.value).toBe('2026-10-05');
    expect(d.readBack.text).toContain('Is that right?');
    const base = { checkId: ck, date: '2026-10-05', quantityKg: 10, evidenceType: 'note', evidenceContent: 'Voice: got about half on 5th', unclear: false, createdVia: 'voice', confirmed: true };
    const c = await dev.post(`/ai/drafts/${d.id}/confirm`, { record: { id: uid(), ...base } });
    expect(c.body.data.record.unclear).toBe(true);
    expect(c.body.warnings.map((w: { code: string }) => w.code)).toContain('LOW_CONFIDENCE');

    const d2 = (await dev.post('/ai/voice/parse', { transcript: 'on the 5th I only got half', language: 'en', checkId: ck })).body.data;
    const c2 = await dev.post(`/ai/drafts/${d2.id}/confirm`, {
      record: { id: uid(), ...base, aiAssist: { draftId: null, lowConfidenceFields: [], userVerifiedLowConfidence: true } },
    });
    expect(c2.body.data.record.unclear).toBe(false);
  });

  it('translation needs explicit cloud consent and a configured cloud', async () => {
    const dev = await newDevice();
    const { ck } = await setup(dev);
    expect((await dev.post('/ai/translate', { purpose: 'grievance_description', targetLanguage: 'ta', checkId: ck })).body.error.code).toBe('CLOUD_CONSENT_REQUIRED');
    expect((await dev.post('/ai/translate', { purpose: 'grievance_description', targetLanguage: 'ta', checkId: ck, allowCloud: true })).body.error.code).toBe('AI_UNAVAILABLE');
  });

  it('chat redirects cause questions and answers process questions', async () => {
    const dev = await newDevice();
    const g = (await dev.post('/ai/chat', { messages: [{ role: 'user', content: 'Why did I get less? Is the dealer cheating?' }], language: 'en' })).body.data;
    expect(g.source).toBe('guardrail');
    expect(checkNeutrality(g.reply).ok).toBe(true);
    const f = (await dev.post('/ai/chat', { messages: [{ role: 'user', content: 'What is a DGRO?' }], language: 'hi' })).body.data;
    expect(f.source).toBe('faq');
    expect(f.faqId).toBe('what-is-dgro');
  });
});

describe('photos: quality gate, masking, local OCR', () => {
  it('asks for a retake on a featureless/blurry photo', async () => {
    const dev = await newDevice();
    const blank = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#808080' } }).jpeg().toBuffer();
    const r = await dev.upload(blank);
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('RETAKE_PHOTO');
    expect(r.body.error.details.issues).toEqual(expect.arrayContaining(['blurry', 'low_contrast']));
  });

  it.runIf(ocrCapability().available)('masks an Aadhaar number before storage and reads the slip locally', async () => {
    const dev = await newDevice();
    const { ck } = await setup(dev);
    const img = await receiptImage(['FAIR PRICE SHOP 0417', 'Date: 05/10/2026', 'Rice 3.000 Kg', 'Wheat 2.000 Kg', 'Txn No 88213', 'Aadhaar 2345 6789 0124']);
    const up = await dev.upload(img);
    expect(up.status).toBe(201);
    const photo = up.body.data;
    expect(photo.maskingPerformed).toBe(true);
    expect(photo.sensitiveIdsMasked).toBeGreaterThanOrEqual(1);
    expect(photo.docType.value).toBe('receipt');

    const ocr = (await dev.post('/ai/ocr', { photoId: photo.id, checkId: ck })).body.data;
    expect(ocr.kind).toBe('ocr');
    expect(ocr.result.fields.quantityKg.value).toBe(5);
    expect(ocr.result.fields.date.value).toBe('2026-10-05');
    expect(ocr.result.extractedText).not.toContain('2345 6789 0124');

    const bytes = await dev.get(`/photos/${photo.id}`).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(bytes.headers['content-type']).toBe('image/jpeg');
    expect((bytes.body as Buffer).length).toBeGreaterThan(1000);

    const c = await dev.post(`/ai/drafts/${ocr.id}/confirm`, {
      record: { id: uid(), checkId: ck, date: '2026-10-05', quantityKg: 5, evidenceType: 'receipt', evidenceContent: 'Txn No 88213', unclear: false, createdVia: 'ocr', confirmed: true },
    });
    expect(c.body.data.record.photoId).toBe(photo.id);
    expect((await dev.del(`/photos/${photo.id}`)).status).toBe(409); // still evidence
  });
});

describe('offline sync', () => {
  it('applies a batch in order, ignores stale writes, and returns deltas', async () => {
    const dev = await newDevice();
    const hh = uid();
    const ck = uid();
    const rc = uid();
    const t0 = '2026-10-11T08:00:00.000Z';
    const before = new Date(Date.now() - 1000).toISOString();
    const res = await dev.post('/sync/batch', {
      operations: [
        { opId: '1', entity: 'household', action: 'put', id: hh, body: household(), clientUpdatedAt: t0 },
        { opId: '2', entity: 'check', action: 'put', id: ck, body: { householdId: hh, period: '2026-10' }, clientUpdatedAt: t0 },
        { opId: '3', entity: 'record', action: 'put', id: rc, body: { checkId: ck, date: '2026-10-03', quantityKg: 7, evidenceType: 'receipt', evidenceContent: 'T1', unclear: false, createdVia: 'manual', confirmed: true }, clientUpdatedAt: t0 },
        { opId: '4', entity: 'record', action: 'put', id: uid(), body: { checkId: ck, date: '2026-10-03', quantityKg: 7, evidenceType: 'note', evidenceContent: 'they stole it', unclear: false, createdVia: 'manual', confirmed: true }, clientUpdatedAt: t0 },
        { opId: '5', entity: 'record', action: 'put', id: rc, body: { checkId: ck, date: '2026-10-03', quantityKg: 1, evidenceType: 'receipt', evidenceContent: 'T1', unclear: false, createdVia: 'manual', confirmed: true }, clientUpdatedAt: '2026-10-11T07:00:00.000Z' },
      ],
    });
    expect(res.body.data.results.map((r: { status: string }) => r.status)).toEqual(['applied', 'applied', 'applied', 'error', 'stale']);
    expect(res.body.data.results[3].error.code).toBe('NEUTRALITY_CHECK_FAILED');
    expect(res.body.data.results[4].entity.quantityKg).toBe(7);

    await dev.post('/sync/batch', { operations: [{ opId: '6', entity: 'record', action: 'delete', id: rc, clientUpdatedAt: t0 }] });
    const snap = (await dev.get(`/sync/snapshot?since=${encodeURIComponent(before)}`)).body.data;
    expect(snap.households).toHaveLength(1);
    expect(snap.deleted).toEqual([expect.objectContaining({ entity: 'record', id: rc })]);
  });
});

describe('channel directory & device deletion', () => {
  it('lists unverified seed channels and protects admin edits', async () => {
    const list = (await request(app).get(`${API}/grievance-channels?stateCode=MH`)).body.data;
    expect(list.length).toBeGreaterThanOrEqual(5);
    const national = list.filter((c: { scope: string }) => c.scope === 'national');
    expect(national.every((c: { verificationStatus: string; lastVerified: string | null }) => c.verificationStatus === 'unverified' && c.lastVerified === null)).toBe(true);
    // State card portals come from the official NFSA list, with what we saw when testing each link.
    const portal = list.find((c: { kind: string }) => c.kind === 'card_portal');
    expect(portal).toMatchObject({ stateCode: 'MH', sourceUrl: 'https://nfsa.gov.in/portal/Ration_Card_State_Portals_AA' });
    expect(portal.value).toBe('https://rcms.mahafood.gov.in/Show_Reports.aspx?RID=98');
    const all = (await request(app).get(`${API}/grievance-channels`)).body.data;
    const cardPortals = all.filter((c: { kind: string }) => c.kind === 'card_portal');
    expect(cardPortals).toHaveLength(35);
    for (const c of cardPortals) {
      expect(c.value).toMatch(/^https?:\/\/[^\s#]+$/);
      expect(c.value).not.toMatch(/\(X\(|S\(/); // no session tokens in stored links
      expect(['verified', 'needs_review']).toContain(c.verificationStatus);
      expect(c.verificationStatus === 'verified').toBe(c.lastVerified !== null);
    }
    const body = { scope: 'state', stateCode: 'MH', name: 'Test helpline', kind: 'helpline', value: '1800-000-000', notes: '', acceptedLanguages: ['en', 'mr'], sourceUrl: null, sourceNote: 'test', lastVerified: null, verificationStatus: 'unverified' };
    expect((await request(app).put(`${API}/grievance-channels/mh-test`).send(body)).status).toBe(403);
    expect((await request(app).put(`${API}/grievance-channels/mh-test`).set('X-Admin-Token', 'test-admin-token').send(body)).status).toBe(201);
  });
  it('deletes everything for a device', async () => {
    const dev = await newDevice();
    await setup(dev);
    expect((await dev.del('/devices/me')).status).toBe(200);
    expect((await dev.get('/households')).status).toBe(401);
  });
});
