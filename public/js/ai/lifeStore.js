import { detectRole } from './roleDetector.js';
import { generateLife } from './lifeGenerator.js';

const ROLE_KEY = 'fluentai.nancyRole';
const LIFE_KEY = 'fluentai.nancyLife';

export const LifeStore = {
  userId: null,
  life: null,
  role: null,

  init(userId) { this.userId = userId; },

  async getRole(userProfession) {
    if (this.role) return this.role;
    const cached = localStorage.getItem(`${ROLE_KEY}.${this.userId}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.locked) { this.role = data.role; return data.role; }
    }
    const role = await detectRole(userProfession, this.userId);
    localStorage.setItem(`${ROLE_KEY}.${this.userId}`, JSON.stringify({
      role, profession: userProfession, locked: true, lockedAt: Date.now()
    }));
    try {
      await fetch('/api/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: this.userId, role, profession: userProfession })
      });
    } catch {}
    this.role = role;
    return role;
  },

  async getLife(role) {
    if (this.life) return this.life;
    const cached = localStorage.getItem(`${LIFE_KEY}.${this.userId}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (data.role === role) { this.life = data; return data; }
    }
    const life = await generateLife(role, this.userId);
    localStorage.setItem(`${LIFE_KEY}.${this.userId}`, JSON.stringify(life));
    this.life = life;
    return life;
  },

  async restoreFromBackend() {
    try {
      const res = await fetch(`/api/users/role/${this.userId}`);
      if (!res.ok) return null;
      const { role, profession } = await res.json();
      if (!role) return null;
      localStorage.setItem(`${ROLE_KEY}.${this.userId}`, JSON.stringify({ role, profession, locked: true, restoredAt: Date.now() }));
      const life = await generateLife(role, this.userId);
      localStorage.setItem(`${LIFE_KEY}.${this.userId}`, JSON.stringify(life));
      this.role = role;
      this.life = life;
      return life;
    } catch { return null; }
  },

  updateStory(storyId, patch) {
    if (!this.life) return;
    const story = this.life.seeds?.find(s => s.id === storyId);
    if (story) Object.assign(story, patch);
    localStorage.setItem(`${LIFE_KEY}.${this.userId}`, JSON.stringify(this.life));
  }
};