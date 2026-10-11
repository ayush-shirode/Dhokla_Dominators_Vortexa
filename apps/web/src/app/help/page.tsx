'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { FAQ, CAUSE_REDIRECT, isCauseQuestion, matchFaq, checkNeutrality } from '@repo/shared';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { Send, Volume2, ArrowLeft, Shield } from 'lucide-react';

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
  const { speak, lang, capabilities, aiConsent, setAiConsent } = useApp();
  const [showConsentModal, setShowConsentModal] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! I am your RationSaathi plain-language assistant. Ask me questions about ration rules, labels like Unrecorded or Unclear, DGRO officers, or filing your grievance.',
      source: 'faq',
    },
  ]);
  const [input, setInput] = useState('');

  const t = (x: { en: string; hi: string }) => (lang === 'hi' ? x.hi : x.en);

  const handleSend = async (textToSend?: string, allowCloudOverride?: boolean) => {
    const q = (textToSend || input).trim();
    if (!q) return;

    if (!allowCloudOverride) {
      const userMsg: ChatMsg = { id: crypto.randomUUID(), sender: 'user', text: q };
      setMessages((prev) => [...prev, userMsg]);
    }
    if (!textToSend) setInput('');

    const add = (text: string, source: ChatMsg['source'], formula?: ChatMsg['formula']) =>
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: 'assistant', text, source, formula }]);

    // Guardrail: never assign blame or discuss corrupt/scam causes
    if (isCauseQuestion(q) || !checkNeutrality(q).ok) {
      add(t(CAUSE_REDIRECT), 'guardrail');
      return;
    }

    const allowCloud = allowCloudOverride ?? (capabilities.cloudAi && aiConsent.cloudAssist);

    try {
      const reply = await api.ai.chat({ messages: [{ role: 'user', content: q }], language: lang, allowCloud });
      add(reply.reply, reply.source === 'ai' ? 'ai' : reply.source === 'guardrail' ? 'guardrail' : 'faq');
      if (reply.source === 'fallback' && capabilities.cloudAi && !allowCloud) {
        setShowConsentModal(q);
      }
      return;
    } catch {
      // Offline fallback
    }

    const matched = matchFaq(q, lang);
    if (matched) {
      add(t(matched.entry.answer), 'faq');
    } else {
      add(
        lang === 'hi'
          ? 'मैं राशनसाथी के इस्तेमाल और शिकायत की प्रक्रिया से जुड़े सवालों के जवाब दे सकता हूँ। नीचे दिए सवालों में से कोई चुनें।'
          : 'I can answer questions about how RationSaathi works and the grievance process. Try one of the questions below.',
        'faq',
      );
    }
  };

  const handleConsentChoice = (choice: 'once' | 'always' | 'cancel') => {
    const q = showConsentModal;
    setShowConsentModal(null);
    if (choice === 'once' && q) {
      handleSend(q, true);
    } else if (choice === 'always' && q) {
      setAiConsent({ ...aiConsent, cloudAssist: true });
      handleSend(q, true);
    }
  };

  const quickPills = [
    'What is my monthly entitlement?',
    'What does Unrecorded mean?',
    'What does Unclear mean?',
    'What does a DGRO officer do?',
    'How do I file my grievance?',
  ];

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-[#141716] text-[#1c1917] dark:text-stone-100 flex flex-col font-sans pb-28">
      <Header />

      <main className="flex-1 max-w-md mx-auto px-4 py-5 w-full flex flex-col space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#eee7db] dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            </button>
            <h2 className="text-base font-extrabold text-[#1c3d2e] dark:text-stone-100">
              Plain-Language Assistant
            </h2>
          </div>
          <ListenButton
            text="RationSaathi plain-language assistant. Ask questions about rules, ledger labels, or grievance filing steps."
            label="Listen"
          />
        </div>

        {/* 3-CHOICE CLOUD AI CONSENT MODAL */}
        {showConsentModal && (
          <div className="p-4 rounded-3xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-xs space-y-3 shadow-warm">
            <div className="flex items-center gap-2 font-extrabold text-amber-900">
              <Shield className="w-4 h-4 text-amber-700" />
              <span>Allow Cloud Assistance for this Question?</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              No local answer matched. Would you like to consult the cloud assistant for procedural assistance? ID numbers are always blacked out before sending.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleConsentChoice('once')}
                className="min-h-[44px] py-2 px-2 bg-[#244b38] text-white rounded-xl font-extrabold text-[11px] text-center"
              >
                Send once
              </button>
              <button
                type="button"
                onClick={() => handleConsentChoice('always')}
                className="min-h-[44px] py-2 px-2 bg-white border border-[#244b38] text-[#244b38] rounded-xl font-extrabold text-[11px] text-center"
              >
                Always allow
              </button>
              <button
                type="button"
                onClick={() => handleConsentChoice('cancel')}
                className="min-h-[44px] py-2 px-2 bg-stone-200 text-stone-700 rounded-xl font-bold text-[11px] text-center"
              >
                No, I&apos;ll type it
              </button>
            </div>
          </div>
        )}

        {/* Suggestion Chips */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none flex gap-1.5">
          {quickPills.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(p)}
              className="min-h-[40px] whitespace-nowrap px-3.5 py-1.5 text-xs bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 hover:border-[#244b38] rounded-full text-stone-700 dark:text-stone-300 font-bold transition-colors shadow-2xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#244b38]"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Chat Stream Window */}
        <div className="flex-1 bg-white dark:bg-stone-900 border border-[#eee7db] dark:border-stone-800 rounded-3xl p-4 shadow-warm flex flex-col justify-between min-h-[360px] space-y-4">
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
                      🌾
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
                    </div>

                    {!isUser && (
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 px-1">
                        <button
                          type="button"
                          onClick={() => speak(m.text)}
                          className="min-h-[36px] hover:text-[#244b38] flex items-center gap-1 font-bold"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <div className="pt-3 border-t border-[#eee7db] dark:border-stone-800 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask a question about your ration rules..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 min-h-[48px] px-4 py-2.5 text-xs bg-[#fbf9f4] dark:bg-stone-950 border border-[#eee7db] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#244b38] font-medium"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="min-h-[48px] min-w-[48px] bg-[#244b38] hover:bg-[#1b3a2b] text-white rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#244b38]"
              title="Send question"
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
