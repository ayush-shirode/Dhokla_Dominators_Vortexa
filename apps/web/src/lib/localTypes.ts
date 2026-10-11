import type { Check, DistributionRecord, Household, RecordInput } from '@repo/shared';

/**
 * Shapes stored in IndexedDB. They mirror the API types, plus local-only fields
 * (FRONTEND_SPEC §3.2). Server-computed fields are optional until the first sync.
 */

/** `rationCardNo` stays on the device and is never sent to the API. */
export type LocalHousehold = Omit<Household, 'createdAt' | 'updatedAt'> &
  Partial<Pick<Household, 'createdAt' | 'updatedAt'>> & { rationCardNo?: string | null };

export type LocalCheck = Pick<Check, 'id' | 'householdId' | 'period' | 'status'> &
  Partial<Omit<Check, 'id' | 'householdId' | 'period' | 'status'>>;

export type LocalRecord = Omit<RecordInput, 'clientUpdatedAt'> & { id: string } &
  Partial<Pick<DistributionRecord, 'labels' | 'createdAt' | 'updatedAt'>>;
