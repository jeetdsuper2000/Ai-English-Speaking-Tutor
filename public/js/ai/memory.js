import { uid, pick, humanAgo } from '../utils.js';
import { Repo } from '../storage.js';

export const TutorMemory = {
  statements: [],

  load() { this.statements = Repo.getTutorStatements() || []; },
  reset() { this.statements = []; },

  record(topic, text) {
    const entry = { id: uid(), topic, text, at: Date.now() };
    this.statements.unshift(entry);
    this.statements = this.statements.slice(0, 40);
    Repo.addTutorStatement(entry);
  },

  findByTopic(topic) {
    return Repo.getTutorStatements().find(s => s.topic === topic) || null;
  },

  findReferenced(userText) {
    const lower = String(userText || '').toLowerCase();
    const hasRef = /\b(you (said|told|mentioned|were saying|talked about)|about (those|that|the ones?)|what you said|earlier you|remember when)\b/.test(lower);
    const hasYour = /\byour\b/.test(lower);
    if (!hasRef && !hasYour) return null;
    const topicMap = {
      sleep: ['sleep', 'slept', 'wake', 'woke', 'morning', 'snooze'],
      coffee: ['coffee', 'chai', 'tea', 'drink'],
      work: ['work', 'studio', 'client', 'deadline', 'project']
    };
    for (const [topic, words] of Object.entries(topicMap)) {
      if (words.some(w => lower.includes(w))) {
        const s = this.findByTopic(topic);
        if (s) return { statement: s, topic };
      }
    }
    if (hasRef && this.statements.length) return { statement: this.statements[0], topic: this.statements[0].topic };
    return null;
  }
};

export const UserMemory = {
  facts: {},
  events: [],
  recentlyRecalled: [],

  load() {
    this.facts = Repo.getFacts() || {};
    this.events = Repo.getEvents() || [];
    this.recentlyRecalled = [];
  },

  ingest(text) {
    const lower = String(text || '').toLowerCase(), now = Date.now();
    const remember = (type, value) => {
      const ex = this.facts[type];
      if (ex && ex.value === value) { ex.lastSeen = now; ex.mentions++; }
      else this.facts[type] = { value, firstSeen: ex?.firstSeen || now, lastSeen: now, mentions: 1 };
    };

    if (/\bmy (?:girlfriend|gf|partner)\b/.test(lower)) remember('girlfriend', 'girlfriend');
    if (/\bmy (?:boyfriend|bf)\b/.test(lower)) remember('boyfriend', 'boyfriend');
    if (/\bmy wife\b/.test(lower)) remember('wife', 'wife');
    if (/\bmy husband\b/.test(lower)) remember('husband', 'husband');
    if (/\bmy (?:mom|mother|maa|mummy)\b/.test(lower)) remember('mother', 'mother');
    if (/\bmy (?:dad|father|papa)\b/.test(lower)) remember('father', 'father');
    if (/\bmy (?:brother|bhai)\b/.test(lower)) remember('sibling', 'brother');
    if (/\bmy (?:sister|behen|didi)\b/.test(lower)) remember('sibling', 'sister');

    const jobM = lower.match(/\bi (?:work|am working) (?:at|in|for) ([a-z0-9\s&]+?)(?:\s+as|\s*$|\.|,)/);
    if (jobM) remember('job', jobM[1].trim());
    if (/\bmy (?:boss|manager)\b/.test(lower)) remember('hasBoss', 'true');
    if (/\bmy (?:office|job|work)\b/.test(lower)) remember('hasJob', 'true');
    if (/\bmy (?:exam|test)\b/.test(lower)) remember('hasExams', 'true');

    const fromM = lower.match(/\bi (?:am |'m )?from ([a-z]+)/);
    if (fromM) remember('from', fromM[1]);

    const loveM = lower.match(/\bi (?:really |absolutely )?love ([a-z\s]{3,20}?)(?:\.|,|$| and | but )/);
    if (loveM) remember('loves', loveM[1].trim());

    const eventPatterns = [
      { re: /\b(?:debate|argument|fight|ladai) with my (girlfriend|gf|wife|boyfriend|bf|husband|mom|mother|friend|boss)\b/, name: 'argument' },
      { re: /\bi (?:had|have|am having) (?:an? )?interview\b/, name: 'interview' },
      { re: /\bi (?:went|am going|will go) (?:to |on )?(?:a |an )?(trip|holiday|vacation)\b/, name: 'trip' },
      { re: /\bmy (exam|test) (?:is |was )?(tomorrow|today|next week|yesterday)\b/, name: 'exam' }
    ];
    for (const ep of eventPatterns) if (ep.re.test(lower)) Repo.addEvent({ id: uid(), name: ep.name, raw_text: text, at: now });

    Repo.setFacts(this.facts);
    this.events = Repo.getEvents();
  },

  naturalRecall() {
    const evs = Repo.getEvents();
    const recent = evs.find(e => e.at > Date.now() - 21 * 86400000 && !this.recentlyRecalled.includes('event:' + e.id));
    if (recent) {
      this.recentlyRecalled.push('event:' + recent.id);
      const ago = humanAgo(recent.at);
      const map = {
        argument: `By the way — you mentioned an argument ${ago}. Did that get sorted out?`,
        interview: `How did your interview go? You mentioned it ${ago}.`,
        trip: `How was your trip? You mentioned it ${ago}.`,
        exam: `Did your exam go okay?`
      };
      if (map[recent.name]) return map[recent.name];
    }
    const entries = Object.entries(this.facts).filter(([k]) => !this.recentlyRecalled.includes('fact:' + k));
    if (!entries.length) return null;
    entries.sort((a, b) => (b[1].lastSeen || 0) - (a[1].lastSeen || 0));
    const [type, data] = entries[0];
    this.recentlyRecalled.push('fact:' + type);
    const ago = humanAgo(data.lastSeen);
    const templates = {
      girlfriend: [`By the way, how's your girlfriend? You mentioned her ${ago}.`],
      boyfriend: [`How's your boyfriend? You mentioned him ${ago}.`],
      wife: [`How's your wife doing?`],
      husband: [`How's your husband?`],
      job: [`You mentioned you work at ${data.value}. How's that going?`],
      from: [`You said you're from ${data.value}. Still there?`],
      loves: [`You mentioned you love ${data.value}. Had any lately?`],
      mother: [`How's your mother? You mentioned her before.`],
      father: [`How's your dad? You mentioned him before.`],
      sibling: [`How's your ${data.value}?`],
      hasExams: [`How did your exam go?`],
      hasBoss: [`How's your boss treating you these days?`]
    };
    const arr = templates[type];
    return arr ? pick(arr) : null;
  }
};

export function elaborateTutorStory(reference, userText) {
  const lower = String(userText || '').toLowerCase();
  if (/\b(after|then|next|what happened|later)\b/.test(lower)) {
    return pick([
      'Nothing exciting after. Just chilled and tried to recover.',
      'Made some tea and watched a random video. Standard evening.'
    ]);
  }
  if (/\b(tired|exhausted|sleepy|drained)\b/.test(lower)) {
    return 'Yeah, I was pretty wiped out by the end of it.';
  }
  return pick([
    'Yeah, that was a whole thing, honestly.',
    'Yeah — still on my mind a bit.'
  ]);
}