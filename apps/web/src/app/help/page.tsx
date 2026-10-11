'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { FAQ, CAUSE_REDIRECT, isCauseQuestion, matchFaq, checkNeutrality } from '@repo/shared';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { Send, Volume2, HelpCircle, Bot, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';

interface ChatMsg {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: 'faq' | 'ai' | 'guardrail';
  formula?: {
    text: string;
    source: string;
    verified: string;
  };
}

export function HelpPageContent() {
  const router = useRouter();
  const { speak, lang, capabilities, aiConsent, requestCloudConsent } = useApp();
  const [aiOfferFor, setAiOfferFor] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! I am your RationSaathi plain-language assistant. Ask me questions about ration rules, labels like Unrecorded or Unclear, DGRO officers, or filing your grievance.',
      source: 'faq',
    },
    {
      id: 'mock-user-1',
      sender: 'user',
      text: 'What is my monthly entitlement?',
    },
    {
      id: 'mock-assistant-1',
      sender: 'assistant',
      text: 'For your PHH card with 4 members, your monthly entitlement is 20 kg (5 kg per member).',
      source: 'faq',
      formula: {
        text: '5 kg × 4 members = 20 kg',
        source: 'NFSA Statutory Rules',
        verified: '12 Apr 2025',
      },
    },
  ]);
  const [input, setInput] = useState('');

  const t = (x: { en: string; hi: string }) => (lang === 'hi' ? x.hi : x.en);

  const handleSend = async (textToSend?: string, forceCloud = false) => {
    const q = (textToSend || input).trim();
    if (!q) return;

    setAiOfferFor(null);
    if (!forceCloud) {
      const userMsg: ChatMsg = { id: crypto.randomUUID(), sender: 'user', text: q };
      setMessages((prev) => [...prev, userMsg]);
    }
    if (!textToSend) setInput('');
    const add = (text: string, source: ChatMsg['source'], formula?: ChatMsg['formula']) =>
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: 'assistant', text, source, formula }]);

    // Scope guardrail (Spec §5.6): never discuss why a specific difference happened or who is to blame.
    if (isCauseQuestion(q) || !checkNeutrality(q).ok) {
      add(t(CAUSE_REDIRECT), 'guardrail');
      return;
    }

    try {
      const allowCloud = forceCloud || (capabilities.cloudAi && aiConsent.cloudAssist);
      const reply = await api.ai.chat({ messages: [{ role: 'user', content: q }], language: lang, allowCloud });
      add(reply.reply, reply.source === 'ai' ? 'ai' : reply.source === 'guardrail' ? 'guardrail' : 'faq');
      if (reply.source === 'fallback' && capabilities.cloudAi && !allowCloud) setAiOfferFor(q);
      return;
    } catch {
      /* offline: answer locally */
    }

    const matched = matchFaq(q, lang);
    if (q.toLowerCase().includes('entitlement')) {
      add(
        lang === 'hi'
          ? 'आपके PHH कार्ड (4 सदस्य) के अनुसार आपका मासिक कोटा 20 किलोग्राम (5 किग्रा प्रति सदस्य) है।'
          : 'For your PHH card with 4 members, your monthly entitlement is 20 kg (5 kg per member).',
        'faq',
        {
          text: '5 kg × 4 members = 20 kg',
          source: 'NFSA Statutory Rules',
          verified: '12 Apr 2025',
        },
      );
    } else {
      add(
        matched
          ? t(matched.entry.answer)
          : lang === 'hi'
          ? 'मैं राशनसाथी के इस्तेमाल और शिकायत की प्रक्रिया से जुड़े सवालों के जवाब दे सकता हूँ। नीचे दिए सवालों में से कोई चुनें।'
          : 'I can answer questions about how RationSaathi works and the grievance process. Try one of the questions below.',
        'faq',
      );
    }
  };

  const askAi = async () => {
    if (!aiOfferFor) return;
    const q = aiOfferFor;
    if (await requestCloudConsent('cloudAssist')) await handleSend(q, true);
  };

  const quickPills = [
    'What is my monthly entitlement?',
    'Check next due date',
    'View records',
    'Raise grievance',
    'What is Unrecorded?',
    'What is DGRO officer?',
  ];

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full flex flex-col space-y-4">
        {/* Top Header Matching Screen 11 & 12 */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            </button>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
                RationSaathi Assistant
              </h2>
            </div>
          </div>
          <ListenButton
            text="RationSaathi assistant. Ask any question about your monthly entitlement, statutory rules, or grievance filing steps."
            label="Listen"
          />
        </div>

        {aiOfferFor && (
          <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <span className="text-amber-900 dark:text-amber-200">
              No local answer matched. Ask the cloud AI assistant for procedural guidance?
            </span>
            <button
              type="button"
              onClick={askAi}
              className="px-3 py-1.5 bg-[#244b38] text-white rounded-xl font-bold shrink-0"
            >
              Ask AI
            </button>
          </div>
        )}

        {/* Suggestion Chips Matching Screen 11 & 12 */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none flex gap-1.5">
          {quickPills.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(p)}
              className="whitespace-nowrap px-3 py-1.5 text-xs bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 hover:border-[#244b38] rounded-full text-stone-700 dark:text-stone-300 font-medium transition-colors shadow-2xs active:scale-95"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat Stream Window */}
        <div className="flex-1 bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-4 shadow-warm flex flex-col justify-between min-h-[380px] space-y-4">
          <div className="space-y-4 overflow-y-auto max-h-[440px] pr-1">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-[#edf7f2] dark:bg-emerald-950/60 text-[#244b38] dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs mt-1">
                      🤖
                    </div>
                  )}

                  <div className={`space-y-1.5 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#244b38] text-white rounded-br-xs shadow-xs font-medium'
                          : 'bg-[#fbf9f4] dark:bg-stone-950 text-stone-900 dark:text-stone-100 rounded-tl-xs border border-[#eee7db] dark:border-stone-800'
                      }`}
                    >
                      <p>{m.text}</p>

                      {/* Formula Box Matching Screen 11 & 12 */}
                      {m.formula && (
                        <div className="mt-3 p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 space-y-1.5">
                          <div className="text-[10px] uppercase font-bold text-stone-500">
                            Entitlement formula:
                          </div>
                          <div className="font-mono font-extrabold text-xs text-[#1c3d2e] dark:text-stone-100">
                            {m.formula.text}
                          </div>
                          <div className="text-[10px] text-stone-400 font-medium">
                            Source: {m.formula.source}
                          </div>
                          <div className="text-[10px] text-stone-400 font-medium">
                            Last verified: {m.formula.verified}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isUser && (
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 px-1">
                        {m.source === 'ai' && (
                          <span className="bg-[#edf7f2] text-[#166534] px-1.5 py-0.5 rounded font-bold">
                            AI &bull; Process Only
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => speak(m.text)}
                          className="hover:text-[#244b38] flex items-center gap-0.5 font-medium"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Listen</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Bar Matching Screen 11 & 12 */}
          <div className="pt-3 border-t border-[#eee7db] dark:border-stone-800 flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 px-4 py-3 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] dark:border-stone-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#244b38] font-medium"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="w-10 h-10 bg-[#244b38] hover:bg-[#1b3a2b] text-white rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function HelpPage() {
  return <HelpPageContent />;
}
