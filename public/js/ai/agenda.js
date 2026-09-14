import { uid } from '../utils.js';
import { Repo } from '../storage.js';

export const Agenda = {
  sideTopics: [],
  toldSeeds: [],
  current: null,

  load() {
    const a = Repo.getAgenda() || { sideTopics: [], toldSeeds: [] };
    this.sideTopics = a.sideTopics || [];
    this.toldSeeds = a.toldSeeds || [];
  },

  save() {
    Repo.setAgenda({
      sideTopics: this.sideTopics.slice(-100),
      toldSeeds: this.toldSeeds.slice(-100)
    });
  },

  startSession(seeds) {
    this.current = {
      seeds: seeds || [],
      toldIndices: [],
      userTurnsInARow: 0,
      lastTopic: null,
      startedAt: Date.now()
    };
  },

  getDueSideTopics() {
    const now = Date.now();
    return this.sideTopics
      .filter(t => !t.used && now - t.at > 2 * 86400000)
      .sort((a, b) => a.at - b.at)
      .slice(0, 3);
  },

  noteSideTopic(who, topic, snippet) {
    if (this.sideTopics.find(t => t.topic === topic && !t.used)) return;
    this.sideTopics.push({ id: uid(), who, topic, snippet, at: Date.now(), used: false });
    this.save();
  },

  getNextSeed() {
    if (!this.current) return null;
    const { seeds, toldIndices } = this.current;
    const idx = seeds.findIndex((_, i) => !toldIndices.includes(i));
    return idx >= 0 ? { index: idx, ...seeds[idx] } : null;
  },

  markSeedTold(index, seedId) {
    if (!this.current) return;
    if (!this.current.toldIndices.includes(index)) this.current.toldIndices.push(index);
    if (seedId && !this.toldSeeds.includes(seedId)) this.toldSeeds.push(seedId);
    this.save();
  },

  shouldTakeTurn() { return this.current && this.current.userTurnsInARow >= 3; },
  recordUserTurn() { if (this.current) this.current.userTurnsInARow++; },
  resetUserTurns() { if (this.current) this.current.userTurnsInARow = 0; }
};

export function extractSideTopics(text) {
  const lower = text.toLowerCase();
  const topics = [];
  if (/sister|behen|didi/i.test(lower)) topics.push('sister');
  if (/father|papa|dad/i.test(lower)) topics.push('father');
  if (/mother|mom|maa|mummy/i.test(lower)) topics.push('mother');
  if (/client|customer/i.test(lower)) topics.push('client');
  if (/boss|manager|office/i.test(lower)) topics.push('work');
  if (/gym|workout|exercise/i.test(lower)) topics.push('gym');
  if (/market|shopping/i.test(lower)) topics.push('shopping');
  if (/food|lunch|dinner|eat/i.test(lower)) topics.push('food');
  if (/metro|train|bus|traffic/i.test(lower)) topics.push('commute');
  if (/interview/i.test(lower)) topics.push('interview');
  return topics;
}
