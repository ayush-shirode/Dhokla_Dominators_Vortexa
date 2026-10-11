'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { RuleCard } from '@/components/RuleCard';
import { getLocalHousehold, saveLocalHousehold } from '@/lib/db';
import {
  CardType,
  RuleBasis,
  Household,
  getRuleDefault,
  INDIAN_STATES,
  checkNeutrality,
  redactSensitiveIds,
} from '@repo/shared';
import { Lock, Save, ArrowLeft, Volume2, ShieldCheck } from 'lucide-react';

export default function HouseholdSetupPage() {
  const router = useRouter();
  const params = useParams();
  const editId = params?.id as string | undefined;

  const [label, setLabel] = useState('My household');
  const [cardType, setCardType] = useState<CardType>('PHH');
  const [members, setMembers] = useState<number>(4);
  const [perUnitKg, setPerUnitKg] = useState<number>(5);
  const [basis, setBasis] = useState<RuleBasis>('perMember');
  const [sourceTitle, setSourceTitle] = useState('National Food Security Act, 2013 — NFSA entitlements');
  const [sourceUrl, setSourceUrl] = useState<string | null>('https://nfsa.gov.in/');
  const [sourceNote, setSourceNote] = useState('National scale; state schemes may differ.');
  const [lastVerified, setLastVerified] = useState<string | null>(null);

  const [ruleConfirmed, setRuleConfirmed] = useState(false);
  const [ruleConfirmedAt, setRuleConfirmedAt] = useState<string | null>(null);

  const [stateCode, setStateCode] = useState('MH');
  const [district, setDistrict] = useState('Pune');
  const [fpsNo, setFpsNo] = useState('');
  const [fpsName, setFpsName] = useState('');
  const [rationCardNo, setRationCardNo] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      setLoading(true);
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
        setLoading(false);
      });
    }
  }, [editId]);

  const handleSelectCardType = (type: CardType) => {
    setCardType(type);
    const defaults = getRuleDefault(type);
    setPerUnitKg(defaults.perUnitKg);
    setBasis(defaults.basis);
    setSourceTitle(defaults.sourceTitle);
    setSourceUrl(defaults.sourceUrl);
    setSourceNote(defaults.sourceNote);
    setLastVerified(defaults.lastVerified);
    // Any change to cardType un-confirms the rule
    setRuleConfirmed(false);
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

  const handleConfirmRule = () => {
    setRuleConfirmed(true);
    setRuleConfirmedAt(new Date().toISOString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const id = editId || crypto.randomUUID();
      const household: Household = {
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
            text="Household setup. Select your card type: Antyodaya or Priority Household, enter member count, and explicitly confirm your monthly entitlement rule."
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
                  desc: '5 kg per member per month',
                },
                {
                  type: 'AAY' as CardType,
                  title: 'Antyodaya (AAY)',
                  desc: '35 kg per family per month',
                },
                {
                  type: 'CUSTOM' as CardType,
                  title: 'Other / State',
                  desc: 'Custom entitlement scale',
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
                </button>
              ))}
            </div>
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
                value={perUnitKg}
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
          />

          {/* State & Location details */}
          <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              State &amp; Shop Details (Optional)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  State
                </label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Pune"
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
