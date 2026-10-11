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
  checkNeutrality,
  redactSensitiveIds,
} from '@repo/shared';
import type { LocalHousehold } from '@/lib/localTypes';
import {
  Lock,
  Save,
  ArrowLeft,
  Volume2,
  ShieldCheck,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  age: number;
}

export default function HouseholdSetupPage() {
  const router = useRouter();
  const pathId = usePathSegment(2);
  const editId = pathId && pathId !== 'new' ? pathId : undefined;

  const [activeTab, setActiveTab] = useState<'details' | 'entitlement'>('details');

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

  const [stateCode, setStateCode] = useState<string | null>('MH');
  const [district, setDistrict] = useState('Pune');
  const [fpsNo, setFpsNo] = useState('');
  const [fpsName, setFpsName] = useState('');
  const [rationCardNo, setRationCardNo] = useState('');

  // Sample family members initialized to match mockup Screen 5
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    { id: '1', name: 'Suresh Kumar', relation: 'Self (Head)', age: 42 },
    { id: '2', name: 'Asha Devi', relation: 'Wife', age: 38 },
    { id: '3', name: 'Rahul Kumar', relation: 'Son', age: 12 },
    { id: '4', name: 'Priya Kumar', relation: 'Daughter', age: 8 },
  ]);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('Member');
  const [newMemberAge, setNewMemberAge] = useState<number>(20);
  const [showAddMember, setShowAddMember] = useState(false);

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
  };

  const handleMembersChange = (newVal: number) => {
    const clamped = Math.max(1, Math.min(30, newVal));
    setMembers(clamped);
    setRuleConfirmed(false);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const newM: FamilyMember = {
      id: crypto.randomUUID(),
      name: newMemberName.trim(),
      relation: newMemberRelation.trim(),
      age: Number(newMemberAge) || 18,
    };
    const updated = [...familyMembers, newM];
    setFamilyMembers(updated);
    setMembers(updated.length);
    setNewMemberName('');
    setShowAddMember(false);
    setRuleConfirmed(false);
  };

  const handleRemoveMember = (id: string) => {
    if (familyMembers.length <= 1) return;
    const updated = familyMembers.filter((m) => m.id !== id);
    setFamilyMembers(updated);
    setMembers(updated.length);
    setRuleConfirmed(false);
  };

  const handleConfirmRule = () => {
    setRuleConfirmed(true);
    setRuleConfirmedAt(new Date().toISOString());
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const id = editId || crypto.randomUUID();
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
        ruleConfirmed,
        ruleConfirmedAt,
        stateCode,
        district,
        fpsNo,
        fpsName,
        rationCardNo,
      };

      await saveLocalHousehold(household);
      router.push('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full space-y-5">
        {/* Header Strip with Back Link */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            </button>
            <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
              {activeTab === 'details' ? 'Household Details' : 'Entitlement'}
            </h2>
          </div>
          <ListenButton
            text="Household and entitlement setup. View your family members and confirm your statutory grain entitlement."
            label="Listen"
          />
        </div>

        {/* Segmented Control Tabs Matching Mockup Screen 5 & 6 */}
        <div className="grid grid-cols-2 p-1 bg-[#ede8dc] dark:bg-stone-900 rounded-2xl border border-[#e2dacf] dark:border-stone-800">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
              activeTab === 'details'
                ? 'bg-white dark:bg-stone-800 text-[#1c3d2e] dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Household Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('entitlement')}
            className={`py-2 text-xs font-extrabold rounded-xl transition-all ${
              activeTab === 'entitlement'
                ? 'bg-white dark:bg-stone-800 text-[#1c3d2e] dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Entitlement
          </button>
        </div>

        {/* TAB 1: Household Details (Screen 5) */}
        {activeTab === 'details' && (
          <div className="space-y-5">
            {/* Family Members Card */}
            <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#1c3d2e] dark:text-stone-100">
                  Family Members ({familyMembers.length})
                </h3>
                <span className="text-[11px] text-stone-500 font-medium">On ration card</span>
              </div>

              {/* Members List with Avatars Matching Screen 5 */}
              <div className="divide-y divide-[#eee7db] dark:divide-stone-800">
                {familyMembers.map((member) => (
                  <div key={member.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ffedd5] dark:bg-amber-950/50 text-[#c2410c] dark:text-amber-300 flex items-center justify-center font-bold text-sm shadow-2xs">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {member.name}{' '}
                          <span className="text-stone-400 font-normal">({member.relation})</span>
                        </div>
                        <div className="text-[11px] text-stone-500 font-medium">{member.age} yrs</div>
                      </div>
                    </div>
                    {familyMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Member Drawer / Inputs */}
              {showAddMember ? (
                <div className="p-3.5 bg-[#fbf9f4] dark:bg-stone-950 rounded-2xl border border-[#eee7db] space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Name (e.g. Meena)"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-[#eee7db] rounded-xl font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Relation (e.g. Mother)"
                      value={newMemberRelation}
                      onChange={(e) => setNewMemberRelation(e.target.value)}
                      className="px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-[#eee7db] rounded-xl font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Age"
                      value={newMemberAge}
                      onChange={(e) => setNewMemberAge(parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-2 text-xs bg-white dark:bg-stone-900 border border-[#eee7db] rounded-xl font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddMember}
                      className="flex-1 py-2 bg-[#244b38] text-white text-xs font-bold rounded-xl"
                    >
                      Add to Household
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="px-3 py-2 text-xs text-stone-500 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="w-full py-3 bg-white dark:bg-stone-900 hover:bg-[#fbf9f4] text-[#244b38] dark:text-emerald-400 border border-[#244b38]/30 dark:border-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {/* Ration Card Details Card Matching Screen 5 */}
            <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
              <h3 className="text-sm font-extrabold text-[#1c3d2e] dark:text-stone-100">
                Ration Card Details
              </h3>

              {/* Card Type Selection */}
              <div>
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-2">
                  Card Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'PHH' as CardType, title: 'PHH', desc: 'Priority' },
                    { type: 'AAY' as CardType, title: 'AAY', desc: 'Antyodaya' },
                    { type: 'CUSTOM' as CardType, title: 'Other', desc: 'State rule' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleSelectCardType(item.type)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        cardType === item.type
                          ? 'bg-[#edf7f2] dark:bg-emerald-950/40 border-[#244b38] ring-2 ring-[#244b38] text-[#244b38] font-extrabold'
                          : 'bg-[#fbf9f4] dark:bg-stone-950 border-[#eee7db] text-stone-700'
                      }`}
                    >
                      <div className="text-xs">{item.title}</div>
                      <div className="text-[10px] text-stone-400">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ration Card Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#244b38]" />
                    <span>Ration Card No.</span>
                  </label>
                  <span className="text-[10px] text-[#244b38] font-bold bg-[#edf7f2] px-2 py-0.5 rounded-full">
                    Stored locally
                  </span>
                </div>
                <input
                  type="text"
                  value={rationCardNo}
                  onChange={(e) => setRationCardNo(e.target.value)}
                  placeholder="e.g. MH-1234567890"
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100"
                />
              </div>

              {/* State & District */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    State
                  </label>
                  <select
                    value={stateCode ?? ''}
                    onChange={(e) => setStateCode(e.target.value || null)}
                    className="w-full px-3 py-2 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] rounded-xl font-medium"
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
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Buldhana"
                    className="w-full px-3 py-2 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Shop Details */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    FPS / Shop No.
                  </label>
                  <input
                    type="text"
                    value={fpsNo}
                    onChange={(e) => setFpsNo(e.target.value)}
                    placeholder="e.g. 0417"
                    className="w-full px-3 py-2 text-xs font-mono bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    value={fpsName}
                    onChange={(e) => setFpsName(e.target.value)}
                    placeholder="e.g. Ration Store 12"
                    className="w-full px-3 py-2 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] rounded-xl font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Continue to Entitlement Button */}
            <button
              type="button"
              onClick={() => setActiveTab('entitlement')}
              className="w-full py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>View Entitlement &rarr;</span>
            </button>
          </div>
        )}

        {/* TAB 2: Entitlement (Screen 6) */}
        {activeTab === 'entitlement' && (
          <div className="space-y-5">
            {/* Card Badge Matching Screen 6 */}
            <div className="bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-5 shadow-warm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#edf7f2] dark:bg-emerald-950/60 text-[#244b38] dark:text-emerald-400 flex items-center justify-center font-bold text-base">
                    💳
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-stone-900 dark:text-stone-100 block">
                      {cardType} Card
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      {cardType === 'PHH'
                        ? 'Priority Household'
                        : cardType === 'AAY'
                        ? 'Antyodaya Anna Yojana'
                        : 'State Specific Scheme'}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#edf7f2] text-[#166534] border border-[#bbf7d0]">
                  Active
                </span>
              </div>

              {/* Monthly Commodity Breakdown Matching Screen 6 */}
              <div className="pt-2 border-t border-[#eee7db] dark:border-stone-800 space-y-2">
                <span className="text-xs font-extrabold text-stone-700 dark:text-stone-300 block">
                  Grain entitlement (per month)
                </span>
                <div className="divide-y divide-[#eee7db] dark:divide-stone-800 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-stone-700 dark:text-stone-300">Rice</span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      {cardType === 'AAY' ? '20 kg' : `${members * 3} kg`}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-stone-700 dark:text-stone-300">Wheat</span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                      {cardType === 'AAY' ? '15 kg' : `${members * 2} kg`}
                    </span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-stone-700 dark:text-stone-300">Sugar</span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">1 kg</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="font-medium text-stone-700 dark:text-stone-300">Kerosene</span>
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-100">3 L</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statutory Rule Confirmation Box (Screen 6 highlight box & Principle P1) */}
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

            {/* Confirm & Save Button Matching Screen 6 */}
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="w-full py-4 bg-[#244b38] hover:bg-[#1b3a2b] text-white font-extrabold text-xs rounded-2xl shadow-warm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm &amp; Continue</span>
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
