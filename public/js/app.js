import { Router } from './router.js';
import { Repo } from './storage.js';
import { $, toast } from './utils.js';
import { renderLanding, openAuthModal } from './views/landing.js';
import { renderTutor } from './views/tutor.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProgress } from './views/progress.js';
import { renderMistakes } from './views/mistakes.js';
import { renderSettings } from './views/settings.js';
import { renderSupport } from './views/support.js';
import { renderTests } from './views/tests.js';
import { renderAdmin } from './views/admin.js';
import { LifeStore } from './ai/lifeStore.js';

window.__toast = toast;

function renderNav() {
  const user = Repo.getUser();
  const { path } = Router.parse();
  const el = $('#navLinks');
  if (!el) return;
  if (!user) {
    el.innerHTML = `<a href="#/" class="${path === '' ? 'on' : ''}">Home</a>
      <button class="btn btn-primary btn-sm" id="navStart">Start</button>`;
    $('#navStart').onclick = () => openAuthModal();
    return;
  }
  el.innerHTML = `
    <a href="#/dashboard" class="${path === 'dashboard' ? 'on' : ''}">Dashboard</a>
    <a href="#/tutor" class="${path === 'tutor' ? 'on' : ''}">Tutor</a>
    <a href="#/progress" class="${path === 'progress' ? 'on' : ''} hide-sm">Progress</a>
    <a href="#/tests" class="${path === 'tests' ? 'on' : ''} hide-sm">Tests</a>
    <a href="#/mistakes" class="${path === 'mistakes' ? 'on' : ''} hide-sm">Mistakes</a>
    <a href="#/support" class="${path === 'support' ? 'on' : ''} hide-sm">Support</a>
    <a href="#/settings" class="${path === 'settings' ? 'on' : ''} hide-sm">Settings</a>`;
}

function guard(fn) {
  return async (params) => {
    if (!Repo.getUser()) { renderLanding(); openAuthModal(); renderNav(); return; }
    // Init LifeStore
    const u = Repo.getUser();
    LifeStore.init(u.id);
    if (!LifeStore.life) {
      try {
        const role = await LifeStore.getRole(u.profession || 'general');
        await LifeStore.getLife(role);
      } catch {}
    }
    renderNav();
    fn(params);
  };
}

Router.register('', () => { renderLanding(); renderNav(); });
Router.register('dashboard', guard(renderDashboard));
Router.register('tutor', guard(renderTutor));
Router.register('progress', guard(renderProgress));
Router.register('mistakes', guard(renderMistakes));
Router.register('settings', guard(renderSettings));
Router.register('support', guard(renderSupport));
Router.register('tests', guard(renderTests));
Router.register('admin', guard(renderAdmin));

Router.start(() => { renderLanding(); renderNav(); });