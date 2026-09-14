import { $, esc, fmtDur } from '../utils.js';
import { Repo } from '../storage.js';
import { Mastery } from '../ai/mastery.js';

export function renderProgress() {
  const sessions = Repo.getSessions();
  const mistakes = Repo.getMistakes();
  const totalSec = sessions.reduce((a, s) => a + (s.duration || 0), 0);

  Mastery.load();
  const items = Object.values(Mastery.items);
  const mastered = items.filter(i => ['mastered', 'ultra_mastered'].includes(i.stage));
  const inProgress = items.filter(i => ['introduced', 'user_used_thought', 'user_used_auto'].includes(i.stage));

  const avg = {};
  ['grammar', 'vocabulary', 'fluency', 'confidence', 'pronunciation'].forEach(k => {
    const vals = sessions.map(s => s.scores?.[k]).filter(v => typeof v === 'number');
    avg[k] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  });

  const byCat = {};
  mistakes.forEach(m => { byCat[m.category] = (byCat[m.category] || 0) + 1; });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const maxC = cats.length ? cats[0][1] : 1;

  $('#app').innerHTML = `
  <div class="wrap" style="padding:0 16px 60px">
    <div class="page-head"><h1>Progress</h1><p>Real numbers from your sessions.</p></div>

    <div class="grid g4" style="margin-top:20px">
      <div class="stat"><div class="k">Total speaking</div><div class="v">${fmtDur(totalSec)}</div></div>
      <div class="stat"><div class="k">Sessions</div><div class="v">${sessions.length}</div></div>
      <div class="stat"><div class="k">Mastered</div><div class="v">${mastered.length}</div></div>
      <div class="stat"><div class="k">In progress</div><div class="v">${inProgress.length}</div></div>
    </div>

    <div class="grid g2" style="margin-top:20px">
      <div class="panel">
        <h2>📊 Skills</h2>
        ${Object.entries({grammar:'Grammar',vocabulary:'Vocabulary',fluency:'Fluency',confidence:'Confidence',pronunciation:'Pronunciation'}).map(([k, label]) => {
          const v = avg[k];
          return `<div class="bar-row"><div class="bar-top"><span class="n">${label}</span><span class="v">${v ?? '—'}</span></div>
            <div class="bar"><i class="${v == null ? '' : v >= 75 ? 'g' : v >= 55 ? '' : 'w'}" style="width:${v || 0}%"></i></div></div>`;
        }).join('')}
      </div>
      <div class="panel">
        <h2>🔍 Mistakes by category</h2>
        ${cats.length ? cats.map(([c, n]) => `<div class="bar-row"><div class="bar-top"><span class="n">${esc(c)}</span><span class="v">${n}</span></div>
          <div class="bar"><i class="w" style="width:${Math.round((n / maxC) * 100)}%"></i></div></div>`).join('') : '<div class="empty">No mistakes yet.</div>'}
      </div>
    </div>

    ${mastered.length ? `<div class="panel" style="margin-top:20px">
      <h2>✓ Mastered</h2>
      ${mastered.map(i => `<div class="mistake-item">
        <span class="cat">${esc(i.category)}</span>
        <div class="body"><div class="c" style="text-decoration:none;color:var(--text);font-weight:600">${esc(i.correct)}</div>
        <div class="meta">Used ${i.timesUserUsedCorrectly}× · ${i.stage === 'ultra_mastered' ? 'ultra mastered' : 'mastered'}</div></div>
      </div>`).join('')}
    </div>` : ''}

    ${inProgress.length ? `<div class="panel" style="margin-top:20px">
      <h2>📈 Learning now</h2>
      ${inProgress.map(i => `<div class="mistake-item">
        <span class="cat">${esc(i.category)}</span>
        <div class="body"><div style="font-weight:600;color:var(--text)">${esc(i.correct)}</div>
        <div class="meta">${i.stage.replace(/_/g, ' ')} · used ${i.timesUserUsedCorrectly}×</div></div>
      </div>`).join('')}
    </div>` : ''}
  </div>`;
}