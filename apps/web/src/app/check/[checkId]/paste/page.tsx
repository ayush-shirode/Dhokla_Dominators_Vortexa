'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckId } from '@/lib/routeParams';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { DraftReview } from '@/components/DraftReview';
import { getLocalCheck } from '@/lib/db';
import { api } from '@/lib/api';
import { saveConfirmedDraft } from '@/lib/drafts';
import { useApp } from '@/context/AppContext';
import {
  AiDraft,
  extractFromText,
  redactSensitiveIds,
  checkNeutrality,
  extractionReadBack,
} from '@repo/shared';
import type { LocalRecord } from '@/lib/localTypes';
import { ArrowLeft, Clipboard, Sparkles } from 'lucide-react';

export default function PasteTextPage() {
  const router = useRouter();
  const checkId = useCheckId();

  const [check, setCheck] = useState<any>(null);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [reading, setReading] = useState(false);
  const { capabilities, aiConsent, requestCloudConsent } = useApp();

  useEffect(() => {
    getLocalCheck(checkId).then(setCheck);
  }, [checkId]);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const clipText = await navigator.clipboard.readText();
        setText(clipText);
      }
    } catch {
      // Clipboard permissions may be restricted
    }
  };

  const localDraft = (cleanText: string): AiDraft => {
    // Pure rule-based extraction from @repo/shared (works offline).
    const extracted = extractFromText(cleanText, { period: check?.period, sourceType: 'sms' });
    return {
      id: crypto.randomUUID(),
      kind: 'text_extract',
      status: 'pending',
      engine: 'local',
      checkId,
      photoId: null,
      warnings: [],
      result: extracted,
      readBack: { language: 'en', text: extractionReadBack(extracted, 'en') },
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
  };

  const readText = async (allowCloud: boolean) => {
    if (!text.trim()) return;
    // ID numbers are removed before the text goes anywhere.
    const { text: cleanText } = redactSensitiveIds(text);
    setReading(true);
    try {
      setDraft(await api.ai.extractText({ text: cleanText, sourceType: 'sms', checkId, allowCloud }));
    } catch {
      setDraft(localDraft(cleanText));
    } finally {
      setReading(false);
    }
  };

  const handleExtract = () => readText(capabilities.cloudAi && aiConsent.cloudAssist);

  const handleTryCloud = async () => {
    if (!draft || !(await requestCloudConsent('cloudAssist'))) return;
    if (draft.id.startsWith('d_')) api.ai.rejectDraft(draft.id).catch(() => {});
    await readText(true);
  };

  const showCloudOffer =
    !!draft &&
    draft.engine === 'local' &&
    capabilities.cloudAi &&
    draft.kind === 'text_extract' &&
    (draft.result.legibility !== 'good' || draft.result.lowConfidenceFields.length > 0);

  const handleConfirmDraft = async (record: LocalRecord) => {
    if (draft) await saveConfirmedDraft(draft.id, record);
    router.push(`/check/${checkId}`);
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
              Paste SMS or Receipt Text
            </h2>
          </div>
          <ListenButton
            text="Paste your ration distribution SMS text or slip message here. The app will extract the date, kilograms, and transaction number for your review."
            label="Listen"
          />
        </div>

        {draft ? (
          <>
          {showCloudOffer && (
            <div className="p-3 mb-3 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-xs flex items-center justify-between gap-3">
              <span>Some values could not be read on this device (for example, text in a regional script).</span>
              <button type="button" onClick={handleTryCloud} disabled={reading} className="px-3 py-1.5 bg-teal-700 text-white rounded font-medium shrink-0">
                {reading ? 'Reading…' : 'Read with AI'}
              </button>
            </div>
          )}
          <DraftReview
            draft={draft}
            checkId={checkId}
            onConfirm={handleConfirmDraft}
            onDiscard={() => setDraft(null)}
          />
          </>
        ) : (
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                SMS or Receipt Text
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste from clipboard</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Your ration quota of 12.000 Kg (Rice: 8Kg, Wheat: 4Kg) was delivered on 04/10/2026. Ref Txn No: 884102."
              className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:ring-2 focus:ring-teal-600"
            />

            <div className="text-[11px] text-stone-500 bg-stone-100 dark:bg-stone-950 p-2.5 rounded border border-stone-200 dark:border-stone-800 space-y-1">
              <p>
                &bull; <strong>Privacy note:</strong> Any 12-digit numbers that look like an Aadhaar number are automatically removed on your phone.
              </p>
              <p>
                &bull; Extraction runs 100% locally and works completely offline.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExtract}
              disabled={!text.trim()}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Read Text &amp; Prepare Draft</span>
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
