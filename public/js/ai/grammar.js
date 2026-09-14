import { uid } from '../utils.js';

const IRREGULAR = {
  go:'went', buy:'bought', eat:'ate', see:'saw', meet:'met', come:'came', take:'took',
  make:'made', do:'did', get:'got', have:'had', say:'said', tell:'told', think:'thought',
  feel:'felt', know:'knew', give:'gave', find:'found', write:'wrote', read:'read',
  run:'ran', drink:'drank', sleep:'slept', speak:'spoke', wake:'woke', begin:'began',
  leave:'left', pay:'paid', send:'sent', teach:'taught', understand:'understood'
};
export const toBase = (v) => {
  const l = v.toLowerCase();
  if (l.endsWith('ies')) return l.slice(0, -3) + 'y';
  if (/(goes|does|watches|passes|fixes|misses|teaches|catches)$/.test(l)) return l.slice(0, -2);
  if (l.endsWith('s') && !l.endsWith('ss')) return l.slice(0, -1);
  return l;
};
export const toPast = (v) => {
  const b = toBase(v);
  if (IRREGULAR[b]) return IRREGULAR[b];
  if (/e$/.test(b)) return b + 'd';
  if (/[^aeiou]y$/.test(b)) return b.slice(0, -1) + 'ied';
  return b + 'ed';
};
export const thirdPerson = (v) => {
  const l = v.toLowerCase();
  if (l === 'have') return 'has';
  if (l === 'do') return 'does';
  if (l === 'go') return 'goes';
  if (/(ch|sh|ss|x|z)$/.test(l)) return l + 'es';
  if (/[^aeiou]y$/.test(l)) return l.slice(0, -1) + 'ies';
  return l + 's';
};

const PRESENT_VERBS = 'go|goes|buy|buys|eat|eats|see|sees|meet|meets|come|comes|take|takes|make|makes|do|does|get|gets|have|has|say|says|tell|tells|think|thinks|feel|feels|know|knows|give|gives|find|finds|write|writes|read|reads|run|runs|drink|drinks|sleep|sleeps|speak|speaks|watch|watches|play|plays|study|studies|work|works|call|calls|visit|visits|talk|talks|walk|walks|shop|shops|cook|cooks|travel|travels|wake|wakes|help|helps|learn|learns|drive|drives|fly|flies|listen|listens';

const RULES = [
  { id:'didnt-past', cat:'Grammar', sev:'high', label:"Base verb after 'didn't'",
    explain:(m,n,v)=>`After "${n}", use the base verb — "${n} ${toBase(v)}".`,
    re:/\b(didn't|did not)\s+(went|came|ate|bought|saw|met|took|made|got|had|said|told|thought|felt|knew|gave|found|wrote|ran|drank|slept|spoke)\b/gi,
    fix:(m,n,v)=>`${n} ${toBase(v)}` },
  { id:'did-you-past', cat:'Grammar', sev:'high', label:"Base verb after 'did you'",
    explain:(m,a,v)=>`With "${a}", use the base verb — "${a} ${toBase(v)}?"`,
    re:/\b(did (?:you|he|she|they|we))\s+(went|came|ate|bought|saw|met|took|made|got|had|said|told)\b/gi,
    fix:(m,a,v)=>`${a} ${toBase(v)}` },
  { id:'have-pp', cat:'Grammar', sev:'high', label:'Past participle after have/has',
    explain:()=>`After "have/has", use the past participle — "have gone", not "have went".`,
    re:/\b(have|has)\s+(went|came|ate|bought|saw|met|took|made|got|said|told|gave|found|wrote)\b/gi,
    fix:(m,a,v)=>`${a} ${IRREGULAR[toBase(v)] || v}` },
  { id:'am-base', cat:'Grammar', sev:'high', label:'Continuous form after am/is/are',
    explain:(m,a)=>`After "${a}", use -ing — "${a} going", not "${a} go".`,
    re:/\b(i am|i'm|he is|he's|she is|she's|they are|they're|we are|we're|you are|you're)\s+(go|come|eat|study|work|play|watch|read|write|run|talk|speak|learn|do|make|take)\b/gi,
    fix:(m,a,v)=>`${a} ${v.replace(/e$/,'')}ing` },
  { id:'third-dont', cat:'Grammar', sev:'high', label:'Subject–verb agreement',
    explain:(m,s)=>`With "${s}", use "doesn't", not "don't".`,
    re:/\b(he|she|it|my (?:brother|sister|father|mother|friend|boss|colleague|manager|wife|husband|girlfriend|boyfriend))\s+don't\b/gi,
    fix:(m,s)=>`${s} doesn't` },
  { id:'third-base', cat:'Grammar', sev:'medium', label:'Third-person -s missing',
    explain:(m,s,v)=>`With "${s}", add -s: "${v}" → "${thirdPerson(v)}".`,
    re:/\b(he|she)\s+(go|come|eat|like|want|need|work|play|live|study|watch|make|take|do|have|say|know|think|feel|get|give)\b/gi,
    fix:(m,s,v)=>`${s} ${thirdPerson(v)}` },
  { id:'have-years', cat:'Grammar', sev:'high', label:"Age uses 'I am'",
    explain:(m,s,v,n)=>`For age: "${s} ${s.toLowerCase()==='i'?'am':'is'} ${n} years old".`,
    re:/\b(i|he|she)\s+(have|has|had)\s+(\d+)\s+years?\b/gi,
    fix:(m,s,v,n)=>`${s} ${s.toLowerCase()==='i'?'am':'is'} ${n} years old` },
  { id:'to-place', cat:'Articles', sev:'medium', label:"Places need 'the'",
    explain:(m,p,pl)=>`Use "the" before a specific place — "${p} the ${pl}".`,
    re:/\b(to|at|in|from)\s+(market|office|station|airport|hospital|temple|mall|bank|gym|library|cinema|college|park|beach|city)\b/gi,
    fix:(m,p,pl)=>`${p} the ${pl}` },
  { id:'discuss-about', cat:'Preposition', sev:'medium', label:"'Discuss' takes no preposition",
    explain:()=>`Say "discuss", not "discuss about".`,
    re:/\bdiscuss(ed|ing)?\s+about\b/gi, fix:(m,s)=>'discuss'+(s||'') },
  { id:'listen-to', cat:'Preposition', sev:'medium', label:'Listen TO something',
    explain:()=>`Say "listen to music", not "listen music".`,
    re:/\blisten(ing)?\s+(music|songs|the radio|him|her|them|me)\b/gi,
    fix:(m,s,o)=>'listen'+(s||'')+' to '+o },
  { id:'explain-me', cat:'Preposition', sev:'medium', label:'Explain TO me',
    explain:()=>`Say "explain to me", not "explain me".`,
    re:/\bexplain\s+me\b/gi, fix:()=>'explain to me' },
  { id:'do-mistake', cat:'Word Choice', sev:'high', label:'We MAKE a mistake',
    explain:()=>`In English we "make" a mistake, not "do".`,
    re:/\b(did|do|does|doing)\s+a\s+mistake\b/gi,
    fix:(m,v)=>({did:'made',do:'make',does:'makes',doing:'making'}[v.toLowerCase()])+' a mistake' },
  { id:'since-duration', cat:'Grammar', sev:'medium', label:"'Since' vs 'for'",
    explain:(m,n,u)=>`For durations use "for" — "for ${n} ${u}".`,
    re:/\bsince\s+(\d+|two|three|four|five|six|seven|eight|nine|ten|many)\s+(years|months|days|weeks|hours)\b/gi,
    fix:(m,n,u)=>`for ${n} ${u}` },
  { id:'myself-name', cat:'Sentence Structure', sev:'high', label:"Introduce with 'I am'",
    explain:(m,n)=>`Say "I am ${n}", not "Myself ${n}".`,
    re:/\bmyself\s+([A-Z][a-z]+)\b/g, fix:(m,n)=>`I am ${n}` },
  { id:'much-countable', cat:'Grammar', sev:'medium', label:'Many vs much',
    explain:(m,n)=>`"${n}" is countable — use "many", not "much".`,
    re:/\bmuch\s+(people|friends|books|things|students|places|cars|options)\b/gi, fix:(m,n)=>'many '+n },
  { id:'anyways', cat:'Naturalness', sev:'low', label:"Use 'anyway'",
    explain:()=>`Say "anyway", not "anyways".`, re:/\banyways\b/gi, fix:()=>'anyway' }
];

export function analyze(text) {
  let w = String(text || '').trim();
  if (!w) return { corrected: '', mistakes: [] };
  const mistakes = [];

  const timeM = w.match(/\b(yesterday|last night|last week|last month|last year|this morning|this afternoon|that day|day before yesterday)\b/i);
  if (timeM) {
    const before = w;
    const verbRe = new RegExp('\\b(' + PRESENT_VERBS + ')\\b', 'gi');
    const beforeV = before.match(verbRe) || [];
    const after = before.replace(verbRe, v => toPast(v));
    if (after !== before) {
      const afterV = after.match(verbRe) || [];
      const pairs = [];
      for (let i = 0; i < beforeV.length; i++) if (beforeV[i].toLowerCase() !== afterV[i].toLowerCase()) pairs.push([beforeV[i], afterV[i]]);
      w = after;
      mistakes.push({
        id: uid(), category: 'Grammar', severity: 'high',
        label: `With "${timeM[0]}", use past tense`,
        explanation: `With "${timeM[0]}", we use past tense: ${pairs.map(([a,b])=>`"${a}" → "${b}"`).join(', ')}.`,
        original: before, corrected: w
      });
    }
  }

  const places = 'market|office|station|airport|hospital|temple|mall|bank|gym|library|cinema|college|park|beach|city|village|restaurant|hotel';
  const motionRe = new RegExp(`\\b(go|goes|went|come|comes|came|walk|walks|walked|drive|drives|drove|return|returns|returned|fly|flies|flew|travel|travels|travelled|arrive|arrives|arrived)\\s+(the\\s+|a\\s+)?(${places})\\b`, 'i');
  const mm = w.match(motionRe);
  if (mm) {
    const full = mm[0], verb = mm[1], place = mm[3];
    const fixed = `${verb} to the ${place}`;
    w = w.replace(full, fixed);
    mistakes.push({
      id: uid(), category: 'Preposition', severity: 'high',
      label: 'Use "to the" before a place',
      explanation: `We say "${verb} to the ${place}", not just "${verb} ${place}".`,
      original: full, corrected: fixed
    });
  }

  for (const rule of RULES) {
    const flags = rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + 'g';
    const re = new RegExp(rule.re.source, flags);
    re.lastIndex = 0;
    const m = re.exec(w);
    if (!m) continue;
    const fixed = rule.fix(m[0], ...m.slice(1));
    if (!fixed || fixed === m[0]) continue;
    const expl = typeof rule.explain === 'function' ? rule.explain(m[0], ...m.slice(1)) : rule.label;
    w = w.replace(new RegExp(rule.re.source, flags), rule.fix);
    mistakes.push({
      id: uid(), category: rule.cat, severity: rule.sev, label: rule.label,
      explanation: expl, original: m[0].trim(), corrected: String(fixed).trim()
    });
  }

  w = w.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
  if (w) w = w[0].toUpperCase() + w.slice(1);
  return { corrected: w, mistakes };
}

const DEVANAGARI = /[\u0900-\u097F]/;
const HINDI_TOKENS = /\b(mujhe|mujhko|tumhe|aapko|nahi|nahin|kya|kaise|kaisa|kahan|kab|kyun|mera|meri|mere|tera|teri|hum|tum|aap|woh|wo|yeh|ye|karna|karta|karti|karte|raha|rahi|rahe|tha|thi|chahiye|sakta|sakti|bahut|bohot|thoda|accha|acha|samajh|bolna|pata|matlab|kal|abhi|phir|lekin|bhi|toh|hain|hai|mein|apna|koi|kuch|theek|thik|pasand|bhookh|neend|madad|yaad|jana|jaana|aana|dena|lena)\b/gi;

export function detectLanguage(t) {
  const s = String(t || '');
  if (DEVANAGARI.test(s)) return 'hindi';
  const m = s.match(HINDI_TOKENS);
  return m && m.length >= 2 ? 'hinglish' : 'english';
}

const PHRASEBOOK = [
  { re: /mujhe\s+samajh\s+nahi\s+(aa\s*raha|aata|aaya)/i, en: "I don't understand." },
  { re: /samajh\s+nahi\s+aa\s*raha/i, en: "I don't understand." },
  { re: /mujhe\s+(\w+)\s+chahiye/i, en: "I need ___." },
  { re: /mujhe\s+(\w+)\s+pasand\s+hai/i, en: "I like ___." },
  { re: /mujhe\s+(\w+)\s+nahi\s+pata/i, en: "I don't know ___." },
  { re: /mujhe\s+bhookh\s+lagi\s+hai/i, en: "I am hungry." },
  { re: /(aap|tum)\s+kaise\s+ho/i, en: "How are you?" },
  { re: /main?\s+theek\s+(hoon|hu)/i, en: "I am fine." },
  { re: /bahut\s+(accha|acha)/i, en: "That's great." },
  { re: /bheed\s+(bahut|bohot)\s+hai/i, en: "It's very crowded." }
];

export function hindiToEnglishHint(t) {
  for (const p of PHRASEBOOK) if (p.re.test(t)) return p.en;
  return null;
}