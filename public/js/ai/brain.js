import { uid, pick } from '../utils.js';

export function extractDetails(text) {
  const lower = String(text || '').toLowerCase();
  const d = {};
  const time = lower.match(/\b(\d{1,2})\s*(am|pm|o'clock)\b/) || lower.match(/\bat\s+(\d{1,2})\b/);
  if (time) d.time = time[0];
  const freq = lower.match(/\b(every day|every morning|every evening|every week|every night|daily|usually|always|often|sometimes|rarely|never)\b/);
  if (freq) d.frequency = freq[0];
  const ppl = lower.match(/\bmy (?:brother|sister|mother|mom|father|dad|friend|wife|husband|boss|colleague|teacher|cousin|uncle|aunt|family|parents|girlfriend|boyfriend)\b/g);
  if (ppl) d.people = [...new Set(ppl)];
  const emo = lower.match(/\b(happy|sad|tired|excited|worried|nervous|angry|relaxed|stressed|bored|lonely|grateful|proud|scared|frustrated|annoyed|calm)\b/);
  if (emo) d.emotion = emo[1];
  if (/\b(because|since|so that|that's why|due to)\b/.test(lower)) d.hasReason = true;
  return d;
}

export function detectTopics(text, details) {
  const lower = String(text || '').toLowerCase();
  const found = [];
  const push = (label, type) => { if (!found.some(f => f.label === label)) found.push({ label, type }); };
  if (/\b(wake up|woke up|get up|morning|breakfast)\b/.test(lower)) push('your morning routine', 'routine');
  if (/\b(sleep|slept|bed|late night)\b/.test(lower)) push('your sleep', 'routine');
  if (/\b(gym|exercise|workout|yoga|run|jog|walk|cycling)\b/.test(lower)) push('your fitness', 'activity');
  if (/\b(work|job|office|meeting|project|client|boss|deadline)\b/.test(lower)) push('your work', 'activity');
  if (/\b(study|exam|college|school|university|class|course)\b/.test(lower)) push('your studies', 'activity');
  if (/\b(market|shopping|shop|bought|mall)\b/.test(lower)) push('your shopping', 'event');
  if (/\b(movie|film|series|netflix|show|youtube|watched)\b/.test(lower)) push('what you watched', 'activity');
  if (/\b(book|read|reading|novel)\b/.test(lower)) push('your reading', 'activity');
  if (/\b(food|cook|lunch|dinner|restaurant)\b/.test(lower)) push('your food', 'activity');
  if (/\b(travel|trip|travelled|holiday|vacation)\b/.test(lower)) push('your trip', 'event');
  if (/\b(music|song|guitar|singing|band)\b/.test(lower)) push('music', 'activity');
  if (/\b(cricket|football|soccer|tennis|badminton|match)\b/.test(lower)) push('sports & games', 'activity');
  if (/\b(metro|train|bus|commute)\b/.test(lower)) push('your commute', 'activity');
  if (/\b(girlfriend|boyfriend|wife|husband|fight|argument|anniversary)\b/.test(lower)) push('your relationship', 'person');
  const ppl = lower.match(/\bmy (?:brother|sister|mother|mom|father|dad|friend|wife|husband|boss|colleague|teacher|cousin|girlfriend|boyfriend)\b/g);
  if (ppl) push(`your ${ppl[0].replace('my ', '')}`, 'person');
  if (details.emotion) push("how you're feeling", 'feeling');
  if (!found.length && /\b(i|we)\s+\w+/i.test(text)) push('what you shared', 'general');
  return found;
}

const TOPIC_QUESTIONS = {
  routine: [
    { id:'r1', fn:(t,d)=> d.frequency ? 'How long have you been doing this?' : 'Do you do this every day?' },
    { id:'r2', fn:()=>'What made you start doing that?' },
    { id:'r3', fn:()=>'Has it always been like this, or did something change?' },
    { id:'r4', fn:()=>'Do you enjoy it, or is it just something you have to do?' }
  ],
  activity: [
    { id:'a1', fn:()=>'How long have you been doing this?' },
    { id:'a2', fn:()=>'What got you into it?' },
    { id:'a3', fn:()=>'How often do you usually do it?' },
    { id:'a4', fn:()=>"What's the hardest part about it?" },
    { id:'a5', fn:()=>'What do you like most about it?' }
  ],
  event: [
    { id:'e1', fn:()=>'How did it go?' },
    { id:'e2', fn:()=>'What was the best part?' },
    { id:'e3', fn:()=>'Was it what you expected?' },
    { id:'e4', fn:()=>'Would you do it again?' }
  ],
  person: [
    { id:'p1', fn:()=>'Tell me more about them.' },
    { id:'p2', fn:()=>'How long have you known them?' },
    { id:'p3', fn:()=>'What do you like most about them?' }
  ],
  feeling: [
    { id:'f1', fn:()=>"What's making you feel that way?" },
    { id:'f2', fn:()=>'How long have you been feeling like this?' },
    { id:'f3', fn:()=>'What usually helps when you feel this way?' }
  ],
  general: [
    { id:'g1', fn:()=>'Tell me more about that.' },
    { id:'g2', fn:()=>'Why is that?' },
    { id:'g3', fn:()=>'How did that feel?' },
    { id:'g4', fn:()=>'What happened next?' }
  ]
};

export function generateReaction(text, details) {
  const lower = String(text || '').toLowerCase();
  if (details.time) {
    const hour = parseInt(details.time);
    const isAm = /am/i.test(details.time);
    if (isAm && hour >= 4 && hour <= 6) return pick([`${hour} in the morning? That's really early.`, `That's early — most people sleep till 7 or 8.`]);
    if (isAm && hour >= 7 && hour <= 9) return pick([`${hour}am — that's a pretty typical time.`]);
    if (!isAm && hour >= 10) return pick([`${hour} is quite late.`]);
  }
  if (details.frequency) {
    if (/every day|every morning|daily|every night/i.test(details.frequency)) return pick(["That's a solid routine.", 'Consistent — that\'s good.']);
  }
  if (details.emotion) {
    const positive = ['happy','excited','relaxed','grateful','proud','calm'].includes(details.emotion);
    const negative = ['sad','tired','stressed','nervous','worried','angry','bored','lonely','scared','frustrated','annoyed'].includes(details.emotion);
    if (positive) return pick(["That's great to hear.", 'Love that.']);
    if (negative) return pick(['Sorry to hear that.', 'That sounds tough.', 'I get it.']);
  }
  if (details.hasReason) return pick(['Ah, that makes sense.', 'Fair enough.']);
  if (/\b(great|amazing|wonderful|awesome|excellent|fantastic|love|enjoy)\b/.test(lower)) return pick(['That sounds nice.', 'Good stuff.']);
  if (/\b(hate|terrible|awful|horrible|bad|worst)\b/.test(lower)) return pick(['That sounds rough.', 'Sorry to hear that.']);
  if (/\b(yes|yeah|yep|sure|of course|absolutely|definitely)\b/.test(lower)) return pick(['Got it.', 'Okay.', 'Right.']);
  if (/\b(no|nope|never|not really)\b/.test(lower)) return pick(['Okay, no problem.', 'Fair enough.']);
  return pick(['I see.', 'Got it.', 'Okay.', 'Right.', 'Makes sense.']);
}

export const ConversationBrain = {
  topics: [],
  activeTopicId: null,
  scenario: null,
  seedIndex: 0,
  recentWildcards: [],

  init(scenario) {
    this.topics = [];
    this.activeTopicId = null;
    this.scenario = scenario;
    this.seedIndex = 0;
    this.recentWildcards = [];
  },

  ingest(text) {
    const details = extractDetails(text);
    const detected = detectTopics(text, details);
    for (const t of detected) {
      let ex = this.topics.find(x => x.label === t.label);
      if (!ex) { ex = { id: uid(), label: t.label, type: t.type, details: {}, asked: {}, exchanges: 0, lastMentioned: Date.now() }; this.topics.push(ex); }
      ex.lastMentioned = Date.now();
      ex.exchanges++;
      Object.assign(ex.details, details);
    }
    const cands = this.topics.filter(t => t.exchanges < 4).sort((a, b) => b.lastMentioned - a.lastMentioned);
    if (cands.length) this.activeTopicId = cands[0].id;
    return { details, detectedTopics: detected };
  },

  getActiveTopic() { return this.topics.find(t => t.id === this.activeTopicId) || null; },

  pickQuestionForTopic(topic) {
    if (!topic) return null;
    const bank = TOPIC_QUESTIONS[topic.type] || TOPIC_QUESTIONS.general;
    const available = bank.filter(q => !topic.asked[q.id]);
    if (!available.length) return null;
    const q = pick(available);
    topic.asked[q.id] = true;
    return q.fn(topic, topic.details);
  },

  respond(userText, details) {
    const reaction = generateReaction(userText, details);
    let topic = this.getActiveTopic();
    let question = topic ? this.pickQuestionForTopic(topic) : null;
    let kind = 'topic';
    if (!question) {
      const alts = this.topics.filter(t => t.id !== this.activeTopicId && t.exchanges < 4).sort((a, b) => b.lastMentioned - a.lastMentioned);
      if (alts.length) { this.activeTopicId = alts[0].id; topic = alts[0]; question = this.pickQuestionForTopic(topic); }
    }
    if (!question) { question = this.nextSeed(); kind = 'seed'; }
    return { reaction, question, kind };
  },

  nextSeed() {
    const qs = this.scenario?.questions || [];
    if (!qs.length) return 'Tell me more about that.';
    const q = qs[this.seedIndex % qs.length];
    this.seedIndex++;
    return q;
  }
};

const META_PATTERNS = [
  /why (are|do) you (only|always|keep|just)/i,
  /you keep (asking|saying|repeating)/i,
  /same (question|thing|topic)/i,
  /(ask|asking) (me )?(something|a) (different|else|new|other)/i,
  /(don't|do not|dont) (you )?have (any )?(other|more|another) (question|questions)/i,
  /something (else|different|new)/i,
  /\b(bored?|boring)\b/i,
  /change (the )?(topic|subject)/i,
  /talk about (something|anything) else/i
];
export const detectMeta = (t) => META_PATTERNS.some(re => re.test(String(t || '')));

export const WILDCARD_QUESTIONS = [
  "What's something you're really into these days?",
  'What do you do when you\'re not working?',
  "What's a hobby you've picked up recently?",
  "What's something you could talk about for hours?",
  'If you had a free day tomorrow, what would you do?',
  "What's been on your mind lately?",
  "What's the last thing that made you laugh?",
  'What are you looking forward to?',
  "What's something you're curious about right now?",
  'Tell me about something you\'re really good at.',
  "What's the best part of your day usually?",
  'What do you do to relax?'
];