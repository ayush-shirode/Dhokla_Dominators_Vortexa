'use client';

import React from 'react';
import { LABEL_INFO, type OverallLabel } from '@repo/shared';
import { FileText, MessageSquare, Image, StickyNote, HelpCircle } from 'lucide-react';

type ChipLabel = 'Shortfall' | 'Late' | 'Unrecorded' | 'Unclear' | 'Recorded';

const RECORDED = { name: 'Recorded', explanation: 'Evidence is linked and this record is counted.' };

export function StatusChip({ label, lang = 'en' }: { label: ChipLabel | OverallLabel | 'recorded'; lang?: 'en' | 'hi' }) {
  const code = label.toLowerCase() as OverallLabel | 'recorded';
  const text = code === 'recorded' ? RECORDED : (LABEL_INFO[code]?.[lang] ?? RECORDED);
  const info = { code, title: text.name, explanation: text.explanation };

  // Styling matching reference design chips (soft pill badges)
  let colorClass = 'bg-stone-100 text-stone-700 border-stone-200';
  if (info.code === 'shortfall') {
    colorClass = 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca] dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900';
  } else if (info.code === 'late') {
    colorClass = 'bg-[#fefce8] text-[#854d0e] border-[#fef08a] dark:bg-yellow-950/40 dark:text-yellow-200 dark:border-yellow-900';
  } else if (info.code === 'unrecorded') {
    colorClass = 'bg-[#fbebee] text-[#9f1239] border-[#fecdd3] dark:bg-pink-950/30 dark:text-pink-200 dark:border-pink-900';
  } else if (info.code === 'unclear') {
    colorClass = 'bg-[#f5f5f4] text-[#57534e] border-[#e7e5e4] dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700';
  } else if (info.code === 'recorded') {
    colorClass = 'bg-[#edf7f2] text-[#166534] border-[#bbf7d0] dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${colorClass}`}
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
      <div className="w-5 h-5 rounded-md bg-[#244b38]/10 text-[#244b38] dark:text-emerald-400 flex items-center justify-center shrink-0">
        <Icon className="w-3 h-3" />
      </div>
      <span className="font-semibold text-stone-800 dark:text-stone-200">{labels[type]}</span>
      {preview && (
        <span className="text-stone-500 dark:text-stone-400 truncate max-w-[200px] sm:max-w-[260px]">
          &bull; {preview}
        </span>
      )}
    </div>
  );
}
