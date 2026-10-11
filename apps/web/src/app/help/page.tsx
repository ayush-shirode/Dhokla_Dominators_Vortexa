'use client';

import React, { useState } from 'react';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { FAQ, CAUSE_REDIRECT, isCauseQuestion, matchFaq, checkNeutrality } from '@repo/shared';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { Send, Volume2, HelpCircle, Bot, Sparkles } from 'lucide-react';

interface ChatMsg {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: 'faq' | 'ai' | 'guardrail';
}

export function HelpPageContent() {
  const { speak, lang, capabilities, aiConsent, requestCloudConsent } = useApp();
  const [aiOfferFor, setAiOfferFor] = useState<string | null>(null);
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

  const handleSend = async (textToSend?: string, forceCloud = false) => {
    const q = (textToSend || input).trim();
    if (!q) return;

    setAiOfferFor(null);
    if (!forceCloud) {
      const userMsg: ChatMsg = { id: crypto.randomUUID(), sender: 'user', text: q };
      setMessages((prev) => [...prev, userMsg]);
    }
    if (!textToSend) setInput('');
    const add = (text: string, source: ChatMsg['source']) =>
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: 'assistant', text, source }]);

    // Scope guardrail (Spec §5.6): never discuss why a specific difference happened or who is to blame.
    if (isCauseQuestion(q) || !checkNeutrality(q).ok) {
      add(t(CAUSE_REDIRECT), 'guardrail');
      return;
    }

    // Online: the server answers from the FAQ first and applies the same guardrails.
    // AI answers only with consent ("Always allow" in Settings, or a one-off yes).
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
    add(
      matched
        ? t(matched.entry.answer)
        : lang === 'hi'
          ? 'मैं राशनसाथी के इस्तेमाल और शिकायत की प्रक्रिया से जुड़े सवालों के जवाब दे सकता हूँ। नीचे दिए सवालों में से कोई चुनें।'
          : 'I can answer questions about how RationSaathi works and the grievance process. Try one of the questions below.',
      'faq',
    );
  };

  const askAi = async () => {
    if (!aiOfferFor) return;
    const q = aiOfferFor;
    if (await requestCloudConsent('cloudAssist')) await handleSend(q, true);
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans pb-24">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full space-y-5">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Plain-Language Explainer &amp; FAQ
            </h2>
            <p className="text-xs text-stone-500">
              Instant answers about NFSA rules, ledger terms, and grievance steps.
            </p>
          </div>
          <ListenButton
            text="Help and explainer page. Tap quick question chips or type a question to get instant plain-language explanations."
            label="Listen"
          />
        </div>

        {aiOfferFor && (
          <div className="p-3 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs flex items-center justify-between gap-3">
            <span>No built-in answer matched. Ask the AI assistant? It explains process only.</span>
            <button type="button" onClick={askAi} className="px-3 py-1.5 bg-teal-700 text-white rounded font-medium shrink-0">
              Ask AI
            </button>
          </div>
        )}

        {/* Quick Question Chips */}
        <div>
          <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1.5">
            Quick Questions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {FAQ.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSend(t(f.question))}
                className="px-2.5 py-1 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:border-teal-600 rounded-full text-stone-700 dark:text-stone-300 font-medium transition-colors"
              >
                {t(f.question)}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Stream */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 shadow-xs min-h-[360px] flex flex-col justify-between space-y-4">
          <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed ${
                      isUser
                        ? 'bg-teal-700 text-white rounded-br-none'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-bl-none border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <p>{m.text}</p>
                  </div>

                  {!isUser && (
                    <div className="flex items-center gap-2 text-[10px] text-stone-400">
                      {m.source === 'ai' && (
                        <span className="bg-stone-200 dark:bg-stone-700 px-1.5 py-0.2 rounded font-medium">
                          AI answer &bull; process explainer
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => speak(m.text)}
                        className="hover:text-teal-700 flex items-center gap-0.5"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Listen</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask a question about your ration..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 px-3 py-2 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-2 bg-teal-700 hover:bg-teal-800 text-white rounded transition-colors disabled:opacity-50"
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
