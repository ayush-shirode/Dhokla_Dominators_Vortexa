'use client';

import { useApp } from '@/context/AppContext';
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
  const { t } = useApp();
  const router = useRouter();
  const pathId = usePathSegment(2);
  const editId = pathId && pathId !== 'new' ? pathId : undefined;

  const [label, setLabel] = useState(t('household.myHousehold'));
  const [cardType, setCardType] = useState<CardType>('PHH');
  /** The state's own name for the card (only for categories other than AAY/PHH). */
  const [cardName, setCardName] = useState<string | null>(null);
  /** Shown when sources disagree about this state's figure. */
  const [caution, setCaution] = useState<string | null>(null);
  const [members, setMembers] = useState<number>(4);
  const [perUnitKg, setPerUnitKg] = useState<number>(5);
  const [basis, setBasis] = useState<RuleBasis>('perMember');
  const [sourceTitle, setSourceTitle] = useState(t('household.nationalFoodSecurityAct2013'));
  const [sourceUrl, setSourceUrl] = useState<string | null>('https://nfsa.gov.in/');
  const [sourceNote, setSourceNote] = useState(t('household.nationalScaleStateSchemesMay'));
  const [lastVerified, setLastVerified] = useState<string | null>(null);

  const [ruleConfirmed, setRuleConfirmed] = useState(false);
  const [ruleConfirmedAt, setRuleConfirmedAt] = useState<string | null>(null);
  const [isEdited, setIsEdited] = useState(false);

  const [stateCode, setStateCode] = useState<string | null>(null);
  const [district, setDistrict] = useState('');
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
          setCardName(h.cardName ?? null);
          if (h.cardType !== 'CUSTOM') setCaution(getNfsaEntry(h.stateCode, h.cardType)?.caution ?? null);
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

  const stateName = INDIAN_STATES.find((st) => st.code === stateCode)?.name ?? null;
  const otherCards = getOtherCardTypes(stateCode);
  const chosenOther = cardType === 'CUSTOM' ? otherCards.find((e) => e.name === cardName) ?? null : null;

  /**
   * AAY/PHH pre-fill that state's sourced figure (or the national scale). Any other card starts
   * with NO figure: the household types it and says where it comes from. Either way the rule is
   * un-confirmed (Principle 1).
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
      setSourceTitle(t('household.customSourceTitle', { state: INDIAN_STATES.find((st) => st.code === state)?.name ?? t('grievance.state') }));
      setSourceUrl(null);
      setSourceNote('');
      setLastVerified(null);
      setCaution(null);
    }
    setRuleConfirmed(false);
    setRuleConfirmedAt(null);
  };

  const handleSelectCardType = (type: CardType) => {
    applyCardType(type, stateCode);
    setIsEdited(false);
  };

  const handleSelectState = (code: string | null) => {
    setStateCode(code);
    // Another state has other card names and sources: restart the card choice.
    applyCardType(cardType, code);
    setIsEdited(false);
  };

  const handleSelectOther = (name: string) => {
    setCardName(name || null);
    setCaution(otherCards.find((e) => e.name === name)?.caution ?? null);
    setRuleConfirmed(false);
  };

  const handleSourceNoteChange = (v: string) => {
    setSourceNote(v);
    setRuleConfirmed(false);
  };

  /** Why the rule cannot be confirmed yet, or null when it can. */
  const confirmBlockedReason: string | null =
    perUnitKg <= 0
      ? t('household.enterTheMonthlyQuantityFor')
      : cardType === 'CUSTOM' && !sourceNote.trim()
        ? t('household.sayWhereThisFigureComes')
        : null;

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
    if (confirmBlockedReason) return;
    setSaving(true);
    try {
      const id = editId || crypto.randomUUID();
      const now = new Date().toISOString();
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
      setToastMessage(t('household.ruleConfirmedSuccessfully'));

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
                title={t('common.goBack')}
              >
                <ArrowLeft className="w-5 h-5 text-stone-700 dark:text-stone-300" />
              </button>
              <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {editId ? t('household.editRationCardSetup') : t('household.rationCardSetup')}
              </h1>
            </div>
            <ListenButton
              text={t('household.rationCardSetupChooseYour')}
              label={t('actions.listen')}
            />
          </div>
          <p className="text-xs text-stone-500 pl-11 mt-0.5">
            
            {t('household.configureYourCardTypeAnd')}
          </p>
        </div>

        {toastMessage && (
          <div className="p-3 bg-[#edf7f2] border border-[#bbf7d0] text-[#166534] rounded-xl text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* SECTION 0: State first. It decides the card names and sources shown below. */}
        <section className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-5 shadow-subtle space-y-2">
          <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200">{t('household.yourStateUt')}</h2>
          <select
            value={stateCode ?? ''}
            onChange={(e) => handleSelectState(e.target.value || null)}
            className="w-full min-h-[44px] px-3 py-2 text-sm bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
          >
            <option value="">{t('household.selectYourState')}</option>
            {INDIAN_STATES.map((st) => (
              <option key={st.code} value={st.code}>
                {st.name}
              </option>
            ))}
          </select>
          {!stateCode && (
            <p className="text-[11px] text-stone-500">{t('household.chooseYourStateToSee')}</p>
          )}
        </section>

        {/* SECTION 1: Ration Card Type (White card, subtle border) */}
        <section className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-5 shadow-subtle space-y-3">
          <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
            
            {t('household.rationCardType')}
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { type: 'PHH' as CardType, title: t('household.priorityPhh'), desc: '5 kg/member' },
              { type: 'AAY' as CardType, title: t('household.antyodayaAay'), desc: '35 kg/family' },
              { type: 'CUSTOM' as CardType, title: t('household.otherCard'), desc: stateName ? t('household.issuedIn', { state: stateName }) : t('household.stateScheme') },
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

          {(cardType === 'PHH' || cardType === 'AAY') && getNfsaEntry(stateCode, cardType) && (
            <p className="text-[11px] text-stone-500">{t('household.printedAs', { state: stateName ?? '', name: getNfsaEntry(stateCode, cardType)!.name })}</p>
          )}

          {/* Other cards: the state's own list. No figure is assumed for any of them. */}
          {cardType === 'CUSTOM' && (
            <div className="pt-1 space-y-3">
              {otherCards.length > 0 ? (
                <div>
                  <span className="text-[11px] font-medium text-stone-500 block mb-1">{t('household.whichCardDoYouHave')}</span>
                  <select
                    value={otherCards.some((e) => e.name === cardName) ? cardName ?? '' : cardName ? '__other__' : ''}
                    onChange={(e) => handleSelectOther(e.target.value === '__other__' ? '' : e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-xs bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
                  >
                    <option value="">{t('household.selectYourCard')}</option>
                    {otherCards.map((e) => (
                      <option key={e.id} value={e.name}>
                        {e.name}
                        {e.code ? ` (${e.code})` : ''}
                      </option>
                    ))}
                    <option value="__other__">{t('household.myCardIsNotListed')}</option>
                  </select>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500">
                  {stateName ? t('household.noOtherCards', { state: stateName }) : t('household.chooseYourStateToSee2')}
                </p>
              )}
              {!chosenOther && (
                <div>
                  <span className="text-[11px] font-medium text-stone-500 block mb-1">{t('household.cardNameAsPrintedOn')}</span>
                  <input
                    type="text"
                    value={cardName ?? ''}
                    maxLength={120}
                    onChange={(e) => setCardName(e.target.value || null)}
                    placeholder={t('household.eGAplFarmer')}
                    className="w-full min-h-[44px] px-3 py-2 text-xs bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
                  />
                </div>
              )}
              {chosenOther && (
                <div className="text-[11px] text-stone-600 dark:text-stone-400 space-y-1.5">
                  <p>{chosenOther.note}</p>
                  {chosenOther.reference && (
                    <p className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                      {chosenOther.reference.text}{' '}
                      <a href={chosenOther.reference.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        
                        {t('household.source')}
                      </a>
                    </p>
                  )}
                  <a href={chosenOther.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline text-[#244b38] dark:text-emerald-400">
                    
                    {t('household.whereThisCardIsListed')}
                  </a>
                </div>
              )}
              <div>
                <span className="text-[11px] font-medium text-stone-500 block mb-1">{t('household.whereDoesYourMonthlyQuantity')}</span>
                <input
                  type="text"
                  value={sourceNote}
                  maxLength={500}
                  onChange={(e) => handleSourceNoteChange(e.target.value)}
                  placeholder={t('household.eGStateFoodDepartment')}
                  className="w-full min-h-[44px] px-3 py-2 text-xs bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
                />
                <p className="text-[11px] text-stone-500 mt-1">{t('household.noOfficialFigureIsFilled')}</p>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 2: Members Stepper (White card, subtle border) */}
        <section className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-5 shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                
                {t('household.householdMembersOnCard1')}
              </h2>
              <p className="text-[11px] text-stone-500 mt-0.5">{t('household.listedOnYourOfficialRation')}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <button
              type="button"
              onClick={() => handleMembersChange(members - 1)}
              disabled={members <= 1}
              className="w-12 h-12 rounded-xl bg-[#FAF8F1] hover:bg-[#eae6d9] dark:bg-stone-800 border border-[#E8E5DD] text-stone-800 dark:text-stone-100 flex items-center justify-center font-bold text-lg transition-all disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              title={t('household.decreaseMembers')}
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
              title={t('household.increaseMembers')}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* SECTION 3: Rule Basis Toggle & Quantity (White card, subtle border) */}
        <section className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-5 shadow-subtle space-y-3">
          <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
            
            {t('household.ruleBasisEntitlementQuantity')}
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
              
              {t('household.perMember')}
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
              
              {t('household.perFamily')}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-stone-600">{t(basis === 'perMember' ? 'household.quantityPerMember' : 'household.quantityPerFamily')}</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={perUnitKg || ''}
                placeholder={t('common.kg')}
                onChange={(e) => handleKgChange(parseFloat(e.target.value) || 0)}
                className="w-20 min-h-[40px] px-3 py-1.5 text-center text-sm font-mono font-bold bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              />
              <span className="text-xs text-stone-500">{t('common.kg')}</span>
            </div>
          </div>
        </section>

        {/* SECTION 4: State, District & Shop Details (White card, subtle border) */}
        <section className="bg-white dark:bg-[#202622] border border-[#E8E5DD] dark:border-stone-800 rounded-2xl p-5 shadow-subtle space-y-3">
          <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200">
            
            {t('household.districtShopFpsDetails')}
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            <div>
              <span className="text-[11px] font-medium text-stone-500 block mb-1">{t('common.district')}</span>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={t('household.districtName')}
                className="w-full min-h-[44px] px-3 py-2 text-xs bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <span className="text-[11px] font-medium text-stone-500 block mb-1">{t('household.shopFpsNumber')}</span>
              <input
                type="text"
                value={fpsNo}
                onChange={(e) => setFpsNo(e.target.value)}
                placeholder="e.g. 0417"
                className="w-full min-h-[44px] px-3 py-2 text-xs font-mono bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              />
            </div>

            <div>
              <span className="text-[11px] font-medium text-stone-500 block mb-1">{t('household.shopName')}</span>
              <input
                type="text"
                value={fpsName}
                onChange={(e) => setFpsName(e.target.value)}
                placeholder={t('household.eGRationStore12')}
                className="w-full min-h-[44px] px-3 py-2 text-xs bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              />
            </div>
          </div>

          {/* Masked Ration Card Number */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#244b38]" />
                <span>{t('household.rationCardNumber')}</span>
              </span>
              <span className="text-[10px] text-[#244b38] font-medium bg-[#edf7f2] px-2 py-0.5 rounded-full">
                
                {t('common.phoneLock')}
              </span>
            </div>
            <input
              type="text"
              value={rationCardNo}
              onChange={(e) => setRationCardNo(e.target.value)}
              placeholder={t('household.enterFullNumber')}
              className="w-full min-h-[44px] px-3 py-2 text-xs font-mono bg-[#FAF8F1] dark:bg-stone-950 border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            />
            {rationCardNo && (
              <p className="text-[11px] text-stone-500 mt-1 font-mono">
                
                {t('household.displayFormat', { last4: lastFour })}
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
            caution={caution}
            blockedReason={confirmBlockedReason}
          />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
