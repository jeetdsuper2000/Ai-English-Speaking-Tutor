import { $, esc, fmtDur, fmtClock, toast } from '../utils.js';
import { Repo } from '../storage.js';
import { Router } from '../router.js';
import { SCENARIOS } from '../scenarios.js';
import { Mastery } from '../ai/mastery.js';
import { LifeStore } from '../ai/lifeStore.js';

export function renderDashboard() {
  const user = Repo.getUser();
  if (!user) { Router.navigate('#/'); return; }
  const sessions = Repo.getSessions();
  const mistakes = Repo.getMistakes();
  const totalSec = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const totalWords = sessions.reduce((a, s) => a + (s.wordCount || 0), 0);

  const days = new Set(sessions.map(s => new Date(s.startedAt).toISOString().slice(0, 10)));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }

  Mastery.load();
  const mstats = Mastery.stats();
  const nancyRole = LifeStore.life?.identity?.role || 'your friend';

  const avg = {};
  ['grammar', 'vocabulary', 'fluency', 'confidence'].forEach(k => {
    const vals = sessions.map(s => s.scores?.[k]).filter(v => typeof v === 'number');
    avg[k] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  });

  const remaining = Repo.remainingSecondsToday();
  const plan = Repo.getPlan();

  $('#app').innerHTML = `
  <div class="wrap" style="padding:0 16px 60px">
    <div class="page-head">
      <h1>Hi ${esc(user.name)} 👋</h1>
      <p>${sessions.length === 0 ? "Start your first session to build momentum." : `${sessions.length} session${sessions.length === 1 ? '' : 's'} so far. Nancy is a ${esc(nancyRole.toLowerCase())} today.`}</p>
    </div>

    ${plan === 'free' ? `<div class="banner ${remaining <= 120 ? 'warn' : 'info'}" style="margin-top:16px">
      <span>${remaining <= 120 ? '⏳' : '🕐'}</span>
      <div><b>${Math.ceil(remaining / 60)} of 10 free minutes left today.</b>
      ${remaining <= 120 ? ' <a href="#/settings" style="text-decoration:underline">Upgrade to Pro</a> for unlimited speaking.' : ''}</div>
    </div>` : ''}

    <div class="grid g4" style="margin-top:20px">
      <div class="stat"><div class="k">Level</div><div class="v" style="font-size:19px">${esc(user.level)}</div></div>
      <div class="stat"><div class="k">Streak</div><div class="v">${streak} <span style="font-size:14px;color:var(--muted)">d</span></div></div>
      <div class="stat"><div class="k">Speaking time</div><div class="v">${fmtDur(totalSec)}</div></div>
      <div class="stat"><div class="k">Sessions</div><div class="v">${sessions.length}</div></div>
    </div>

    <div class="grid g2" style="margin-top:20px">
      <div class="panel">
        <h2>🎤 Start a session</h2>
        <div class="chips">
          ${SCENARIOS.slice(0, 5).map(s => `<a href="#/tutor?scenario=${s.id}" class="chip">${s.icon} ${esc(s.name)}</a>`).join('')}
        </div>
      </div>
      <div class="panel">
        <h2>📚 Mastery progress</h2>
        <div class="bar-row"><div class="bar-top"><span class="n">In progress</span><span class="v">${mstats.inProgress}</span></div>
          <div class="bar"><i style="width:${Math.min(100, mstats.inProgress * 10)}%"></i></div></div>
        <div class="bar-row"><div class="bar-top"><span class="n">Mastered</span><span class="v">${mstats.mastered}</span></div>
          <div class="bar"><i class="g" style="width:${Math.min(100, mstats.mastered * 10)}%"></i></div></div>
        <div class="bar-row"><div class="bar-top"><span class="n">Ultra mastered</span><span class="v">${mstats.ultra}</span></div>
          <div class="bar"><i class="g" style="width:${Math.min(100, mstats.ultra * 10)}%"></i></div></div>
      </div>
    </div>

    <div class="grid g2" style="margin-top:20px">
      <div class="panel">
        <h2>🧠 Recent mistakes</h2>
        ${mistakes.length ? mistakes.slice(0, 4).map(m => `<div class="mistake-item"><span class="cat">${esc(m.category)}</span>
          <div class="body"><div class="o">${esc(m.original)}</div><div class="c">${esc(m.corrected)}</div>
          <div class="meta">${fmtClock(m.createdAt)}</div></div></div>`).join('') : '<div class="empty">✨ No mistakes yet.</div>'}
      </div>
      <div class="panel">
        <h2>🕘 Recent sessions</h2>
        ${sessions.length ? sessions.slice(0, 4).map(s => `<div class="mistake-item">
          <span class="cat">${esc(s.level.split(' ')[0])}</span>
          <div class="body"><div style="font-weight:600">${esc(s.scenarioName)}</div>
          <div class="meta">${fmtDur(s.duration)} · ${s.turnCount} turns · ${fmtClock(s.startedAt)}</div></div>
        </div>`).join('') : '<div class="empty">🎙️ No sessions yet.</div>'}
      </div>
    </div>

    <div class="panel" style="margin-top:20px">
      <h2>🎙️ Meet your friend</h2>
      <p style="color:var(--muted);font-size:14px;margin:0 0 10px">Nancy takes a role based on your profession. Yours is: <b style="color:var(--text)">${esc(nancyRole)}</b></p>
      <p class="tiny">Nancy's life, family, and stories are stored on your device — not on any server. If you lose this device, her role is remembered on our server, and her life will regenerate.</p>
    </div>

    ${user.is_admin ? '<div class="panel" style="margin-top:20px"><h2>🛡️ Admin</h2><a href="#/admin" class="btn btn-primary btn-sm">Open Admin Panel</a></div>' : ''}
  </div>`;
}