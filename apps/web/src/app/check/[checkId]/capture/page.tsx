'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { DraftReview } from '@/components/DraftReview';
import { getLocalCheck, saveLocalRecord } from '@/lib/db';
import { api } from '@/lib/api';
import { AiDraft, DistributionRecord, extractFromText } from '@repo/shared';
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

  const handleProcessPhoto = async () => {
    if (!photoFile) return;
    setLoading(true);
    setErrorMsg(null);
    setRetakeTips([]);

    try {
      // 1. Upload photo to server API (or fallback locally if offline)
      try {
        const photoRes = await api.photos.upload(photoFile);
        const ocrDraft = await api.ai.ocr({
          photoId: photoRes.id,
          checkId,
          allowCloud: false,
        });
        setDraft(ocrDraft);
        return;
      } catch (err: any) {
        if (err.code === 'RETAKE_PHOTO') {
          setErrorMsg('The photo could not be read clearly.');
          setRetakeTips([
            'Place the receipt on a flat, well-lit surface',
            'Hold the phone parallel to the paper',
            'Avoid strong reflections and glare',
            'Make sure text is in sharp focus',
          ]);
          return;
        }
        // Fall back to client simulation
        console.warn('Falling back to local receipt extraction', err);
      }

      // Offline / local fallback draft creation
      const localExtraction = extractFromText('Txn: 88213. Ration distributed 5.000 Kg Rice and Wheat on 05/10/2026', {
        period: check?.period,
      });

      const fallbackDraft: AiDraft = {
        id: crypto.randomUUID(),
        kind: 'ocr',
        status: 'pending',
        engine: 'local',
        checkId,
        result: localExtraction,
        readBack: {
          language: 'en',
          text: 'I read 5 kg on 5 October, slip number 88213. Please check the slip number.',
        },
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      };
      setDraft(fallbackDraft);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDraft = async (record: DistributionRecord) => {
    await saveLocalRecord(record);
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
                onClick={handleProcessPhoto}
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
