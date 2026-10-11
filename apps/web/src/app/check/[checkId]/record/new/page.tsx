'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
import {
  ArrowLeft,
  Check,
  Camera,
  ClipboardPaste,
  Mic,
  PenTool,
} from 'lucide-react';
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
      router.push(`/check/${checkId}?highlight=${id}`);
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
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            </button>
            <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
              {recordId ? 'Edit Ration Record' : 'Add Ration Record'}
            </h2>
          </div>
          <ListenButton
            text="Add record. Choose method: Type, Photo, Paste, or Voice. Enter date and quantity."
            label="Listen"
          />
        </div>

        {/* Method Chooser: Type, Photo, Paste, Voice */}
        <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-4 shadow-warm space-y-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600 block">
            Choose Entry Method
          </span>
          <div className="grid grid-cols-4 gap-2">
            <span className="min-h-[48px] py-2 px-1 text-center text-xs font-extrabold rounded-2xl bg-[#244b38] text-white shadow-xs flex flex-col items-center justify-center gap-1">
              <PenTool className="w-4 h-4" />
              <span>Type</span>
            </span>

            <Link
              href={`/check/${checkId}/capture`}
              className="min-h-[48px] py-2 px-1 text-center text-xs font-bold rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] text-stone-700 hover:bg-[#f3eee3] flex flex-col items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              <Camera className="w-4 h-4 text-[#244b38]" />
              <span>Photo</span>
            </Link>

            <Link
              href={`/check/${checkId}/paste`}
              className="min-h-[48px] py-2 px-1 text-center text-xs font-bold rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] text-stone-700 hover:bg-[#f3eee3] flex flex-col items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              <ClipboardPaste className="w-4 h-4 text-[#244b38]" />
              <span>Paste</span>
            </Link>

            <Link
              href={`/check/${checkId}/voice`}
              className="min-h-[48px] py-2 px-1 text-center text-xs font-bold rounded-2xl bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] text-stone-700 hover:bg-[#f3eee3] flex flex-col items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              <Mic className="w-4 h-4 text-[#244b38]" />
              <span>Voice</span>
            </Link>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
          {/* Date of Receipt */}
          <div>
            <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 block mb-1">
              Date of receipt *
            </label>
            <input
              type="date"
              value={date}
              max={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              required
            />
            {isOutsidePeriod && (
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-1 font-bold">
                Note: This date falls outside period {period}. It will be marked Late (still counted).
              </p>
            )}
          </div>

          {/* Items Received Chips */}
          <div>
            <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 block mb-1.5">
              Items received (commodity)
            </label>
            <div className="flex flex-wrap gap-2">
              {(['rice', 'wheat', 'coarse_grains', 'mixed', 'other'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCommodity(c)}
                  className={`min-h-[40px] py-1.5 px-3.5 text-xs rounded-full capitalize font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
                    commodity === c
                      ? 'bg-[#244b38] text-white shadow-xs'
                      : 'bg-[#fbf9f4] dark:bg-stone-950 text-stone-600 dark:text-stone-400 border border-[#eee7db]'
                  }`}
                >
                  {c.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity in kg with >= 28px font */}
          <div>
            <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 block mb-1">
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
                className="w-full min-h-[52px] px-3.5 py-2 text-2xl sm:text-3xl font-mono font-extrabold bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-xl text-[#1c3d2e] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
                required
              />
              <span className="text-sm font-bold text-stone-500">kg</span>
            </div>
          </div>

          {/* Evidence Type Tiles: receipt number, SMS text, photo, note, no evidence */}
          <div>
            <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 block mb-1.5">
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
                  className={`min-h-[48px] p-2.5 text-xs rounded-xl font-bold transition-all text-left border focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
                    evidenceType === ev.type
                      ? 'bg-[#244b38] text-white border-[#244b38] shadow-xs'
                      : 'bg-[#fbf9f4] dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-[#eee7db]'
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
              <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 block mb-1">
                Receipt / Transaction Number
              </label>
              <input
                type="text"
                value={evidenceContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="e.g. TXN-89213"
                className="w-full min-h-[44px] px-3.5 py-2 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#244b38]"
                required
              />
            </div>
          )}

          {(evidenceType === 'sms' || evidenceType === 'note') && (
            <div>
              <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300 block mb-1">
                {evidenceType === 'sms' ? 'SMS Message' : 'Visit Note'}
              </label>
              <textarea
                value={evidenceContent}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={3}
                placeholder={
                  evidenceType === 'sms'
                    ? 'Paste the official delivery SMS here'
                    : 'What happened at this distribution visit?'
                }
                className="w-full px-3.5 py-2 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] rounded-xl focus:ring-2 focus:ring-[#244b38] focus:outline-none"
                required
              />
              {neutralityWarning && (
                <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-1 font-bold">
                  {neutralityWarning}
                </p>
              )}
            </div>
          )}

          {evidenceType === 'none' && (
            <div className="p-3 bg-[#f7f5ed] rounded-xl border border-[#e5decb] text-xs text-stone-700">
              <span className="font-bold block mb-0.5">Note:</span>
              This record will be saved as <strong className="text-stone-900">Unrecorded</strong> and will not be counted in confirmed totals until slip evidence is linked.
            </div>
          )}

          {redactedNote && (
            <p className="text-xs text-[#244b38] bg-[#edf7f2] p-2.5 rounded-xl border border-[#bbf7d0]">
              {redactedNote}
            </p>
          )}

          {/* "Not sure" Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 text-xs text-stone-700 dark:text-stone-300 cursor-pointer min-h-[44px]">
              <input
                type="checkbox"
                checked={unclear}
                onChange={(e) => setUnclear(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-[#244b38] focus:ring-[#244b38]"
              />
              <span>I am not sure about this amount (mark as <strong>Unclear</strong> &mdash; not counted in totals)</span>
            </label>
          </div>

          {/* Confirm & Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !!neutralityWarning}
              className="w-full min-h-[48px] py-3.5 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
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
