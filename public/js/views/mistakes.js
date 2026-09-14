import { $, $$, esc, fmtClock } from '../utils.js';
import { Repo } from '../storage.js';

let filter = 'all';

export function renderMistakes() {
  const all = Repo.getMistakes();
  const cats = ['all', ...new Set(all.map(m => m.category))];
  const list = filter === 'all' ? all : all.filter(m => m.category === filter);

  $('#app').innerHTML = `
  <div class="wrap" style="padding:0 16px 60px">
    <div class="page-head"><h1>Mistake history</h1><p>Every correction, with the explanation.</p></div>
    <div class="chips" style="margin:20px 0">
      ${cats.map(c => `<button class="chip ${filter === c ? 'on' : ''}" data-cat="${esc(c)}">${c === 'all' ? `All (${all.length})` : `${esc(c)} (${all.filter(m => m.category === c).length})`}</button>`).join('')}
    </div>
    <div class="panel">
      ${list.length ? list.map(m => `<div class="mistake-item"><span class="cat">${esc(m.category)}</span>
        <div class="body"><div class="o">${esc(m.original)}</div><div class="c">${esc(m.corrected)}</div>
        <div class="meta">${esc(m.explanation || '')} · ${fmtClock(m.createdAt)}</div></div></div>`).join('') : '<div class="empty">✨ No mistakes recorded yet.</div>'}
    </div>
  </div>`;
  $$('[data-cat]').forEach(b => b.onclick = () => { filter = b.dataset.cat; renderMistakes(); });
}