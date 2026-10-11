'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCheckId } from '@/lib/routeParams';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { DraftReview } from '@/components/DraftReview';
import { getLocalCheck, getLocalHousehold } from '@/lib/db';
import { api } from '@/lib/api';
import { saveConfirmedDraft } from '@/lib/drafts';
import { useApp } from '@/context/AppContext';
import {
  AiDraft,
  parseVoiceTranscript,
  formatKg,
  computeEntitlement,
  speechLangFor,
} from '@repo/shared';
import type { LocalRecord } from '@/lib/localTypes';
import { ArrowLeft, Mic, MicOff, Volume2, CheckCircle2, RotateCcw } from 'lucide-react';

export default function VoiceEntryPage() {
  const router = useRouter();
  const checkId = useCheckId();
  const { speak, isSpeaking, lang, capabilities, aiConsent } = useApp();

  const [check, setCheck] = useState<any>(null);
  const [household, setHousehold] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [readBackDone, setReadBackDone] = useState(false);

  useEffect(() => {
    getLocalCheck(checkId).then((chk) => {
      setCheck(chk);
      if (chk) {
        getLocalHousehold(chk.householdId).then(setHousehold);
      }
    });

    if (
      typeof window !== 'undefined' &&
      !('SpeechRecognition' in window) &&
      !('webkitSpeechRecognition' in window)
    ) {
      setHasSpeechSupport(false);
    }
  }, [checkId]);

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSpeechSupport(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      // Recognise speech in the user's chosen language (FRONTEND_SPEC §5.3).
      recognition.lang = speechLangFor(lang);
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setTranscript(text);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleProcessVoice = async (textToParse: string) => {
    // Fractions ("half") are resolved against the CONFIRMED rule only (Principle 1); otherwise the
    // parser leaves the quantity empty and the user types it.
    const entitlementKg = household?.ruleConfirmed ? computeEntitlement(household).kg : undefined;

    let next: AiDraft;
    try {
      // Online: the server parses (rule-based, or AI when the user allowed it and the sentence is hard).
      next = await api.ai.voiceParse({
        transcript: textToParse,
        language: lang,
        checkId,
        allowCloud: capabilities.cloudAi && aiConsent.cloudAssist,
      });
    } catch {
      // Offline: rule-based parser from @repo/shared. Its confidences are kept as-is so that
      // uncertain values (e.g. a spoken "half") must be checked by the user (Principle 4).
      const { readBack, ...parsed } = parseVoiceTranscript(textToParse, { period: check?.period, entitlementKg });
      next = {
        id: crypto.randomUUID(),
        kind: 'voice',
        status: 'pending',
        engine: 'local',
        checkId,
        photoId: null,
        warnings: [],
        result: parsed,
        readBack: { language: 'en', text: readBack },
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      };
    }

    setDraft(next);
    // Mandatory read-back per Principle P4 / Section 5.3, in the language it was written in.
    speak(next.readBack.text, next.readBack.language);
    setReadBackDone(true);
  };

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
              Voice Entry with Read-Back
            </h2>
          </div>
          <ListenButton
            text="Speak your distribution details. For example: I received 5 kg on 5 October with no slip."
            label="Listen"
          />
        </div>

        {draft ? (
          <div className="space-y-4">
            {/* Mandatory read-back box */}
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Mandatory Voice Read-Back (Principle P4)
                </span>
                <button
                  type="button"
                  onClick={() => speak(draft.readBack.text)}
                  className="text-xs text-amber-900 dark:text-amber-300 font-semibold underline flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Listen again</span>
                </button>
              </div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                &ldquo;{draft.readBack.text}&rdquo;
              </p>
              <p className="text-[11px] text-stone-500 italic">
                RationSaathi never saves voice entries automatically. Please verify below.
              </p>
            </div>

            <DraftReview
              draft={draft}
              checkId={checkId}
              onConfirm={handleConfirmDraft}
              onDiscard={() => setDraft(null)}
            />
          </div>
        ) : (
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6 shadow-xs text-center space-y-6">
            <div className="space-y-2">
              <div
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-amber-500 text-white animate-pulse ring-8 ring-amber-200 dark:ring-amber-900'
                    : 'bg-teal-700 text-white hover:bg-teal-800 cursor-pointer shadow-md'
                }`}
                onClick={isListening ? undefined : startListening}
              >
                {isListening ? <Mic className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
              </div>

              <div className="pt-2">
                <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {isListening ? 'Listening...' : 'Tap the microphone to speak'}
                </p>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  Example: &ldquo;I got 5 kg rice on 5th October without any slip&rdquo; or &ldquo;मुझे इस महीने आधा राशन मिला&rdquo;
                </p>
              </div>
            </div>

            {/* Transcript Display */}
            {transcript && (
              <div className="p-3 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded text-left space-y-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">
                  Transcript:
                </span>
                <p className="text-xs font-mono text-stone-800 dark:text-stone-200">
                  {transcript}
                </p>
                <button
                  type="button"
                  onClick={() => handleProcessVoice(transcript)}
                  className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded transition-colors"
                >
                  Process This Transcript
                </button>
              </div>
            )}

            {/* Manual text backup for browser without Web Speech */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 text-left space-y-2">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Or type spoken words manually:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 5 kg on 10th October with receipt 8821"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded"
                />
                <button
                  type="button"
                  onClick={() => handleProcessVoice(transcript)}
                  disabled={!transcript.trim()}
                  className="px-4 py-2 bg-stone-800 text-white text-xs font-semibold rounded disabled:opacity-50"
                >
                  Parse
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
