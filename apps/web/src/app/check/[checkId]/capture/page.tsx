'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { DraftReview } from '@/components/DraftReview';
import { getLocalCheck, saveLocalRecord } from '@/lib/db';
import { api } from '@/lib/api';
import { AiDraft } from '@repo/shared';
import type { LocalRecord } from '@/lib/localTypes';
import { ArrowLeft, Camera, Image, AlertCircle, RefreshCw } from 'lucide-react';

export default function PhotoCapturePage() {
  const router = useRouter();
  const params = useParams();
  const checkId = params.checkId as string;

  const [check, setCheck] = useState<any>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retakeTips, setRetakeTips] = useState<string[]>([]);

  useEffect(() => {
    getLocalCheck(checkId).then(setCheck);
  }, [checkId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
      setRetakeTips([]);
    }
  };

  const RETAKE_TIPS: Record<string, string> = {
    blurry: 'Hold the phone still and tap the screen to focus on the text',
    too_dark: 'Move to brighter light or near a window',
    overexposed: 'Avoid direct sunlight or flash glare on the paper',
    low_contrast: 'Place the slip on a plain, dark surface so the text stands out',
    too_small: 'Move closer so the slip fills the frame',
  };

  const handleProcessPhoto = async (userConfirmedNoIds = false) => {
    if (!photoFile) return;
    setLoading(true);
    setErrorMsg(null);
    setRetakeTips([]);

    try {
      // 1. Upload: the server checks quality and blacks out Aadhaar numbers before storing.
      const photoRes = await api.photos.upload(photoFile, { userConfirmedNoIds });
      // 2. Read it. allowCloud stays false here: the on-server reader is used (no third-party call).
      const ocrDraft = await api.ai.ocr({ photoId: photoRes.id, checkId, allowCloud: false });
      setDraft(ocrDraft);
    } catch (err: any) {
      if (err?.code === 'RETAKE_PHOTO') {
        const issues: string[] = err.details?.issues ?? [];
        setErrorMsg('The photo is not clear enough to read reliably. Please retake it.');
        setRetakeTips(issues.map((i) => RETAKE_TIPS[i]).filter(Boolean));
      } else if (err?.code === 'MASKING_UNAVAILABLE') {
        const ok = window.confirm(
          'This server cannot scan the photo for Aadhaar numbers. Please make sure no Aadhaar number is visible (cover or crop it). Continue?',
        );
        if (ok) {
          setLoading(false);
          return handleProcessPhoto(true);
        }
      } else {
        // Never invent a reading: tell the user and offer manual entry instead.
        setErrorMsg(
          'This photo could not be read right now (you may be offline, or reading is unavailable). You can type the values from the slip instead.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDraft = async (record: LocalRecord) => {
    let saved: LocalRecord = record;
    if (draft && draft.id.startsWith('d_')) {
      // Server draft: confirm it so the server records which AI fields were checked.
      try {
        const res = await api.ai.confirmDraft(draft.id, { record });
        if (res.record) saved = res.record;
      } catch {
        /* offline: the record is still saved locally and synced later */
      }
    }
    await saveLocalRecord(saved);
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
              Read Receipt or Slip Photo
            </h2>
          </div>
          <ListenButton
            text="Take a photo of your receipt or slip. The app extracts the date and quantity and presents an editable draft for your confirmation."
            label="Listen"
          />
        </div>

        {draft ? (
          <DraftReview
            draft={draft}
            checkId={checkId}
            onConfirm={handleConfirmDraft}
            onDiscard={() => setDraft(null)}
          />
        ) : (
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 shadow-xs space-y-5">
            {/* Capture Controls */}
            <div className="border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg p-6 text-center space-y-3">
              {previewUrl ? (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    className="max-h-60 mx-auto rounded border border-stone-300 object-contain shadow-xs"
                  />
                  <p className="text-xs text-stone-500 font-mono">
                    {photoFile?.name} ({(photoFile?.size! / 1024).toFixed(1)} KB)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-400 mx-auto flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                    Take a clear photo of your monthly ration slip or e-PoS printout
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <label className="w-full sm:w-auto px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs rounded shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                  <Camera className="w-4 h-4" />
                  <span>{previewUrl ? 'Change photo' : 'Take Photo / Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Framing Tips */}
            <div className="bg-stone-100 dark:bg-stone-950 p-3.5 rounded border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-1">
              <span className="font-bold text-stone-800 dark:text-stone-200 block">
                Tips for accurate reading:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Place slip flat on a desk in good lighting</li>
                <li>Make sure the numbers and date are sharp</li>
                <li>Cover or fold away Aadhaar numbers if visible</li>
              </ul>
            </div>

            {/* Reading unavailable: offer manual entry, never a guessed value */}
            {errorMsg && retakeTips.length === 0 && (
              <div className="p-3.5 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-xs space-y-2 text-stone-800 dark:text-stone-200">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-stone-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/check/${checkId}/record/new`)}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded font-medium"
                >
                  Type the values instead
                </button>
              </div>
            )}

            {/* Retake Suggestions Error Box */}
            {retakeTips.length > 0 && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded text-xs space-y-2 text-amber-950 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-800" />
                  <span>{errorMsg}</span>
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-0.5">
                  {retakeTips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewUrl && (
              <button
                type="button"
                onClick={() => handleProcessPhoto()}
                disabled={loading}
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Reading receipt...</span>
                  </>
                ) : (
                  <span>Extract Receipt Information</span>
                )}
              </button>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
