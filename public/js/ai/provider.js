import { pick } from '../utils.js';
import { analyze, detectLanguage, hindiToEnglishHint } from './grammar.js';
import { vocabUpgrades } from './vocab.js';

const FORMAL_MAP = [
  [/\bwent\b/gi, 'visited'], [/\bbought\b/gi, 'purchased'], [/\bsaid\b/gi, 'mentioned'],
  [/\btold\b/gi, 'informed'], [/\bwant to\b/gi, 'would like to'], [/\bhelp\b/gi, 'assist'],
  [/\bneed to\b/gi, 'require'], [/\bbig\b/gi, 'significant'], [/\bgood\b/gi, 'excellent']
];

function formalise(t) {
  let o = t;
  for (const [re, rep] of FORMAL_MAP) o = o.replace(re, m => (m[0] === m[0].toUpperCase() && m.length > 1) ? rep[0].toUpperCase() + rep.slice(1) : rep);
  return o;
}

function alternatives(corrected) {
  const alts = {};
  if (!corrected) return alts;
  const endTime = corrected.match(/^(.*?)\s+(yesterday|today|this morning|this afternoon|last night|last week|last month|last year)\s*\.?$/i);
  if (endTime) {
    const time = endTime[2][0].toUpperCase() + endTime[2].slice(1);
    const rest = endTime[1].trim();
    alts.native = `${time}, ${rest[0].toLowerCase() + rest.slice(1)}.`;
  } else if (/^i\s/i.test(corrected) && corrected.length > 20) {
    alts.native = 'Actually, ' + corrected[0].toLowerCase() + corrected.slice(1);
  }
  const formal = formalise(corrected);
  if (formal !== corrected && formal !== alts.native) alts.professional = formal;
  return alts;
}

export const AI = {
  name: 'LocalTutorAI',

  async detectLanguage(text) { return detectLanguage(text); },
  async analyzeGrammar(text) { return analyze(text); },

  async generateCorrection(original, corrected, mistakes, vocab) {
    if ((!mistakes || !mistakes.length) && (!vocab || !vocab.length)) return { interrupt: false, speech: '', display: null };
    const reasons = [];
    const seen = new Set();
    (mistakes || []).forEach(m => {
      const k = m.explanation || m.label;
      if (!seen.has(k)) { seen.add(k); reasons.push(k); }
    });
    const openers = ['Ah, close —', 'Hmm, not quite —', 'Almost —', 'Wait, hold on —', 'Okay, small thing —'];
    const parts = [pick(openers)];
    if (reasons.length === 1) parts.push(reasons[0]);
    else if (reasons.length > 1) reasons.forEach((r, i) => parts.push(`${i === 0 ? 'First' : i === 1 ? 'Second' : 'And'} — ${r}`));
    parts.push(`Say it once: "${corrected}"`);

    let vocabLine = '';
    if (vocab && vocab.length) {
      const v = vocab[0];
      vocabLine = `And a nicer word — instead of "${v.from}", try "${v.to}". ${v.note}.`;
    }

    return {
      interrupt: true,
      speech: parts.join(' ') + (vocabLine ? ' ' + vocabLine : ''),
      display: { original, corrected, reasons, alternatives: alternatives(corrected), vocab: vocab || [] }
    };
  },

  async generateHindiAssist(text) {
    const hint = hindiToEnglishHint(text);
    if (hint) {
      const clean = hint.replace(/___/g, '').trim();
      return {
        speech: `You said that in Hindi. In English, you'd say: "${clean}" Try saying it in English.`,
        display: { original: text, corrected: clean, reasons: ['The tutor always speaks English — even when you speak Hindi.'], alternatives: {} }
      };
    }
    return {
      speech: `That was Hindi. Let's try it in English. How would you say that?`,
      display: { original: text, corrected: 'Try it in English', reasons: ['Think in English first, then say it out loud.'], alternatives: {} }
    };
  },

  async evaluateSpeaking(s) {
    const m = s.mistakes || [];
    const high = m.filter(x => x.severity === 'high').length;
    const med = m.filter(x => x.severity === 'medium').length;
    const low = m.filter(x => x.severity === 'low').length;
    const grammar = Math.max(35, Math.min(100, Math.round(100 - high * 9 - med * 4 - low * 1.5)));
    const unique = new Set((s.words || []).map(w => w.toLowerCase()));
    const variety = s.wordCount ? unique.size / s.wordCount : 0;
    const vocabulary = Math.max(35, Math.min(100, Math.round(48 + variety * 110)));
    const minutes = Math.max(s.duration / 60, 0.15);
    const wpm = s.wordCount / minutes;
    const fluency = Math.max(30, Math.min(100, Math.round(35 + (wpm / 120) * 70)));
    const conf = s.confidences?.length ? s.confidences.reduce((a, b) => a + b, 0) / s.confidences.length : null;
    const pronunciation = conf != null ? Math.max(30, Math.min(100, Math.round(conf * 130))) : null;
    const turns = Math.max(s.turnCount, 1);
    const clean = Math.max(0, Math.min(1, 1 - (high + med * 0.5) / turns));
    const confidence = Math.max(35, Math.min(100, Math.round(45 + clean * 45 + Math.min(s.turnCount, 12) * 0.8)));
    return { grammar, vocabulary, fluency, pronunciation, confidence, wpm: Math.round(wpm) };
  },

  vocabUpgrades
};