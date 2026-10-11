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
import { ArrowLeft, Save, AlertCircle, ShieldAlert } from 'lucide-react';
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
        // Default to today if inside period, else 1st of period
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

    // Check neutrality guard
    const n = checkNeutrality(evidenceContent);
    if (!n.ok) {
      setNeutralityWarning(NEUTRALITY_HINT);
      return;
    }

    // Sensitive ID check & redaction
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
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 max-w-xl mx-auto px-4 py-6 w-full space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {recordId ? 'Edit Distribution Record' : 'Add Distribution Record'}
            </h2>
          </div>
          <ListenButton
            text="Add record form. Enter distribution date, quantity in kilograms, select evidence type, and add transaction details."
            label="Listen"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Distribution Date
            </label>
            <input
              type="date"
              value={date}
              max={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 font-mono"
              required
            />
            {isOutsidePeriod && (
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-1 font-medium">
                This date is outside period {period} &mdash; it will be marked Late (still counted).
              </p>
            )}
          </div>

          {/* Quantity in kg */}
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Quantity Received (kg)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                max="1000"
                value={quantityKg}
                onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xl font-mono font-bold bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100"
                required
              />
              <span className="text-base font-semibold text-stone-500">kg</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              0 kg is allowed (e.g. a visit where no ration was distributed).
            </p>
          </div>

          {/* Commodity chips */}
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Commodity (Optional)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(['rice', 'wheat', 'coarse_grains', 'mixed', 'other'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCommodity(c)}
                  className={`py-1.5 px-2 text-xs rounded border text-center capitalize font-medium transition-colors ${
                    commodity === c
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                  }`}
                >
                  {c.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Evidence Type */}
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Evidence Type (Principle P3)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { type: 'receipt', label: 'Receipt No.' },
                { type: 'sms', label: 'SMS text' },
                { type: 'photo', label: 'Photo' },
                { type: 'note', label: 'Note' },
                { type: 'none', label: 'No evidence' },
              ].map((ev) => (
                <button
                  key={ev.type}
                  type="button"
                  onClick={() => setEvidenceType(ev.type as EvidenceType)}
                  className={`p-2 text-xs rounded border text-center font-medium transition-all ${
                    evidenceType === ev.type
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
                  }`}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>

          {/* Evidence Content */}
          {evidenceType === 'receipt' && (
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Slip / Transaction Number
              </label>
              <input
                type="text"
                value={evidenceContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="e.g. TXN-89213"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded font-mono"
                required
              />
            </div>
          )}

          {(evidenceType === 'sms' || evidenceType === 'note') && (
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
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
                className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded focus:ring-2 focus:ring-teal-600 focus:outline-none"
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
            <div className="p-3 bg-stone-200 dark:bg-stone-800/80 rounded border border-stone-300 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300">
              <span className="font-semibold block mb-0.5">Note on records without evidence:</span>
              This record will be saved with an <strong className="text-stone-900 dark:text-stone-100">Unrecorded</strong> chip and will not be counted in summary calculations until evidence is provided.
            </div>
          )}

          {redactedNote && (
            <p className="text-xs text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 p-2 rounded border border-teal-200">
              {redactedNote}
            </p>
          )}

          {/* Mark as unclear checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={unclear}
                onChange={(e) => setUnclear(e.target.checked)}
                className="mt-0.5 rounded text-teal-600"
              />
              <span>I&apos;m not sure about this amount (will be marked Unclear and not counted)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || !!neutralityWarning}
            className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Distribution Record</span>
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
