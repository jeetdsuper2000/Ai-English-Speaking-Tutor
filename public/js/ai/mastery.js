import { uid } from '../utils.js';
import { Repo } from '../storage.js';

const INTERVALS = { noted:2, introduced:3, user_used_thought:5, user_used_auto:7, mastered:15, ultra_mastered:30 };

export const Mastery = {
  items: {},

  load() { this.items = Repo.getMastery() || {}; },
  save() { Repo.setMastery(this.items); },

  key(s) { return String(s || '').toLowerCase().trim(); },

  note(said, correct, opts = {}) {
    const key = this.key(correct);
    const now = Date.now();
    if (!this.items[key]) {
      this.items[key] = {
        id: uid(), type: opts.type || 'phrase', category: opts.category || 'general',
        said, correct, firstNoted: now, lastSeen: now,
        timesSaid: 1, timesCorrectedByTutor: 0, timesUserUsedCorrectly: 0,
        contexts: [], stage: 'noted',
        nextVerifyAt: now + 2 * 86400000
      };
    } else {
      this.items[key].lastSeen = now;
      this.items[key].timesSaid++;
      this.items[key].said = said;
    }
    this.save();
  },

  introduce(correct, opts = {}) {
    const key = this.key(correct);
    const now = Date.now();
    if (!this.items[key]) {
      this.items[key] = {
        id: uid(), type: opts.type || 'phrase', category: opts.category || 'general',
        said: opts.said || '', correct, firstNoted: now, lastSeen: now,
        timesSaid: 0, timesCorrectedByTutor: 1, timesUserUsedCorrectly: 0,
        contexts: [], stage: 'introduced',
        nextVerifyAt: now + 3 * 86400000
      };
    } else {
      const item = this.items[key];
      item.timesCorrectedByTutor++;
      item.lastSeen = now;
      if (item.stage === 'noted') item.stage = 'introduced';
      item.nextVerifyAt = now + (INTERVALS[item.stage] || 3) * 86400000;
    }
    this.save();
  },

  userUsed(correct, context = 'general', auto = false) {
    const key = this.key(correct);
    const item = this.items[key];
    if (!item) return;
    const now = Date.now();
    item.lastSeen = now;
    item.timesUserUsedCorrectly++;
    if (!item.contexts.includes(context)) item.contexts.push(context);

    if (item.stage === 'noted' || item.stage === 'introduced') {
      item.stage = auto ? 'user_used_auto' : 'user_used_thought';
    } else if (item.stage === 'user_used_thought' && auto) {
      item.stage = 'user_used_auto';
    } else if (item.stage === 'user_used_auto' && item.contexts.length >= 3) {
      item.stage = 'mastered';
      item.masteredAt = now;
    } else if (item.stage === 'mastered' && now - (item.masteredAt || 0) > 15 * 86400000) {
      item.stage = 'ultra_mastered';
      item.ultraMasteredAt = now;
    }
    item.nextVerifyAt = now + (INTERVALS[item.stage] || 5) * 86400000;
    this.save();
  },

  getDueItems(max = 2) {
    const now = Date.now();
    return Object.entries(this.items)
      .filter(([_, v]) => v.stage !== 'ultra_mastered' && v.nextVerifyAt <= now)
      .sort((a, b) => a[1].nextVerifyAt - b[1].nextVerifyAt)
      .slice(0, max)
      .map(([k, v]) => ({ key: k, ...v }));
  },

  stats() {
    const items = Object.values(this.items);
    return {
      total: items.length,
      mastered: items.filter(i => i.stage === 'mastered' || i.stage === 'ultra_mastered').length,
      ultra: items.filter(i => i.stage === 'ultra_mastered').length,
      inProgress: items.filter(i => ['introduced', 'user_used_thought', 'user_used_auto'].includes(i.stage)).length,
      forgotten: items.filter(i => i.stage === 'forgotten').length
    };
  }
};

export function buildIndirectPrompt() {
  return [
    'My sister came home from work completely — how do you say it? — dead. Do you ever feel like that?',
    'I had three classes today and a client call. I\'m completely — what\'s the word?',
    'You said you had back-to-back meetings yesterday. How did you feel at the end?',
    'I\'m so tired today. Studio work, no lunch.'
  ][Math.floor(Math.random() * 4)];
}