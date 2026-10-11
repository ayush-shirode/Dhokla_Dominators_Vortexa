/**
 * Built-in plain-language explainer content (process questions only, Spec §5.6).
 * Used offline by the frontend and as the first answer source by POST /ai/chat.
 * Every answer must pass checkNeutrality() — enforced by tests.
 */
import type { LanguageCode } from './types.js';

export interface FaqEntry {
  id: string;
  keywords: string[];
  question: { en: string; hi: string };
  answer: { en: string; hi: string };
}

export const FAQ: FaqEntry[] = [
  {
    id: 'what-is-unrecorded',
    keywords: ['unrecorded', 'no evidence', 'not counted', 'बिना प्रमाण', 'proof'],
    question: { en: 'What does "Unrecorded" mean?', hi: '"बिना प्रमाण" का क्या मतलब है?' },
    answer: {
      en: 'Unrecorded means you said you received some grain, but no slip number, SMS, photo or note is linked to it. Such records are listed in the report but not counted in the total, because there is nothing to show for them. If you find a slip or SMS later, edit the record and add it.',
      hi: 'बिना प्रमाण का मतलब है कि आपने अनाज मिलने की बात दर्ज की, पर उसके साथ कोई पर्ची संख्या, SMS, फोटो या नोट नहीं जुड़ा है। ऐसे रिकॉर्ड रिपोर्ट में दिखते हैं पर कुल में गिने नहीं जाते। बाद में पर्ची या SMS मिले तो रिकॉर्ड में जोड़ दें।',
    },
  },
  {
    id: 'what-is-unclear',
    keywords: ['unclear', 'unsure', 'not sure', 'अस्पष्ट', 'low confidence'],
    question: { en: 'What does "Unclear" mean?', hi: '"अस्पष्ट" का क्या मतलब है?' },
    answer: {
      en: 'Unclear means a record is marked as unsure: either you ticked "I\'m not sure", or a value read from a photo or voice was not checked by you. Unclear records are not counted until you confirm them.',
      hi: 'अस्पष्ट का मतलब है कि रिकॉर्ड अनिश्चित चिह्नित है: या तो आपने "मुझे पक्का नहीं पता" चुना, या फोटो/आवाज़ से पढ़ा गया मान आपने जाँचा नहीं। पुष्टि होने तक इन्हें गिना नहीं जाता।',
    },
  },
  {
    id: 'what-is-late',
    keywords: ['late', 'outside period', 'next month', 'अवधि से बाहर'],
    question: { en: 'What does "Late" mean?', hi: '"अवधि से बाहर" का क्या मतलब है?' },
    answer: {
      en: 'Late means the date of a record falls outside the month you are checking — for example, October\'s grain collected on 3 November. The record is still counted for the month you are checking; the label only notes the date.',
      hi: 'इसका मतलब है कि रिकॉर्ड की तारीख जाँचे जा रहे महीने से बाहर है — जैसे अक्टूबर का अनाज 3 नवंबर को मिला। रिकॉर्ड फिर भी उसी महीने में गिना जाता है; लेबल सिर्फ तारीख बताता है।',
    },
  },
  {
    id: 'what-is-shortfall',
    keywords: ['shortfall', 'less', 'difference', 'कमी', 'kam'],
    question: { en: 'What does "Shortfall" mean?', hi: '"कमी" का क्या मतलब है?' },
    answer: {
      en: 'Shortfall means the counted quantity you received is less than the entitlement under the rule you confirmed. It describes the numbers only. It does not say why the difference exists — that is for the shop and the grievance officer to look into.',
      hi: 'कमी का मतलब है कि गिनी गई प्राप्त मात्रा आपके पुष्टि किए गए नियम की पात्रता से कम है। यह सिर्फ संख्याएँ बताता है, अंतर का कारण नहीं — कारण देखना दुकान और शिकायत अधिकारी का काम है।',
    },
  },
  {
    id: 'after-filing',
    keywords: ['after', 'filed', 'file', 'next', 'what happens', 'status', 'शिकायत के बाद', 'complaint'],
    question: { en: 'What happens after I file a grievance?', hi: 'शिकायत दर्ज करने के बाद क्या होता है?' },
    answer: {
      en: 'The portal gives you a reference number. Save it in RationSaathi. Your grievance goes to the officials responsible for your area, who may look into it and respond. You can check its status on the official portal using the reference number. If you are not satisfied, the National Food Security Act provides for a District Grievance Redressal Officer (DGRO) and a State Food Commission.',
      hi: 'पोर्टल आपको एक संदर्भ संख्या देता है — उसे राशनसाथी में सहेज लें। आपकी शिकायत आपके क्षेत्र के संबंधित अधिकारियों के पास जाती है, जो उसकी जाँच कर जवाब दे सकते हैं। संदर्भ संख्या से आप आधिकारिक पोर्टल पर स्थिति देख सकते हैं। संतुष्ट न होने पर, राष्ट्रीय खाद्य सुरक्षा अधिनियम में जिला शिकायत निवारण अधिकारी (DGRO) और राज्य खाद्य आयोग की व्यवस्था है।',
    },
  },
  {
    id: 'what-is-dgro',
    keywords: ['dgro', 'district grievance', 'redressal officer', 'जिला शिकायत'],
    question: { en: 'What is a DGRO?', hi: 'DGRO क्या है?' },
    answer: {
      en: 'DGRO stands for District Grievance Redressal Officer. Under the National Food Security Act, 2013, each district has an officer who hears grievances about entitlements under the Act. Your state food department or its helpline can tell you who the DGRO is for your district. Check the details in the channel directory, and note that entries may not be verified.',
      hi: 'DGRO का मतलब है जिला शिकायत निवारण अधिकारी। राष्ट्रीय खाद्य सुरक्षा अधिनियम, 2013 के तहत हर जिले में एक अधिकारी होता है जो पात्रता से जुड़ी शिकायतें सुनता है। आपके जिले के DGRO की जानकारी राज्य खाद्य विभाग या उसकी हेल्पलाइन से मिल सकती है।',
    },
  },
  {
    id: 'find-fps-number',
    keywords: ['fps number', 'shop number', 'fps', 'fair price shop', 'दुकान संख्या', 'dukan'],
    question: { en: 'Where do I find my FPS (shop) number?', hi: 'मुझे अपनी राशन दुकान (FPS) की संख्या कहाँ मिलेगी?' },
    answer: {
      en: 'The fair price shop (FPS) number is often printed on your ration card, on the e-PoS slip you get at the shop, or in the SMS sent after distribution. Many state food department websites also let you look up your card details, including the shop it is attached to.',
      hi: 'उचित मूल्य दुकान (FPS) की संख्या अक्सर आपके राशन कार्ड पर, दुकान से मिलने वाली ई-पॉस पर्ची पर, या वितरण के बाद आने वाले SMS में होती है। कई राज्यों की खाद्य विभाग वेबसाइट पर कार्ड की जानकारी, जिसमें दुकान भी शामिल है, देखी जा सकती है।',
    },
  },
  {
    id: 'what-is-entitlement',
    keywords: ['entitlement', 'how much', 'aay', 'phh', 'antyodaya', 'priority', 'पात्रता', 'kitna'],
    question: { en: 'How much am I entitled to?', hi: 'मुझे कितना राशन मिलना चाहिए?' },
    answer: {
      en: 'Under the national NFSA scale, Priority Household (PHH) cards get 5 kg of foodgrains per member per month, and Antyodaya (AAY) cards get 35 kg per family per month. Your state may give more under its own scheme. RationSaathi shows the national figure as a starting point and lets you change it — the calculation uses only the rule you confirm.',
      hi: 'राष्ट्रीय NFSA पैमाने पर प्राथमिक परिवार (PHH) कार्ड को प्रति सदस्य प्रति माह 5 किलो और अंत्योदय (AAY) कार्ड को प्रति परिवार प्रति माह 35 किलो खाद्यान्न मिलता है। आपका राज्य अपनी योजना में ज़्यादा दे सकता है। राशनसाथी राष्ट्रीय आंकड़ा शुरुआत के लिए दिखाता है और आप उसे बदल सकते हैं — गणना सिर्फ आपके पुष्टि किए नियम से होती है।',
    },
  },
  {
    id: 'why-otp',
    keywords: ['otp', 'aadhaar', 'submit', 'why can', 'apne aap', 'login'],
    question: { en: 'Why can\'t RationSaathi submit the grievance for me?', hi: 'राशनसाथी मेरी शिकायत खुद क्यों नहीं भेज सकता?' },
    answer: {
      en: 'The official portal asks for an OTP sent to your Aadhaar-linked mobile. Only you should enter it, on the official website. RationSaathi never asks for your Aadhaar number or OTP. It prepares the text and fields so you can copy them across and submit yourself.',
      hi: 'आधिकारिक पोर्टल आपके आधार से जुड़े मोबाइल पर OTP भेजता है, जिसे सिर्फ आपको आधिकारिक वेबसाइट पर डालना चाहिए। राशनसाथी कभी आपका आधार नंबर या OTP नहीं माँगता। वह सिर्फ पाठ और जानकारी तैयार करता है ताकि आप खुद कॉपी करके शिकायत भेज सकें।',
    },
  },
  {
    id: 'what-evidence',
    keywords: ['evidence', 'slip', 'receipt', 'sms', 'photo', 'what to attach', 'प्रमाण', 'पर्ची'],
    question: { en: 'What counts as evidence?', hi: 'प्रमाण के रूप में क्या मान्य है?' },
    answer: {
      en: 'Any of these: the number on the e-PoS slip, the SMS you got after collection, a photo of the slip or SMS, or your own note written at the time. If you have nothing, you can still add the record as "No evidence" — it will be listed but not counted.',
      hi: 'इनमें से कुछ भी: ई-पॉस पर्ची की संख्या, अनाज लेने के बाद आया SMS, पर्ची या SMS की फोटो, या उसी समय लिखा आपका अपना नोट। कुछ न हो तो भी रिकॉर्ड "कोई प्रमाण नहीं" के रूप में जोड़ सकते हैं — वह दिखेगा पर गिना नहीं जाएगा।',
    },
  },
  {
    id: 'data-privacy',
    keywords: ['privacy', 'data', 'safe', 'ration card number', 'delete', 'गोपनीयता'],
    question: { en: 'Is my data safe?', hi: 'क्या मेरी जानकारी सुरक्षित है?' },
    answer: {
      en: 'Your records are saved on your phone and backed up without your ration card number. Aadhaar numbers are removed from text and blacked out in photos before saving. AI features send data only when you tap them. You can delete everything from Settings.',
      hi: 'आपके रिकॉर्ड फोन पर सहेजे जाते हैं और राशन कार्ड नंबर के बिना बैकअप होते हैं। आधार नंबर पाठ से हटाए जाते हैं और फोटो में ढक दिए जाते हैं। AI सुविधाएँ तभी डेटा भेजती हैं जब आप उन्हें चुनते हैं। सेटिंग्स से आप सब कुछ मिटा सकते हैं।',
    },
  },
];

/** Questions about the cause of a specific discrepancy, or blame. The chatbot must redirect these. */
const CAUSE_QUESTION_RE =
  /\b(why|reason|cause|kyon|kyu|kyun|kaaran)\b.{0,60}\b(less|short|kam|missing|didn'?t get|not get|nahi mila|cut)\b|\b(less|short|kam)\b.{0,40}\b(why|kyon|kyu|kyun)\b|\b(is|was|did)\b.{0,30}\b(dealer|shopkeeper|shop|fps|official|officer|dukandar)\b.{0,40}\b(cheat|steal|stole|lie|lying|honest|corrupt|fraud|wrong)|\b(cheat|steal|stole|fraud|corrupt|chor|chori|ghotala)\w*|क्यों.{0,40}(कम|नहीं मिला)|(कम|नहीं मिला).{0,30}क्यों|चोरी|धोखा|घोटाला|बेईमान/iu;

export function isCauseQuestion(text: string): boolean {
  return CAUSE_QUESTION_RE.test(text);
}

export const CAUSE_REDIRECT: { en: string; hi: string } = {
  en: 'RationSaathi can\'t say why a difference happened, and doesn\'t guess. It only shows the arithmetic and your evidence. A difference can have many causes — a stock shortage, an e-PoS or biometric failure, a delivery split across visits, or a recording error. Finding the cause is for the shop and the grievance process. If you want it looked into, you can prepare a grievance from your report and file it on the official portal.',
  hi: 'राशनसाथी यह नहीं बता सकता कि अंतर क्यों हुआ, और अनुमान भी नहीं लगाता। यह सिर्फ गणना और आपके प्रमाण दिखाता है। अंतर के कई कारण हो सकते हैं — स्टॉक की कमी, ई-पॉस या बायोमेट्रिक में दिक्कत, कई बार में वितरण, या दर्ज करने में गलती। कारण देखना दुकान और शिकायत प्रक्रिया का काम है। आप अपनी रिपोर्ट से शिकायत तैयार करके आधिकारिक पोर्टल पर दर्ज कर सकते हैं।',
};

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** Keyword match against the FAQ. Returns null when nothing matches well enough. */
export function matchFaq(question: string, _lang: LanguageCode = 'en'): { entry: FaqEntry; score: number } | null {
  const q = question.toLowerCase();
  const qTokens = new Set(tokens(question));
  let best: { entry: FaqEntry; score: number } | null = null;
  for (const entry of FAQ) {
    let score = 0;
    for (const kw of entry.keywords) {
      const k = kw.toLowerCase();
      if (k.includes(' ') ? q.includes(k) : qTokens.has(k) || (!/^[a-z]+$/.test(k) && q.includes(k))) score += k.includes(' ') ? 2 : 1;
    }
    const qq = tokens(entry.question.en);
    const overlap = qq.filter((w) => qTokens.has(w) && w.length > 3).length;
    score += overlap * 0.5;
    if (!best || score > best.score) best = { entry, score };
  }
  return best && best.score >= 1 ? best : null;
}

export function faqAnswer(entry: FaqEntry, lang: LanguageCode): string {
  return lang === 'hi' ? entry.answer.hi : entry.answer.en;
}
