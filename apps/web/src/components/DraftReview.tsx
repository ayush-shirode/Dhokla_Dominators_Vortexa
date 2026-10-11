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
  // OCR / text drafts carry ExtractionResult; voice drafts carry VoiceParseResult (no reference/extractedText).
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
        unclear: isUnsure || (hasLowConfidence && !userVerifiedLowConfidence),
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
    <div className="bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg p-5 shadow-xs max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-400 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded">
            Draft Review &bull; {draft.kind.toUpperCase()}
          </span>
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mt-1">
            Review Extracted Information
          </h3>
        </div>
        <button
          onClick={onDiscard}
          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          title="Discard"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Readback voice card */}
      {draft.readBack?.text && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md flex items-start justify-between gap-2">
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-sans">
            &ldquo;{draft.readBack.text}&rdquo;
          </p>
          <ListenButton text={draft.readBack.text} label="Listen" />
        </div>
      )}

      {/* Source preview */}
      {result.extractedText && (
        <div className="text-xs bg-stone-100 dark:bg-stone-950 p-3 rounded border border-stone-200 dark:border-stone-800 font-mono text-stone-700 dark:text-stone-300 max-h-28 overflow-y-auto">
          <span className="text-[10px] text-stone-400 block mb-1 font-sans uppercase tracking-wider">Raw text read:</span>
          {result.extractedText}
        </div>
      )}

      {/* Quantity & Formula */}
      <div className={`p-3 rounded-md border ${lowConfidenceFields.includes('quantityKg') ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' : 'border-stone-200 dark:border-stone-800'}`}>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Quantity (kg)
          </label>
          {lowConfidenceFields.includes('quantityKg') && (
            <span className="text-[11px] text-amber-800 dark:text-amber-400 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Check this
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.5"
            value={quantityKg}
            onChange={(e) => setQuantityKg(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-xl font-mono font-bold bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <span className="text-base font-semibold text-stone-500">kg</span>
        </div>
        {(result.quantityFormula || result.quantityExpression?.formula) && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 font-mono">
            {result.quantityFormula ? `Line items: ${result.quantityFormula}` : `Worked out from what you said: ${result.quantityExpression!.formula}`}
          </p>
        )}
      </div>

      {/* Date */}
      <div className={`p-3 rounded-md border ${lowConfidenceFields.includes('date') ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' : 'border-stone-200 dark:border-stone-800'}`}>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Distribution Date
          </label>
          {lowConfidenceFields.includes('date') && (
            <span className="text-[11px] text-amber-800 dark:text-amber-400 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Check this
            </span>
          )}
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
      </div>

      {/* Evidence Type */}
      <div>
        <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
          Evidence Type
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['receipt', 'sms', 'photo', 'note', 'none'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setEvidenceType(type)}
              className={`px-2.5 py-1.5 text-xs rounded border text-center font-medium capitalize transition-colors ${
                evidenceType === type
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-100'
              }`}
            >
              {type === 'none' ? 'No evidence' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence Content / Reference */}
      {evidenceType === 'receipt' && (
        <div className={`p-3 rounded-md border ${lowConfidenceFields.includes('reference') ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' : 'border-stone-200 dark:border-stone-800'}`}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Slip / Transaction Number
            </label>
            {lowConfidenceFields.includes('reference') && (
              <span className="text-[11px] text-amber-800 dark:text-amber-400 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Check this
              </span>
            )}
          </div>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. 88213 or TXN-4921"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded text-stone-900 dark:text-stone-100 font-mono"
          />
        </div>
      )}

      {(evidenceType === 'sms' || evidenceType === 'note') && (
        <div>
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
            {evidenceType === 'sms' ? 'SMS Text' : 'Notes'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          {!neutrality.ok && (
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium bg-amber-50 dark:bg-amber-950/50 p-2 rounded border border-amber-200 dark:border-amber-800">
              {NEUTRALITY_HINT} (Flagged: {flaggedTermsText(neutrality)})
            </p>
          )}
        </div>
      )}

      {/* Verification Checkboxes */}
      <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
        {hasLowConfidence && (
          <label className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200 cursor-pointer bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800">
            <input
              type="checkbox"
              checked={userVerifiedLowConfidence}
              onChange={(e) => setUserVerifiedLowConfidence(e.target.checked)}
              className="mt-0.5 rounded text-teal-600"
            />
            <span>
              I have checked the highlighted values against my actual slip/receipt.
            </span>
          </label>
        )}

        <label className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isUnsure}
            onChange={(e) => setIsUnsure(e.target.checked)}
            className="mt-0.5 rounded text-teal-600"
          />
          <span>
            Mark as Unclear (&quot;I&apos;m not sure about this amount&quot; &mdash; will not be counted in totals until verified)
          </span>
        </label>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-3">
        <button
          type="button"
          onClick={onDiscard}
          className="flex-1 px-4 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-200 dark:bg-stone-800 rounded hover:bg-stone-300 transition-colors"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving || !neutrality.ok}
          className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Confirm &amp; Save</span>
        </button>
      </div>
    </div>
  );
}
