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
  getNfsaEntry,
  getOtherCardTypes,
  ruleFromEntry,
  INDIAN_STATES,
  checkNeutrality,
  redactSensitiveIds,
} from '@repo/shared';
import type { LocalHousehold } from '@/lib/localTypes';
import { Lock, Save, ArrowLeft, Volume2, ShieldCheck } from 'lucide-react';

export default function HouseholdSetupPage() {
  const router = useRouter();
  // /household/<id>/edit → id from the real URL (works with the offline page fallback).
  const pathId = usePathSegment(2);
  const editId = pathId && pathId !== 'new' ? pathId : undefined;

  const [label, setLabel] = useState('My household');
  const [cardType, setCardType] = useState<CardType>('PHH');
  /** The state's own name for the card (only for categories other than AAY/PHH). */
  const [cardName, setCardName] = useState<string | null>(null);
  const [members, setMembers] = useState<number>(4);
  const [perUnitKg, setPerUnitKg] = useState<number>(5);
  const [basis, setBasis] = useState<RuleBasis>('perMember');
  const [sourceTitle, setSourceTitle] = useState('National Food Security Act, 2013 — NFSA entitlements');
  const [sourceUrl, setSourceUrl] = useState<string | null>('https://nfsa.gov.in/');
  const [sourceNote, setSourceNote] = useState('National scale; state schemes may differ.');
  const [lastVerified, setLastVerified] = useState<string | null>(null);
  /** Shown when sources disagree about this state's figure. */
  const [caution, setCaution] = useState<string | null>(null);

  const [ruleConfirmed, setRuleConfirmed] = useState(false);
  const [ruleConfirmedAt, setRuleConfirmedAt] = useState<string | null>(null);

  const [stateCode, setStateCode] = useState<string | null>(null);
  const [district, setDistrict] = useState('');
  const [fpsNo, setFpsNo] = useState('');
  const [fpsName, setFpsName] = useState('');
  const [rationCardNo, setRationCardNo] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const stateName = INDIAN_STATES.find((s) => s.code === stateCode)?.name ?? null;
  const otherCards = getOtherCardTypes(stateCode);
  const chosenOther = cardType === 'CUSTOM' ? otherCards.find((e) => e.name === cardName) ?? null : null;

  useEffect(() => {
    if (editId) {
      setLoading(true);
      getLocalHousehold(editId).then((h) => {
        if (h) {
          setLabel(h.label);
          setCardType(h.cardType);
          setCardName(h.cardName ?? null);
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
          if (h.cardType !== 'CUSTOM') setCaution(getNfsaEntry(h.stateCode, h.cardType)?.caution ?? null);
          setDistrict(h.district || '');
          setFpsNo(h.fpsNo || '');
          setFpsName(h.fpsName || '');
          setRationCardNo(h.rationCardNo || '');
        }
        setLoading(false);
      });
    }
  }, [editId]);

  /**
   * Applies a card type. AAY/PHH pre-fill that state's sourced figure (or the national scale);
   * any other card starts with NO figure: the household types it and says where it comes from.
   * Either way the rule is un-confirmed (Principle 1).
   */
  const applyCardType = (type: CardType, state: string | null) => {
    setCardType(type);
    setCardName(null);
    if (type === 'AAY' || type === 'PHH') {
      const entry = getNfsaEntry(state, type);
      const rule = (entry && ruleFromEntry(entry)) ?? getRuleDefault(type);
      if (rule) {
        setPerUnitKg(rule.perUnitKg);
        setBasis(rule.basis);
        setSourceTitle(rule.sourceTitle);
        setSourceUrl(rule.sourceUrl);
        setSourceNote(rule.sourceNote);
        setLastVerified(rule.lastVerified);
      }
      setCaution(entry?.caution ?? null);
    } else {
      setPerUnitKg(0);
      setSourceTitle(`${INDIAN_STATES.find((s) => s.code === state)?.name ?? 'State'} scheme (figure entered by the household)`);
      setSourceUrl(null);
      setSourceNote('');
      setLastVerified(null);
      setCaution(null);
    }
    setRuleConfirmed(false);
    setRuleConfirmedAt(null);
  };

  const handleSelectCardType = (type: CardType) => applyCardType(type, stateCode);

  const handleSelectState = (code: string | null) => {
    setStateCode(code);
    // A different state has different card names and sources: start that card choice again.
    applyCardType(cardType, code);
  };

  const handleSelectOther = (name: string) => {
    setCardName(name || null);
    const entry = otherCards.find((e) => e.name === name);
    setCaution(entry?.caution ?? null);
    setRuleConfirmed(false);
    setRuleConfirmedAt(null);
  };

  const handleMembersChange = (newVal: number) => {
    const clamped = Math.max(1, Math.min(30, newVal));
    setMembers(clamped);
    // Modifying members flips rule back to unconfirmed
    setRuleConfirmed(false);
  };

  const handleKgChange = (val: number) => {
    setPerUnitKg(val);
    setRuleConfirmed(false);
  };

  const handleBasisChange = (b: RuleBasis) => {
    setBasis(b);
    setRuleConfirmed(false);
  };

  const handleSourceNoteChange = (v: string) => {
    setSourceNote(v);
    setRuleConfirmed(false);
  };

  /** Why the rule cannot be confirmed yet, or null when it can. */
  const confirmBlockedReason: string | null =
    perUnitKg <= 0
      ? 'Enter the monthly quantity for your card.'
      : cardType === 'CUSTOM' && !sourceNote.trim()
        ? 'Say where this figure comes from (for example, your state food department order or the shop notice).'
        : null;

  const handleConfirmRule = () => {
    if (confirmBlockedReason) return;
    setRuleConfirmed(true);
    setRuleConfirmedAt(new Date().toISOString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const id = editId || crypto.randomUUID();
      const household: LocalHousehold = {
        id,
        label,
        cardType,
        cardName: cardType === 'CUSTOM' ? cardName : null,
        members,
        rule: {
          perUnitKg,
          basis,
          sourceTitle,
          sourceUrl,
          sourceNote,
          lastVerified,
        },
        ruleConfirmed,
        ruleConfirmedAt,
        stateCode,
        district,
        fpsNo,
        fpsName,
        rationCardNo, // Saved locally in IndexedDB only
      };

      await saveLocalHousehold(household);
      router.push('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {editId ? 'Edit Household & Rule' : 'Household & Rule Setup'}
            </h2>
          </div>
          <ListenButton
            text="Household setup. Select your state, then your card type: Antyodaya, Priority Household, or another card your state issues, enter member count, and explicitly confirm your monthly entitlement rule."
            label="Listen"
          />
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Label */}
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Household Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          {/* State first: it decides the card names and sources shown below */}
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
              Your State / UT
            </label>
            <select
              value={stateCode ?? ''}
              onChange={(e) => handleSelectState(e.target.value || null)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100"
            >
              <option value="">Select your state…</option>
              {INDIAN_STATES.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name}
                </option>
              ))}
            </select>
            {!stateCode && (
              <p className="text-[11px] text-stone-500 mt-1">
                Choose your state to see the card names it uses. You can still continue without it.
              </p>
            )}
          </div>

          {/* Card Type Radio Tiles */}
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-2">
              Ration Card Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  type: 'PHH' as CardType,
                  title: 'Priority (PHH)',
                  desc: '5 kg per member per month (national scale)',
                  stateName: getNfsaEntry(stateCode, 'PHH')?.name,
                },
                {
                  type: 'AAY' as CardType,
                  title: 'Antyodaya (AAY)',
                  desc: '35 kg per family per month (national scale)',
                  stateName: getNfsaEntry(stateCode, 'AAY')?.name,
                },
                {
                  type: 'CUSTOM' as CardType,
                  title: 'Other card',
                  desc: stateName ? `Another card issued in ${stateName}` : 'Any other card or state scheme',
                  stateName: undefined as string | undefined,
                },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleSelectCardType(item.type)}
                  className={`p-3.5 rounded-lg border text-left transition-all ${
                    cardType === item.type
                      ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-700 dark:border-teal-600 ring-2 ring-teal-700'
                      : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {item.title}
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        cardType === item.type
                          ? 'border-teal-700 bg-teal-700'
                          : 'border-stone-400'
                      }`}
                    >
                      {cardType === item.type && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-tight">{item.desc}</p>
                  {item.stateName && (
                    <p className="text-[10px] text-stone-400 leading-tight mt-1">Printed as: {item.stateName}</p>
                  )}
                </button>
              ))}
            </div>

            {/* Other cards: the state's own list. No figure is assumed for any of them. */}
            {cardType === 'CUSTOM' && (
              <div className="mt-3 p-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 space-y-3">
                {otherCards.length > 0 ? (
                  <div>
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                      Which card do you have?
                    </label>
                    <select
                      value={otherCards.some((e) => e.name === cardName) ? cardName ?? '' : cardName ? '__other__' : ''}
                      onChange={(e) => handleSelectOther(e.target.value === '__other__' ? '' : e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded"
                    >
                      <option value="">Select your card…</option>
                      {otherCards.map((e) => (
                        <option key={e.id} value={e.name}>
                          {e.name}
                          {e.code ? ` (${e.code})` : ''}
                        </option>
                      ))}
                      <option value="__other__">My card is not listed</option>
                    </select>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-500">
                    {stateName ? `We have no other card names listed for ${stateName}.` : 'Choose your state to see its card names.'}
                  </p>
                )}
                {(!chosenOther || cardName === null) && (
                  <div>
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                      Card name (as printed on your card)
                    </label>
                    <input
                      type="text"
                      value={cardName ?? ''}
                      maxLength={120}
                      onChange={(e) => setCardName(e.target.value || null)}
                      placeholder="e.g. APL (Farmer)"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded"
                    />
                  </div>
                )}
                {chosenOther && (
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
                    <p>{chosenOther.note}</p>
                    {chosenOther.reference && (
                      <p className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200">
                        {chosenOther.reference.text}{' '}
                        <a href={chosenOther.reference.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                          Source ↗
                        </a>
                      </p>
                    )}
                    <a href={chosenOther.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline text-teal-700 dark:text-teal-400">
                      Where this card is listed ↗
                    </a>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                    Where does your monthly quantity come from?
                  </label>
                  <input
                    type="text"
                    value={sourceNote}
                    maxLength={500}
                    onChange={(e) => handleSourceNoteChange(e.target.value)}
                    placeholder="e.g. state food department order, notice at the shop, SMS"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    No official figure is filled in for this card. Type the quantity below and say where it comes from.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Members on card stepper */}
          <div>
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-2">
              Members on Card (1–30)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleMembersChange(members - 1)}
                className="w-12 h-12 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-lg font-bold flex items-center justify-center transition-colors"
              >
                &minus;
              </button>
              <div className="w-20 text-center font-mono text-2xl font-bold bg-white dark:bg-stone-900 py-2 border border-stone-300 dark:border-stone-700 rounded-lg">
                {members}
              </div>
              <button
                type="button"
                onClick={() => handleMembersChange(members + 1)}
                className="w-12 h-12 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-lg font-bold flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Rule custom inputs if needed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Rule Quantity (kg)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={perUnitKg || ''}
                placeholder={cardType === 'CUSTOM' ? 'Enter kg' : undefined}
                onChange={(e) => handleKgChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Rule Basis
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleBasisChange('perMember')}
                  className={`py-2 text-xs rounded border font-medium ${
                    basis === 'perMember'
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  Per Member
                </button>
                <button
                  type="button"
                  onClick={() => handleBasisChange('perFamily')}
                  className={`py-2 text-xs rounded border font-medium ${
                    basis === 'perFamily'
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  Per Family
                </button>
              </div>
            </div>
          </div>

          {/* RULE CONFIRMATION CARD (HEART OF PRINCIPLE P1) */}
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
            onConfirm={handleConfirmRule}
            caution={caution}
            blockedReason={confirmBlockedReason}
          />

          {/* State & Location details */}
          <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              State &amp; Shop Details (Optional)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="District name"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  FPS (Shop) Number
                </label>
                <input
                  type="text"
                  value={fpsNo}
                  onChange={(e) => setFpsNo(e.target.value)}
                  placeholder="e.g. 0417"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  FPS (Shop) Name
                </label>
                <input
                  type="text"
                  value={fpsName}
                  onChange={(e) => setFpsName(e.target.value)}
                  placeholder="e.g. Shree Ganesh Wajavi Dukan"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded"
                />
              </div>
            </div>

            {/* Ration Card Number - LOCAL STORAGE ONLY */}
            <div className="bg-stone-50 dark:bg-stone-900 p-3.5 rounded-lg border border-stone-300 dark:border-stone-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-700" />
                  <span>Ration Card Number (Local Storage Only)</span>
                </label>
                <span className="text-[10px] text-teal-800 dark:text-teal-400 font-semibold bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded">
                  Stays on this phone
                </span>
              </div>
              <input
                type="text"
                value={rationCardNo}
                onChange={(e) => setRationCardNo(e.target.value)}
                placeholder="e.g. MH2704179920"
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded"
              />
              <p className="text-[11px] text-stone-500">
                Never sent to any server. Stored locally to allow 1-tap copying on official grievance forms.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Household &amp; Settings</span>
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
