'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathSegment } from '@/lib/routeParams';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { RuleCard } from '@/components/RuleCard';
import { getLocalHousehold, saveLocalHousehold } from '@/lib/db';
import {
  CardType,
  RuleBasis,
  getRuleDefault,
  INDIAN_STATES,
} from '@repo/shared';
import type { LocalHousehold } from '@/lib/localTypes';
import {
  Lock,
  ArrowLeft,
  Check,
  Minus,
  Plus,
} from 'lucide-react';

export default function HouseholdSetupPage() {
  const router = useRouter();
  const pathId = usePathSegment(2);
  const editId = pathId && pathId !== 'new' ? pathId : undefined;

  const [label, setLabel] = useState('My household');
  const [cardType, setCardType] = useState<CardType>('PHH');
  const [members, setMembers] = useState<number>(4);
  const [perUnitKg, setPerUnitKg] = useState<number>(5);
  const [basis, setBasis] = useState<RuleBasis>('perMember');
  const [sourceTitle, setSourceTitle] = useState('National Food Security Act, 2013 — NFSA entitlements');
  const [sourceUrl, setSourceUrl] = useState<string | null>('https://nfsa.gov.in/');
  const [sourceNote, setSourceNote] = useState('National scale; state schemes may differ.');
  const [lastVerified, setLastVerified] = useState<string | null>('12 Apr 2025');

  const [ruleConfirmed, setRuleConfirmed] = useState(false);
  const [ruleConfirmedAt, setRuleConfirmedAt] = useState<string | null>(null);
  const [isEdited, setIsEdited] = useState(false);

  const [stateCode, setStateCode] = useState<string | null>('MH');
  const [district, setDistrict] = useState('Pune');
  const [fpsNo, setFpsNo] = useState('');
  const [fpsName, setFpsName] = useState('');
  const [rationCardNo, setRationCardNo] = useState('');

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editId) {
      getLocalHousehold(editId).then((h) => {
        if (h) {
          setLabel(h.label);
          setCardType(h.cardType);
          setMembers(h.members);
          setPerUnitKg(h.rule.perUnitKg);
          setBasis(h.rule.basis);
          setSourceTitle(h.rule.sourceTitle);
          setSourceUrl(h.rule.sourceUrl);
          setSourceNote(h.rule.sourceNote);
          setLastVerified(h.rule.lastVerified);
          setRuleConfirmed(h.ruleConfirmed);
          setRuleConfirmedAt(h.ruleConfirmedAt);
          setStateCode(h.stateCode);
          setDistrict(h.district || '');
          setFpsNo(h.fpsNo || '');
          setFpsName(h.fpsName || '');
          setRationCardNo(h.rationCardNo || '');
        }
      });
    }
  }, [editId]);

  const handleSelectCardType = (type: CardType) => {
    setCardType(type);
    const defaults = getRuleDefault(type);
    if (defaults) {
      setPerUnitKg(defaults.perUnitKg);
      setBasis(defaults.basis);
      setSourceTitle(defaults.sourceTitle);
      setSourceUrl(defaults.sourceUrl);
      setSourceNote(defaults.sourceNote);
      setLastVerified(defaults.lastVerified);
    } else {
      setSourceTitle('State / custom scheme');
      setSourceUrl(null);
      setSourceNote('');
      setLastVerified(null);
    }
    setRuleConfirmed(false);
    setIsEdited(true);
  };

  const handleMembersChange = (newVal: number) => {
    const clamped = Math.max(1, Math.min(30, newVal));
    setMembers(clamped);
    setRuleConfirmed(false);
    setIsEdited(true);
  };

  const handleBasisToggle = (newBasis: RuleBasis) => {
    setBasis(newBasis);
    setRuleConfirmed(false);
    setIsEdited(true);
  };

  const handleKgChange = (newKg: number) => {
    setPerUnitKg(newKg);
    setRuleConfirmed(false);
    setIsEdited(true);
  };

  const handleConfirmRuleAndSave = async () => {
    setSaving(true);
    try {
      const id = editId || crypto.randomUUID();
      const now = new Date().toISOString();
      const household: LocalHousehold = {
        id,
        label,
        cardType,
        members,
        rule: {
          perUnitKg,
          basis,
          sourceTitle,
          sourceUrl,
          sourceNote,
          lastVerified,
        },
        ruleConfirmed: true,
        ruleConfirmedAt: now,
        stateCode,
        district,
        fpsNo,
        fpsName,
        rationCardNo,
      };

      await saveLocalHousehold(household);
      setRuleConfirmed(true);
      setRuleConfirmedAt(now);
      setToastMessage('Rule confirmed successfully!');

      setTimeout(() => {
        router.push('/?notice=rule_confirmed');
      }, 700);
    } finally {
      setSaving(false);
    }
  };

  const lastFour = rationCardNo.length >= 4 ? rationCardNo.slice(-4) : rationCardNo;

  return (
    <div className="flex-1 flex flex-col font-sans pb-32">
      <Header />

      <main className="flex-1 w-full px-4 py-5 space-y-4">
        {/* Page Heading: Back button, heading, Listen on same row, explanation below */}
        <div className="border-b border-[#E8E5DD] dark:border-stone-800 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#244b38]"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-stone-700 dark:text-stone-300" />
              </button>
              <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {editId ? 'Edit Ration Card Setup' : 'Ration Card Setup'}
              </h1>
            </div>
            <ListenButton
              text="Ration card setup. Choose your card type, number of members, state and shop details, and confirm your statutory entitlement rule."
              label="Listen"
            />
          </div>
          <p className="text-xs text-stone-500 pl-11 mt-0.5">
            Configure your card type and family members to verify statutory entitlements.
          </p>
        </div>

        {toastMessage && (
          <div className="p-3 bg-[#edf7f2] border border-[#bbf7d0] text-[#166534] rounded-xl text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* SECTION 1: Ration Card Type (White card, subtle border) */}
        <section className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-5 shadow-subtle space-y-3">
          <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
            Ration Card Type
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { type: 'PHH' as CardType, title: 'Priority (PHH)', desc: '5 kg/member' },
              { type: 'AAY' as CardType, title: 'Antyodaya (AAY)', desc: '35 kg/family' },
              { type: 'CUSTOM' as CardType, title: 'Other / State', desc: 'Custom scale' },
            ].map((item) => {
              const isSelected = cardType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleSelectCardType(item.type)}
                  className={`min-h-[64px] p-2.5 rounded-xl text-center transition-all focus:outline-none focus:ring-2 focus:ring-[#244b38] relative flex flex-col justify-center items-center ${
                    isSelected
                      ? 'border-2 border-[#244b38] bg-[#edf7f2] dark:bg-emerald-950/40 text-[#1c3d2e]'
                      : 'border border-[#E8E5DD] dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#244b38] text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                  <div className="text-xs font-semibold leading-tight">{item.title}</div>
                  <div className="text-[10px] text-stone-500 mt-1">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: Members Stepper (White card, subtle border) */}
        <section className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-5 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                Household Members on Card (1–30)
              </h2>
              <p className="text-[11px] text-stone-500 mt-0.5">Listed on your official ration card</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              onClick={() => handleMembersChange(members - 1)}
              disabled={members <= 1}
              className="w-12 h-12 rounded-xl bg-[#FAF8F1] hover:bg-[#eae6d9] dark:bg-stone-800 border border-[#E8E5DD] text-stone-800 dark:text-stone-100 flex items-center justify-center font-bold text-lg transition-all disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              title="Decrease members"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="w-20 h-12 bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl flex items-center justify-center font-mono font-bold text-2xl text-[#1c3d2e] dark:text-stone-100">
              {members}
            </div>

            <button
              type="button"
              onClick={() => handleMembersChange(members + 1)}
              disabled={members >= 30}
              className="w-12 h-12 rounded-xl bg-[#FAF8F1] hover:bg-[#eae6d9] dark:bg-stone-800 border border-[#E8E5DD] text-stone-800 dark:text-stone-100 flex items-center justify-center font-bold text-lg transition-all disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              title="Increase members"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* SECTION 3: Rule Basis Toggle & Quantity (White card, subtle border) */}
        <section className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-5 shadow-subtle space-y-3">
          <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
            Rule Basis &amp; Entitlement Quantity
          </h2>

          <div className="grid grid-cols-2 p-1 bg-[#FAF8F1] dark:bg-stone-900 rounded-xl border border-[#E8E5DD]">
            <button
              type="button"
              onClick={() => handleBasisToggle('perMember')}
              className={`min-h-[40px] text-xs font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
                basis === 'perMember'
                  ? 'bg-white dark:bg-stone-800 text-[#1c3d2e] dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Per Member
            </button>
            <button
              type="button"
              onClick={() => handleBasisToggle('perFamily')}
              className={`min-h-[40px] text-xs font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#244b38] ${
                basis === 'perFamily'
                  ? 'bg-white dark:bg-stone-800 text-[#1c3d2e] dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Per Family
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-stone-600">Quantity per {basis === 'perMember' ? 'member' : 'family'}:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={perUnitKg}
                onChange={(e) => handleKgChange(parseFloat(e.target.value) || 0)}
                className="w-20 min-h-[40px] px-3 py-1.5 text-center text-sm font-mono font-bold bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              />
              <span className="text-xs text-stone-500">kg</span>
            </div>
          </div>
        </section>

        {/* SECTION 4: State, District & Shop Details (White card, subtle border) */}
        <section className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-5 shadow-subtle space-y-3">
          <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
            State, District &amp; Shop (FPS) Details
          </h2>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <span className="text-[11px] font-medium text-stone-500 block mb-1">State</span>
              <select
                value={stateCode ?? ''}
                onChange={(e) => setStateCode(e.target.value || null)}
                className="w-full min-h-[44px] px-3 py-2 text-xs bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              >
                <option value="">Select state…</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[11px] font-medium text-stone-500 block mb-1">District</span>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Pune"
                className="w-full min-h-[44px] px-3 py-2 text-xs bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <span className="text-[11px] font-medium text-stone-500 block mb-1">Shop / FPS Number</span>
              <input
                type="text"
                value={fpsNo}
                onChange={(e) => setFpsNo(e.target.value)}
                placeholder="e.g. 0417"
                className="w-full min-h-[44px] px-3 py-2 text-xs font-mono bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              />
            </div>

            <div>
              <span className="text-[11px] font-medium text-stone-500 block mb-1">Shop Name</span>
              <input
                type="text"
                value={fpsName}
                onChange={(e) => setFpsName(e.target.value)}
                placeholder="e.g. Ration Store 12"
                className="w-full min-h-[44px] px-3 py-2 text-xs bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              />
            </div>
          </div>

          {/* Masked Ration Card Number */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#244b38]" />
                <span>Ration Card Number</span>
              </span>
              <span className="text-[10px] text-[#244b38] font-medium bg-[#edf7f2] px-2 py-0.5 rounded-full">
                Stays on this phone
              </span>
            </div>
            <input
              type="text"
              value={rationCardNo}
              onChange={(e) => setRationCardNo(e.target.value)}
              placeholder="Enter full number"
              className="w-full min-h-[44px] px-3 py-2 text-xs font-mono bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            />
            {rationCardNo && (
              <p className="text-[11px] text-stone-500 mt-1 font-mono">
                Display format: •••• •••• {lastFour}
              </p>
            )}
          </div>
        </section>

        {/* SECTION 5: Statutory Rule Card */}
        <section>
          <RuleCard
            cardType={cardType}
            members={members}
            rule={{
              perUnitKg,
              basis,
              sourceTitle,
              sourceUrl,
              sourceNote,
              lastVerified,
            }}
            isConfirmed={ruleConfirmed}
            confirmedDate={ruleConfirmedAt}
            isEdited={isEdited}
            onConfirm={handleConfirmRuleAndSave}
            showActions={true}
          />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
