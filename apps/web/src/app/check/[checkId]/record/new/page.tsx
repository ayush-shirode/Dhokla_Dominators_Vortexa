'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckId, usePathSegment } from '@/lib/routeParams';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { getLocalCheck, getLocalRecord, saveLocalRecord } from '@/lib/db';
import {
  EvidenceType,
  Commodity,
  checkNeutrality,
  redactSensitiveIds,
} from '@repo/shared';
import type { LocalRecord } from '@/lib/localTypes';
import { ArrowLeft, Save, AlertCircle, ShieldAlert, Check } from 'lucide-react';
import { NEUTRALITY_HINT, flaggedTermsText } from '@/lib/neutrality';

export default function RecordFormPage() {
  const router = useRouter();
  const checkId = useCheckId();
  const recordSeg = usePathSegment(4);
  const recordId = recordSeg && recordSeg !== 'new' ? recordSeg : undefined;

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantityKg, setQuantityKg] = useState<number>(5);
  const [commodity, setCommodity] = useState<Commodity>('mixed');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('receipt');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [unclear, setUnclear] = useState(false);
  const [period, setPeriod] = useState<string>('');

  const [neutralityWarning, setNeutralityWarning] = useState<string | null>(null);
  const [redactedNote, setRedactedNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLocalCheck(checkId).then((chk) => {
      if (chk) {
        setPeriod(chk.period);
        const today = new Date().toISOString().split('T')[0];
        if (today.startsWith(chk.period)) {
          setDate(today);
        } else {
          setDate(`${chk.period}-01`);
        }
      }
    });

    if (recordId) {
      getLocalRecord(recordId).then((r) => {
        if (r) {
          setDate(r.date);
          setQuantityKg(r.quantityKg);
          setCommodity(r.commodity || 'mixed');
          setEvidenceType(r.evidenceType);
          setEvidenceContent(r.evidenceContent || '');
          setUnclear(!!r.unclear);
        }
      });
    }
  }, [checkId, recordId]);

  const handleContentChange = (text: string) => {
    setEvidenceContent(text);
    const n = checkNeutrality(text);
    if (!n.ok) {
      setNeutralityWarning(`${NEUTRALITY_HINT} (flagged: ${flaggedTermsText(n)})`);
    } else {
      setNeutralityWarning(null);
    }
  };

  const isOutsidePeriod = period && !date.startsWith(period);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const n = checkNeutrality(evidenceContent);
    if (!n.ok) {
      setNeutralityWarning(NEUTRALITY_HINT);
      return;
    }

    const { text: cleanContent, count } = redactSensitiveIds(evidenceContent);
    if (count > 0) {
      setRedactedNote(`We removed ${count} number(s) that looked like an Aadhaar number.`);
    }

    setSaving(true);
    try {
      const id = recordId || crypto.randomUUID();
      const record: LocalRecord = {
        id,
        checkId,
        date,
        quantityKg: Number(quantityKg),
        commodity,
        evidenceType,
        evidenceContent: evidenceType === 'none' ? '' : cleanContent,
        unclear,
        confirmed: true,
        createdVia: 'manual',
      };

      await saveLocalRecord(record);
      router.push(`/check/${checkId}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {/* Header Strip with Back Link */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            </button>
            <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
              {recordId ? 'Edit Ration Record' : 'Add Ration Record'}
            </h2>
          </div>
          <ListenButton
            text="Add record form. Enter distribution date, quantity in kilograms, select evidence type, and add transaction details."
            label="Listen"
          />
        </div>

        {/* Quick Nav Chips for Input Modes (Screen 7 top bar) */}
        <div className="grid grid-cols-4 gap-2">
          <span className="py-2 text-center text-xs font-bold rounded-xl bg-[#244b38] text-white shadow-xs">
            Manual
          </span>
          <button
            type="button"
            onClick={() => router.push(`/check/${checkId}/paste`)}
            className="py-2 text-center text-xs font-bold rounded-xl bg-white dark:bg-stone-900 border border-[#eee7db] text-stone-600 hover:bg-[#f3eee3]"
          >
            SMS
          </button>
          <button
            type="button"
            onClick={() => router.push(`/check/${checkId}/capture`)}
            className="py-2 text-center text-xs font-bold rounded-xl bg-white dark:bg-stone-900 border border-[#eee7db] text-stone-600 hover:bg-[#f3eee3]"
          >
            Photo
          </button>
          <button
            type="button"
            onClick={() => router.push(`/check/${checkId}/voice`)}
            className="py-2 text-center text-xs font-bold rounded-xl bg-white dark:bg-stone-900 border border-[#eee7db] text-stone-600 hover:bg-[#f3eee3]"
          >
            Voice
          </button>
        </div>

        {/* Form Container Matching Screen 7 */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          {/* Date of Receipt */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
              Date of receipt *
            </label>
            <input
              type="date"
              value={date}
              max={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-mono font-bold"
              required
            />
            {isOutsidePeriod && (
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-1 font-semibold">
                This date is outside period {period} &mdash; it will be marked Late (still counted).
              </p>
            )}
          </div>

          {/* Items Received Chips */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
              Items received (commodity)
            </label>
            <div className="flex flex-wrap gap-2">
              {(['rice', 'wheat', 'coarse_grains', 'mixed', 'other'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCommodity(c)}
                  className={`py-1.5 px-3 text-xs rounded-full capitalize font-bold transition-all ${
                    commodity === c
                      ? 'bg-[#244b38] text-white shadow-xs'
                      : 'bg-[#fbf9f4] dark:bg-stone-950 text-stone-600 dark:text-stone-400 border border-[#eee7db] hover:border-stone-400'
                  }`}
                >
                  {c.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity in kg */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
              Quantity (kg/L) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                max="1000"
                value={quantityKg}
                onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 text-xl font-mono font-extrabold bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-xl text-[#1c3d2e] dark:text-stone-100"
                required
              />
              <span className="text-sm font-bold text-stone-500">kg</span>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">
              0 kg is allowed (e.g. a visit where no ration was distributed).
            </p>
          </div>

          {/* Evidence Type Tiles */}
          <div>
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
              Evidence Type (Principle P3) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'receipt', label: 'Receipt / Slip No.' },
                { type: 'sms', label: 'SMS text message' },
                { type: 'note', label: 'Visit Note' },
                { type: 'none', label: 'No evidence (Unrecorded)' },
              ].map((ev) => (
                <button
                  key={ev.type}
                  type="button"
                  onClick={() => setEvidenceType(ev.type as EvidenceType)}
                  className={`p-2.5 text-xs rounded-xl font-bold transition-all text-left border ${
                    evidenceType === ev.type
                      ? 'bg-[#244b38] text-white border-[#244b38] shadow-xs'
                      : 'bg-[#fbf9f4] dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-[#eee7db] hover:bg-stone-100'
                  }`}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>

          {/* Evidence Content Input */}
          {evidenceType === 'receipt' && (
            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Receipt / Transaction Number
              </label>
              <input
                type="text"
                value={evidenceContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="e.g. TXN-89213"
                className="w-full px-3.5 py-2 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-xl font-mono"
                required
              />
            </div>
          )}

          {(evidenceType === 'sms' || evidenceType === 'note') && (
            <div>
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                {evidenceType === 'sms' ? 'SMS Message' : 'Visit Note'}
              </label>
              <textarea
                value={evidenceContent}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={3}
                placeholder={
                  evidenceType === 'sms'
                    ? 'Paste the official delivery SMS here'
                    : 'What happened at this visit?'
                }
                className="w-full px-3.5 py-2 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-[#244b38] focus:outline-none"
                required
              />
              {neutralityWarning && (
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200">
                  {neutralityWarning}
                </p>
              )}
            </div>
          )}

          {evidenceType === 'none' && (
            <div className="p-3 bg-[#f7f5ed] rounded-xl border border-[#e5decb] text-xs text-stone-700">
              <span className="font-bold block mb-0.5">Note:</span>
              This record will be saved as <strong className="text-rose-800">Unrecorded</strong> and will not be counted in totals until evidence is linked.
            </div>
          )}

          {redactedNote && (
            <p className="text-xs text-[#244b38] bg-[#edf7f2] p-2.5 rounded-xl border border-[#bbf7d0]">
              {redactedNote}
            </p>
          )}

          {/* Mark as unclear checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={unclear}
                onChange={(e) => setUnclear(e.target.checked)}
                className="mt-0.5 rounded text-[#244b38]"
              />
              <span>I&apos;m not sure about this amount (mark as Unclear &mdash; not counted)</span>
            </label>
          </div>

          {/* Save / Confirm Button (Screen 7 footer) */}
          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={saving || !!neutralityWarning}
              className="w-full py-3.5 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Confirm &amp; Save Record</span>
            </button>
          </div>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
