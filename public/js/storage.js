import { DB_KEY } from './config.js';
import { deepCopy, todayKey, uid } from './utils.js';

const BLANK = {
  version: 1,
  user: null,
  settings: {
    sttLang: 'en-IN',
    rate: 0.95,
    voiceURI: null,
    correctionMode: 'balanced',
    continuousMode: true,
    silenceMs: 1600
  },
  facts: {},
  events: [],
  tutorStatements: [],
  sessions: [],
  mistakes: [],
  mastery: {},
  agenda: { sideTopics: [], toldSeeds: [] },
  usage: {}
};

export const Store = {
  state: null,
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      this.state = raw ? Object.assign(deepCopy(BLANK), JSON.parse(raw)) : deepCopy(BLANK);
    } catch { this.state = deepCopy(BLANK); }
    return this.state;
  },
  save() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(this.state)); }
    catch (e) { console.warn('quota', e); }
  },
  reset() { this.state = deepCopy(BLANK); this.save(); }
};

Store.load();

export const Repo = {
  getUser: () => Store.state.user,
  setUser(u) { Store.state.user = u; Store.save(); },
  clearUser() { Store.state.user = null; Store.save(); },

  getSettings: () => Store.state.settings,
  setSettings(patch) { Object.assign(Store.state.settings, patch); Store.save(); },

  getFacts: () => Store.state.facts,
  setFacts(f) { Store.state.facts = f; Store.save(); },

  addEvent(e) { Store.state.events.unshift(e); Store.state.events = Store.state.events.slice(0, 60); Store.save(); },
  getEvents: () => Store.state.events,

  addTutorStatement(s) { Store.state.tutorStatements.unshift(s); Store.state.tutorStatements = Store.state.tutorStatements.slice(0, 60); Store.save(); },
  getTutorStatements: () => Store.state.tutorStatements,

  addSession(s) { Store.state.sessions.unshift(s); Store.state.sessions = Store.state.sessions.slice(0, 400); Store.save(); },
  getSessions: () => Store.state.sessions,

  addMistakes(list) { Store.state.mistakes.unshift(...list); Store.state.mistakes = Store.state.mistakes.slice(0, 1500); Store.save(); },
  getMistakes: () => Store.state.mistakes,

  getMastery: () => Store.state.mastery,
  setMastery(m) { Store.state.mastery = m; Store.save(); },

  getAgenda: () => Store.state.agenda,
  setAgenda(a) { Store.state.agenda = a; Store.save(); },

  addUsage(sec, sess = 0) {
    const k = todayKey();
    const u = Store.state.usage[k] || { seconds: 0, sessions: 0 };
    u.seconds += sec; u.sessions += sess;
    Store.state.usage[k] = u; Store.save();
  },
  getTodayUsage() { return Store.state.usage[todayKey()] || { seconds: 0, sessions: 0 }; },
  getPlan() { return Store.state.user?.plan || 'free'; },
  remainingSecondsToday() {
    if (this.getPlan() !== 'free') return Infinity;
    return Math.max(0, 10 * 60 - this.getTodayUsage().seconds);
  }
};