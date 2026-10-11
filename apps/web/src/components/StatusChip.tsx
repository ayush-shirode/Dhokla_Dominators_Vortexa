'use client';

import React from 'react';
import type { OverallLabel, RecordLabel } from '@repo/shared';

interface StatusChipProps {
  label: OverallLabel | RecordLabel | 'counted' | 'open' | 'filed' | 'reported';
}

// Specification rule: Only four labels exist: Shortfall, Late, Unrecorded, Unclear.
// No red alarm colours; use amber for shortfall.
export function StatusChip({ label }: StatusChipProps) {
  const norm = String(label).toLowerCase();

  if (norm === 'shortfall') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
        Shortfall
      </span>
    );
  }

  if (norm === 'late') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#fefce8] text-[#854d0e] border border-[#fef08a]">
        Late
      </span>
    );
  }

  if (norm === 'unrecorded') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1]">
        Unrecorded
      </span>
    );
  }

  if (norm === 'unclear') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#f3f4f6] text-[#374151] border border-[#d1d5db]">
        Unclear
      </span>
    );
  }

  if (norm === 'counted') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-[#edf7f2] text-[#166534] border border-[#bbf7d0]">
        Counted
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-stone-100 text-stone-700 border border-stone-200">
      {label}
    </span>
  );
}
