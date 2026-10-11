'use client';

import React, { useState } from 'react';
import {
  AiDraft,
  formatKg,
  LOW_CONFIDENCE_THRESHOLD,
  checkNeutrality,
  type AiAssistInfo,
  type ExtractionResult,
  type VoiceParseResult,
} from '@repo/shared';
import type { LocalRecord } from '@/lib/localTypes';
import { ListenButton } from './Navigation';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { NEUTRALITY_HINT, flaggedTermsText } from '@/lib/neutrality';

interface DraftReviewProps {
  draft: AiDraft;
  onConfirm: (record: LocalRecord) => Promise<void>;
  onDiscard: () => void;
  checkId: string;
}

export function DraftReview({ draft, onConfirm, onDiscard, checkId }: DraftReviewProps) {
  const result = (draft.kind === 'translation' ? {} : draft.result) as Partial<ExtractionResult> & Partial<VoiceParseResult>;
  const fields = (result.fields ?? {}) as Partial<ExtractionResult['fields']>;

  const [date, setDate] = useState<string>(fields.date?.value || new Date().toISOString().split('T')[0]);
  const [quantityKg, setQuantityKg] = useState<number>(fields.quantityKg?.value || 0);
  const [evidenceType, setEvidenceType] = useState<any>(
    result.suggestedEvidenceType || (result.fields as VoiceParseResult['fields'] | undefined)?.evidenceType?.value || 'note',
  );
  const [reference, setReference] = useState<string>(fields.reference?.value || '');
  const [notes, setNotes] = useState<string>(result.extractedText || (result.transcript ? `Said: "${result.transcript}"` : ''));
  const [commodity, setCommodity] = useState<any>(fields.commodity?.value || 'mixed');
  const [isUnsure, setIsUnsure] = useState<boolean>(false);
  const [userVerifiedLowConfidence, setUserVerifiedLowConfidence] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const lowConfidenceFields: AiAssistInfo['lowConfidenceFields'] = result.lowConfidenceFields || [];
  const hasLowConfidence = lowConfidenceFields.length > 0;

  const neutrality = checkNeutrality(notes);

  const willBeSavedAsUnclear = isUnsure || (hasLowConfidence && !userVerifiedLowConfidence);

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const record: LocalRecord = {
        id: crypto.randomUUID(),
        checkId,
        date,
        quantityKg: Number(quantityKg),
        commodity,
        evidenceType,
        evidenceContent: evidenceType === 'receipt' ? reference : notes,
        photoId: draft.photoId,
        unclear: willBeSavedAsUnclear,
        confirmed: true,
        createdVia: draft.kind === 'voice' ? 'voice' : 'ocr',
        aiAssist: {
          draftId: draft.id,
          lowConfidenceFields,
          userVerifiedLowConfidence,
        },
      };
      await onConfirm(record);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#244b38] bg-[#edf7f2] px-2 py-0.5 rounded-full">
            Review Draft &bull; {draft.kind.toUpperCase()}
          </span>
          <h3 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100 mt-1">
            Review Extracted Information
          </h3>
        </div>
        <button
          onClick={onDiscard}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-600 rounded-full"
          title="Discard"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Readback voice card */}
      {draft.readBack?.text && (
        <div className="p-3.5 bg-[#fefce8] border border-[#fef08a] rounded-2xl flex items-start justify-between gap-2 text-xs text-[#854d0e]">
          <p className="leading-relaxed font-sans">
            &ldquo;{draft.readBack.text}&rdquo;
          </p>
          <ListenButton text={draft.readBack.text} label="Listen" />
        </div>
      )}

      {/* Quantity in Amber if low confidence */}
      <div
        className={`p-3.5 rounded-2xl border transition-all ${
          lowConfidenceFields.includes('quantityKg')
            ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/20'
            : 'border-[#eee7db] dark:border-stone-800 bg-[#fbf9f4] dark:bg-stone-950'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300">
            Quantity (kg)
          </label>
          {lowConfidenceFields.includes('quantityKg') && (
            <span className="text-[11px] text-amber-900 font-extrabold flex items-center gap-1 bg-amber-200 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" /> Please check
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.5"
            value={quantityKg}
            onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-2xl font-mono font-extrabold bg-white dark:bg-stone-800 border border-[#eee7db] rounded-xl text-[#1c3d2e] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
          />
          <span className="text-base font-bold text-stone-500">kg</span>
        </div>
      </div>

      {/* Date in Amber if low confidence */}
      <div
        className={`p-3.5 rounded-2xl border transition-all ${
          lowConfidenceFields.includes('date')
            ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/20'
            : 'border-[#eee7db] dark:border-stone-800 bg-[#fbf9f4] dark:bg-stone-950'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300">
            Distribution Date
          </label>
          {lowConfidenceFields.includes('date') && (
            <span className="text-[11px] text-amber-900 font-extrabold flex items-center gap-1 bg-amber-200 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" /> Please check
            </span>
          )}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-[#eee7db] rounded-xl text-stone-900 font-mono font-bold"
        />
      </div>

      {/* Slip reference in Amber if low confidence */}
      {evidenceType === 'receipt' && (
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            lowConfidenceFields.includes('reference')
              ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/20'
              : 'border-[#eee7db] dark:border-stone-800 bg-[#fbf9f4] dark:bg-stone-950'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-extrabold text-stone-700 dark:text-stone-300">
              Receipt / Slip Number
            </label>
            {lowConfidenceFields.includes('reference') && (
              <span className="text-[11px] text-amber-900 font-extrabold flex items-center gap-1 bg-amber-200 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3.5 h-3.5" /> Please check
              </span>
            )}
          </div>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-[#eee7db] rounded-xl font-mono"
          />
        </div>
      )}

      {/* Low-confidence checkbox & Unclear warning */}
      <div className="space-y-2.5 pt-2 border-t border-[#eee7db] dark:border-stone-800">
        {hasLowConfidence && (
          <label className="flex items-start gap-2.5 text-xs text-amber-950 bg-amber-50 p-3 rounded-2xl border border-amber-300 cursor-pointer min-h-[48px]">
            <input
              type="checkbox"
              checked={userVerifiedLowConfidence}
              onChange={(e) => setUserVerifiedLowConfidence(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-[#244b38] focus:ring-[#244b38]"
            />
            <span className="font-bold">
              I checked these highlighted values against my actual slip/receipt.
            </span>
          </label>
        )}

        {hasLowConfidence && !userVerifiedLowConfidence && (
          <p className="text-[11px] text-stone-600 bg-[#fbf9f4] p-3 rounded-xl border border-[#eee7db] leading-relaxed">
            <strong>Note:</strong> Since highlighted fields are not checked, this record will be saved as <strong className="text-stone-900">Unclear</strong> and will not be counted in totals until verified.
          </p>
        )}

        <label className="flex items-start gap-2.5 text-xs text-stone-700 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={isUnsure}
            onChange={(e) => setIsUnsure(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded text-[#244b38]"
          />
          <span>Mark as Unclear (&quot;I am not sure about this amount&quot; &mdash; will not be counted in totals)</span>
        </label>
      </div>

      {/* Buttons: Confirm and save / Discard */}
      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={onDiscard}
          className="flex-1 min-h-[48px] px-4 py-2 text-xs font-extrabold text-stone-700 bg-[#fbf9f4] hover:bg-[#f3eee3] border border-[#eee7db] rounded-2xl transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving || !neutrality.ok}
          className="flex-1 min-h-[48px] px-4 py-2 text-xs font-extrabold text-white bg-[#244b38] hover:bg-[#1b3a2b] rounded-2xl shadow-warm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Confirm &amp; Save</span>
        </button>
      </div>
    </div>
  );
}
