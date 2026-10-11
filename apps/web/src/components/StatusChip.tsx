'use client';

import React from 'react';
import { LABEL_INFO, type OverallLabel } from '@repo/shared';
import { FileText, MessageSquare, Image, StickyNote, HelpCircle } from 'lucide-react';

type ChipLabel = 'Shortfall' | 'Late' | 'Unrecorded' | 'Unclear' | 'Recorded';

const RECORDED = { name: 'Recorded', explanation: 'Evidence is linked and this record is counted.' };

/** Accepts display labels ("Late") or the API's lowercase labels ("late"). */
export function StatusChip({ label, lang = 'en' }: { label: ChipLabel | OverallLabel | 'recorded'; lang?: 'en' | 'hi' }) {
  const code = label.toLowerCase() as OverallLabel | 'recorded';
  const text = code === 'recorded' ? RECORDED : (LABEL_INFO[code]?.[lang] ?? RECORDED);
  const info = { code, title: text.name, explanation: text.explanation };

  // Strict neutral tones per specification (no alarm red, no sirens, no skull icons)
  let colorClass = 'bg-stone-200 text-stone-700 border-stone-300';
  if (info.code === 'shortfall') {
    colorClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
  } else if (info.code === 'late') {
    colorClass = 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-200 dark:border-yellow-800';
  } else if (info.code === 'unrecorded') {
    colorClass = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  } else if (info.code === 'unclear') {
    colorClass = 'bg-stone-100 text-stone-600 border-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700';
  } else if (info.code === 'recorded') {
    colorClass = 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${colorClass}`}
      title={info.explanation}
    >
      {info.title}
    </span>
  );
}

export function EvidenceBadge({
  type,
  preview,
}: {
  type: 'receipt' | 'sms' | 'photo' | 'note' | 'none';
  preview?: string;
}) {
  const icons = {
    receipt: FileText,
    sms: MessageSquare,
    photo: Image,
    note: StickyNote,
    none: HelpCircle,
  };
  const Icon = icons[type] || FileText;

  const labels = {
    receipt: 'Slip / Receipt',
    sms: 'SMS',
    photo: 'Photo',
    note: 'Note',
    none: 'No evidence',
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300 font-normal">
      <Icon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
      <span className="font-medium text-stone-800 dark:text-stone-200">{labels[type]}</span>
      {preview && (
        <span className="text-stone-500 dark:text-stone-400 truncate max-w-[200px] sm:max-w-[300px]">
          &bull; {preview}
        </span>
      )}
    </div>
  );
}
