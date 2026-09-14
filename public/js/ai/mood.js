const MOOD_BUDGET = { high: 4, normal: 3, low: 2, very_low: 0 };

export const Mood = {
  signals: { happy: 0, low: 0 },
  state: 'normal',

  reset() { this.signals = { happy: 0, low: 0 }; this.state = 'normal'; },

  observe(text, opts = {}) {
    const t = String(text || '').toLowerCase().trim();
    const words = t.split(/\s+/).filter(Boolean);

    if (words.length > 0 && words.length <= 3) this.signals.low += 1;
    if (/\b(happy|great|nice|good|awesome|amazing|love|enjoy|fun|haha|lol)\b/.test(t)) this.signals.happy += 2;
    if (/\b(tired|sad|upset|stressed|angry|frustrated|low|bad|kharab)\b/.test(t)) this.signals.low += 2;
    if (words.length >= 20) this.signals.happy += 1;

    this.recalc();
    return this.state;
  },

  recalc() {
    const total = this.signals.happy + this.signals.low;
    if (total < 2) { this.state = 'normal'; return; }
    const happyRatio = this.signals.happy / total;
    const lowRatio = this.signals.low / total;
    if (lowRatio >= 0.6 && this.signals.low >= 3) this.state = 'very_low';
    else if (lowRatio >= 0.4) this.state = 'low';
    else if (happyRatio >= 0.6 && this.signals.happy >= 3) this.state = 'high';
    else this.state = 'normal';
  },

  budget() { return MOOD_BUDGET[this.state]; },
  canCorrect(used, priority = 'normal') {
    if (used >= this.budget()) return false;
    if (this.state === 'very_low') return false;
    if (this.state === 'low' && priority === 'low') return false;
    return true;
  },
  isSoftMode() { return this.state === 'low' || this.state === 'very_low'; }
};