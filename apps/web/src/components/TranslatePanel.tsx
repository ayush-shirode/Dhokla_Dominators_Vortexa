'use client';

import React, { useState } from 'react';
import {
  SUPPORTED_LANGUAGES,
  checkNeutrality,
  normalizeDigits,
  type AiDraft,
  type LanguageCode,
  type TranslationResult,
} from '@repo/shared';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { ListenButton } from './Navigation';
import { NEUTRALITY_HINT, flaggedTermsText } from '@/lib/neutrality';
import { Languages } from 'lucide-react';

/** Same rule as the server: every number in the translation must match the original. */
function numberDiff(source: string, translated: string): { missing: string[]; added: string[] } {
  const nums = (s: string) => normalizeDigits(s).match(/\d+(?:\.\d+)?/g) ?? [];
  const count = (a: string[]) => a.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
  const a = count(nums(source));
  const b = count(nums(translated));
  return {
    missing: [...a].filter(([k, v]) => (b.get(k) ?? 0) < v).map(([k]) => k),
    added: [...b].filter(([k, v]) => (a.get(k) ?? 0) < v).map(([k]) => k),
  };
}

interface Props {
  purpose: 'report' | 'grievance_description';
  reportId?: string;
  checkId?: string;
  /** Shown before translating, e.g. whether the portal accepts this language (FRONTEND_SPEC §4.7). */
  advice?: string | null;
  onApplied: (text: string, language: LanguageCode) => void;
}

/** AI translation as a reviewable draft (FRONTEND_SPEC §5.4). English and Hindi never need AI. */
export function TranslatePanel({ purpose, reportId, checkId, advice, onApplied }: Props) {
  const { capabilities, requestCloudConsent } = useApp();
  const targets = SUPPORTED_LANGUAGES.filter((l) => !l.templateSupported);
  const [target, setTarget] = useState<LanguageCode>(targets[0]!.code);
  const [draft, setDraft] = useState<(AiDraft & { kind: 'translation' }) | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!capabilities.cloudAi) {
    return (
      <p className="text-xs text-stone-500 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded p-3">
        Translation into other languages needs the AI service, which is not available right now. English and Hindi are always available.
      </p>
    );
  }

  const start = async () => {
    setError(null);
    if (!(await requestCloudConsent('translate'))) return;
    setBusy(true);
    try {
      const d = await api.ai.translate({ purpose, targetLanguage: target, reportId, checkId, allowCloud: true });
      if (d.kind === 'translation') {
        setDraft(d);
        setText(d.result.translatedText);
      }
    } catch (e) {
      setError((e as Error).message || 'Translation failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (draft) api.ai.rejectDraft(draft.id).catch(() => {});
    setDraft(null);
    setText('');
  };

  const r: TranslationResult | null = draft?.result ?? null;
  const neutrality = checkNeutrality(text);
  const nums = r ? numberDiff(r.sourceText, text) : { missing: [], added: [] };
  const numbersOk = nums.missing.length === 0 && nums.added.length === 0;

  const confirm = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await api.ai.confirmDraft(draft.id, { text });
      onApplied(text, draft.result.targetLanguage);
      setDraft(null);
    } catch (e) {
      setError((e as Error).message || 'Could not save the translation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 space-y-3 text-xs">
      <div className="flex items-center gap-2 font-bold text-stone-800 dark:text-stone-200">
        <Languages className="w-4 h-4 text-teal-700" />
        <span>Translate into another language (AI)</span>
      </div>
      {advice && <p className="text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded p-2">{advice}</p>}

      {!draft ? (
        <div className="flex flex-wrap items-center gap-2">
          <select value={target} onChange={(e) => setTarget(e.target.value as LanguageCode)} className="px-2 py-1.5 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950">
            {targets.map((l) => (
              <option key={l.code} value={l.code}>
                {l.nativeName} ({l.name})
              </option>
            ))}
          </select>
          <button type="button" onClick={start} disabled={busy} className="px-3 py-1.5 bg-teal-700 text-white rounded font-medium">
            {busy ? 'Translating…' : 'Translate'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-stone-500">This is a draft. Check it — or ask someone who reads this language — before you use it.</p>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold">Translation (you can edit it)</label>
              <ListenButton text={text} lang={draft.result.targetLanguage} />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              dir={SUPPORTED_LANGUAGES.find((l) => l.code === draft.result.targetLanguage)?.rtl ? 'rtl' : 'ltr'}
              className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <span className="font-semibold block mb-1">What the translation says, in English</span>
            <p className="p-2 rounded bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 whitespace-pre-wrap">{r?.backTranslation}</p>
          </div>
          {!numbersOk && (
            <p className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200">
              The numbers must match the original exactly.
              {nums.missing.length > 0 && ` Missing: ${nums.missing.join(', ')}.`}
              {nums.added.length > 0 && ` Not in the original: ${nums.added.join(', ')}.`}
            </p>
          )}
          {!neutrality.ok && (
            <p className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200">
              {NEUTRALITY_HINT} (Change: {flaggedTermsText(neutrality)})
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={confirm} disabled={busy || !numbersOk || !neutrality.ok} className="px-3 py-1.5 bg-teal-700 disabled:opacity-50 text-white rounded font-medium">
              {busy ? 'Saving…' : 'Use this translation'}
            </button>
            <button type="button" onClick={discard} className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded">
              Discard
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-stone-700 dark:text-stone-300">{error}</p>}
    </div>
  );
}
