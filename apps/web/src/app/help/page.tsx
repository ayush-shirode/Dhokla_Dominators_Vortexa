'use client';

import React, { useState } from 'react';
import { Header, BottomNav, ListenButton } from '@/components/Navigation';
import { FAQ, FaqEntry, matchFaq, checkNeutrality } from '@repo/shared';
import { useApp } from '@/context/AppContext';
import { Send, Volume2, HelpCircle, Bot, Sparkles } from 'lucide-react';

interface ChatMsg {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: 'faq' | 'ai' | 'guardrail';
}

export function HelpPageContent() {
  const { speak } = useApp();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! I am your RationSaathi plain-language assistant. Ask me questions about ration rules, labels like Unrecorded or Unclear, DGRO officers, or filing your grievance.',
      source: 'faq',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q) return;

    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // Check neutrality guardrail (Principle P5 / P6)
    const neutrality = checkNeutrality(q);
    if (!neutrality.ok) {
      setTimeout(() => {
        const reply: ChatMsg = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          text: 'RationSaathi calculates plain arithmetic differences between your entitlement and received grain. We explain rules and help you prepare grievances, but we never allege wrongdoing or assign blame. Please describe what you received.',
          source: 'guardrail',
        };
        setMessages((prev) => [...prev, reply]);
      }, 300);
      return;
    }

    // Match FAQ locally (works offline)
    const matched = matchFaq(q);
    setTimeout(() => {
      let replyText = '';
      if (matched) {
        replyText = matched.entry.answer;
      } else {
        replyText =
          'I am an informational assistant for the National Food Security Act (NFSA). You can check your entitlement rules (PHH: 5 kg per member, AAY: 35 kg per family), log records with slips, and prepare complaint descriptions. Check our FAQ chips below for common topics.';
      }

      const reply: ChatMsg = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: replyText,
        source: matched ? 'faq' : 'ai',
      };
      setMessages((prev) => [...prev, reply]);
    }, 400);
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
                onClick={() => handleSend(f.question)}
                className="px-2.5 py-1 text-xs bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:border-teal-600 rounded-full text-stone-700 dark:text-stone-300 font-medium transition-colors"
              >
                {f.question}
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
