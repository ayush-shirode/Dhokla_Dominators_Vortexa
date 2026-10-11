import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Household,
  Check,
  DistributionRecord,
  Report,
  Filing,
  SyncOperation,
} from '@repo/shared';

interface RationSaathiDB extends DBSchema {
  devices: {
    key: string;
    value: { deviceId: string; token: string; registeredAt: string };
  };
  households: {
    key: string;
    value: Household;
  };
  checks: {
    key: string;
    value: Check;
    indexes: { 'by-household': string };
  };
  records: {
    key: string;
    value: DistributionRecord;
    indexes: { 'by-check': string };
  };
  reports: {
    key: string;
    value: Report;
    indexes: { 'by-check': string };
  };
  filings: {
    key: string;
    value: Filing;
    indexes: { 'by-check': string };
  };
  outbox: {
    key: string;
    value: SyncOperation;
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'rationsaathi_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<RationSaathiDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<RationSaathiDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB only available in browser'));
  }
  if (!dbPromise) {
    dbPromise = openDB<RationSaathiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('devices', { keyPath: 'deviceId' });
        db.createObjectStore('households', { keyPath: 'id' });
        
        const checkStore = db.createObjectStore('checks', { keyPath: 'id' });
        checkStore.createIndex('by-household', 'householdId');

        const recordStore = db.createObjectStore('records', { keyPath: 'id' });
        recordStore.createIndex('by-check', 'checkId');

        const reportStore = db.createObjectStore('reports', { keyPath: 'id' });
        reportStore.createIndex('by-check', 'checkId');

        const filingStore = db.createObjectStore('filings', { keyPath: 'id' });
        filingStore.createIndex('by-check', 'checkId');

        db.createObjectStore('outbox', { keyPath: 'opId' });
        db.createObjectStore('settings', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

// Device identity
export async function getDeviceCredentials(): Promise<{ deviceId: string; token: string } | null> {
  const db = await getDb();
  const all = await db.getAll('devices');
  return all.length > 0 ? { deviceId: all[0].deviceId, token: all[0].token } : null;
}

export async function saveDeviceCredentials(deviceId: string, token: string): Promise<void> {
  const db = await getDb();
  await db.put('devices', { deviceId, token, registeredAt: new Date().toISOString() });
}

// Households
export async function getLocalHouseholds(): Promise<Household[]> {
  const db = await getDb();
  return db.getAll('households');
}

export async function getLocalHousehold(id: string): Promise<Household | undefined> {
  const db = await getDb();
  return db.get('households', id);
}

export async function saveLocalHousehold(household: Household, queueSync = true): Promise<void> {
  const db = await getDb();
  await db.put('households', household);
  if (queueSync) {
    // Strip local-only rationCardNo before queuing
    const { rationCardNo, ...serverSafe } = household;
    const op: SyncOperation = {
      opId: crypto.randomUUID(),
      entity: 'household',
      action: 'put',
      id: household.id,
      body: serverSafe,
      clientUpdatedAt: new Date().toISOString(),
    };
    await db.put('outbox', op);
  }
}

export async function deleteLocalHousehold(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('households', id);
  const op: SyncOperation = {
    opId: crypto.randomUUID(),
    entity: 'household',
    action: 'delete',
    id,
    clientUpdatedAt: new Date().toISOString(),
  };
  await db.put('outbox', op);
}

// Checks
export async function getLocalChecks(householdId?: string): Promise<Check[]> {
  const db = await getDb();
  if (householdId) {
    return db.getAllFromIndex('checks', 'by-household', householdId);
  }
  return db.getAll('checks');
}

export async function getLocalCheck(id: string): Promise<Check | undefined> {
  const db = await getDb();
  return db.get('checks', id);
}

export async function saveLocalCheck(check: Check, queueSync = true): Promise<void> {
  const db = await getDb();
  await db.put('checks', check);
  if (queueSync) {
    const op: SyncOperation = {
      opId: crypto.randomUUID(),
      entity: 'check',
      action: 'put',
      id: check.id,
      body: check,
      clientUpdatedAt: new Date().toISOString(),
    };
    await db.put('outbox', op);
  }
}

// Records
export async function getLocalRecords(checkId: string): Promise<DistributionRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('records', 'by-check', checkId);
}

export async function getLocalRecord(id: string): Promise<DistributionRecord | undefined> {
  const db = await getDb();
  return db.get('records', id);
}

export async function saveLocalRecord(record: DistributionRecord, queueSync = true): Promise<void> {
  const db = await getDb();
  await db.put('records', record);
  if (queueSync) {
    const op: SyncOperation = {
      opId: crypto.randomUUID(),
      entity: 'record',
      action: 'put',
      id: record.id,
      body: record,
      clientUpdatedAt: new Date().toISOString(),
    };
    await db.put('outbox', op);
  }
}

export async function deleteLocalRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('records', id);
  const op: SyncOperation = {
    opId: crypto.randomUUID(),
    entity: 'record',
    action: 'delete',
    id,
    clientUpdatedAt: new Date().toISOString(),
  };
  await db.put('outbox', op);
}

// Reports
export async function getLocalReports(checkId: string): Promise<Report[]> {
  const db = await getDb();
  return db.getAllFromIndex('reports', 'by-check', checkId);
}

export async function getLocalReport(id: string): Promise<Report | undefined> {
  const db = await getDb();
  return db.get('reports', id);
}

export async function saveLocalReport(report: Report): Promise<void> {
  const db = await getDb();
  await db.put('reports', report);
}

// Filings
export async function getLocalFiling(checkId: string): Promise<Filing | undefined> {
  const db = await getDb();
  const all = await db.getAllFromIndex('filings', 'by-check', checkId);
  return all[0];
}

export async function saveLocalFiling(filing: Filing): Promise<void> {
  const db = await getDb();
  await db.put('filings', filing);
  const op: SyncOperation = {
    opId: crypto.randomUUID(),
    entity: 'filing',
    action: 'put',
    id: filing.id,
    body: filing,
    clientUpdatedAt: new Date().toISOString(),
  };
  await db.put('outbox', op);
}

export async function deleteLocalFiling(checkId: string): Promise<void> {
  const db = await getDb();
  const filing = await getLocalFiling(checkId);
  if (filing) {
    await db.delete('filings', filing.id);
    const op: SyncOperation = {
      opId: crypto.randomUUID(),
      entity: 'filing',
      action: 'delete',
      id: filing.id,
      clientUpdatedAt: new Date().toISOString(),
    };
    await db.put('outbox', op);
  }
}

// Outbox
export async function getOutbox(): Promise<SyncOperation[]> {
  const db = await getDb();
  return db.getAll('outbox');
}

export async function removeFromOutbox(opId: string): Promise<void> {
  const db = await getDb();
  await db.delete('outbox', opId);
}

// Settings
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDb();
    const entry = await db.get('settings', key);
    return entry ? entry.value : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setSetting(key: string, value: any): Promise<void> {
  const db = await getDb();
  await db.put('settings', { key, value });
}

// Wipe local data
export async function clearAllLocalData(): Promise<void> {
  const db = await getDb();
  await db.clear('devices');
  await db.clear('households');
  await db.clear('checks');
  await db.clear('records');
  await db.clear('reports');
  await db.clear('filings');
  await db.clear('outbox');
  await db.clear('settings');
}

// Example Data seeder
export async function seedExampleData(): Promise<{ householdId: string; checkId: string }> {
  const householdId = 'example-household-1';
  const checkId = 'example-check-1';

  const household: Household = {
    id: householdId,
    label: 'Sharma Household (Example)',
    cardType: 'PHH',
    members: 4,
    rule: {
      perUnitKg: 5,
      basis: 'perMember',
      sourceTitle: 'National Food Security Act, 2013 — Priority Households',
      sourceUrl: 'https://nfsa.gov.in/',
      sourceNote: 'Statutory scale: 5 kg per member per month.',
      lastVerified: '2026-10-01',
    },
    ruleConfirmed: true,
    ruleConfirmedAt: '2026-10-01T10:00:00.000Z',
    stateCode: 'MH',
    district: 'Pune',
    fpsNo: '0417',
    fpsName: 'Shree Ganesh Wajavi Dukan 17',
    rationCardNo: 'MH2704179920', // Local only
  };

  const check: Check = {
    id: checkId,
    householdId,
    period: '2026-10',
    status: 'open',
  };

  const records: DistributionRecord[] = [
    {
      id: 'rec-1',
      checkId,
      date: '2026-10-04',
      quantityKg: 12,
      commodity: 'mixed',
      evidenceType: 'sms',
      evidenceContent: 'TXN: 984102. 12.000 Kg ration delivered on 04/10/2026 at FPS 0417.',
      confirmed: true,
      createdVia: 'paste',
    },
    {
      id: 'rec-2',
      checkId,
      date: '2026-10-12',
      quantityKg: 4,
      commodity: 'wheat',
      evidenceType: 'note',
      evidenceContent: 'Received 4 kg wheat from FPS on second trip. Dealer mentioned balance quota.',
      confirmed: true,
      createdVia: 'manual',
    },
    {
      id: 'rec-3',
      checkId,
      date: '2026-10-15',
      quantityKg: 3,
      commodity: 'rice',
      evidenceType: 'none',
      evidenceContent: '',
      confirmed: true,
      createdVia: 'manual',
    },
  ];

  const db = await getDb();
  await db.put('households', household);
  await db.put('checks', check);
  for (const r of records) {
    await db.put('records', r);
  }

  return { householdId, checkId };
}

export async function clearExampleData(): Promise<void> {
  const db = await getDb();
  await db.delete('households', 'example-household-1');
  await db.delete('checks', 'example-check-1');
  await db.delete('records', 'rec-1');
  await db.delete('records', 'rec-2');
  await db.delete('records', 'rec-3');
}
