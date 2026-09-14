import { $, $$, esc, toast } from '../utils.js';
import { Repo } from '../storage.js';
import { Router } from '../router.js';
import { createEngine } from '../engine/tutor-engine.js';
import { STT } from '../speech/stt.js';
import { TTS } from '../speech/tts.js';
import { SCENARIOS } from '../scenarios.js';

let currentEngine = null;

export function renderTutor(params) {
  const user = Repo.getUser();
  if (!user) { Router.navigate('#/'); return; }

  const requested = params.get('scenario');
  const scenarioId = requested && SCENARIOS.some(s => s.id === requested) ? requested : 'daily';
  const scenario = SCENARIOS.find(s => s.id === scenarioId);

  $('#app').innerHTML = `
  <div class="tutor-shell">
    <div class="tutor-top">
      <span class="tag">🎯 <b>${esc(scenario.name)}</b></span>
      <span class="tag" id="levelTag">📊 <b>${esc(user.level)}</b></span>
      <button class="btn btn-ghost btn-sm" id="changeBtn" style="margin-left:auto">Change</button>
      <button class="btn btn-ghost btn-sm" id="endBtn">End</button>
    </div>
    <div class="stage" id="stage" data-state="idle">
      <div class="avatar">👩‍🎨</div>
      <div class="status" id="status" data-s="idle">Loading…</div>
      <div class="tutor-say" id="tutorSay"></div>
      <div class="correction-box" id="correctionBox"></div>
      <div class="interim" id="interim"></div>
    </div>
    <div class="turns" id="turns"></div>
  </div>`;

  renderMicDock();

  $('#changeBtn').onclick = openScenarioPicker;
  $('#endBtn').onclick = async () => {
    if (!currentEngine) { Router.navigate('#/dashboard'); return; }
    const session = await currentEngine.end();
    showSummary(session);
  };

  const engine = createEngine({ scenario, level: user.level, user, onEnd: () => {} });
  currentEngine = engine;
  setTimeout(() => engine.start(), 300);
}

function renderMicDock() {
  const dock = $('#micDock');
  dock.style.display = 'flex';
  const continuous = Repo.getSettings().continuousMode !== false;
  dock.innerHTML = `
    <label class="cont-toggle" id="contToggleLabel">
      <input type="checkbox" id="contToggle" ${continuous ? 'checked' : ''} />
      <span class="sw"></span>
      <span class="label">Continuous</span>
    </label>
    <div class="mic-row">
      <button class="mic" id="micBtn" data-state="idle" aria-label="Tap to speak"><span id="micIcon">🎤</span></button>
    </div>
    <div class="mic-hint" id="micHint">Tap to speak</div>`;
  $('#micBtn').addEventListener('click', () => currentEngine?.toggleMic());
  $('#contToggle').addEventListener('change', (e) => {
    currentEngine?.setContinuous(e.target.checked);
    toast(e.target.checked ? 'Continuous mode on — just speak' : 'Continuous mode off');
  });
  if (!STT.supported) {
    $('#micBtn').disabled = true;
    $('#micBtn').style.opacity = '.45';
    $('#micHint').textContent = 'Speech recognition not supported — use Chrome, Edge or Safari';
  }
}

function openScenarioPicker() {
  const root = $('#modalRoot');
  root.innerHTML = `
    <div class="overlay" id="ov"><div class="modal" style="max-width:520px">
      <h2>Choose a scenario</h2><p class="sub">Switching starts a new session.</p>
      <div style="display:grid;gap:9px;max-height:52vh;overflow-y:auto">
        ${SCENARIOS.map(s => `<button class="btn btn-ghost" style="justify-content:flex-start;text-align:left;padding:12px 14px" data-pick="${s.id}">
          <span style="font-size:19px">${s.icon}</span>
          <span style="flex:1;margin-left:10px"><span style="display:block;font-weight:640;font-size:14.5px">${esc(s.name)}</span>
          <span style="display:block;font-size:12.5px;color:var(--muted)">${esc(s.blurb)}</span></span>
        </button>`).join('')}
      </div>
      <button class="btn btn-ghost" id="pickCancel" style="width:100%;margin-top:14px">Cancel</button>
    </div></div>`;
  const close = () => { root.innerHTML = ''; };
  $('#pickCancel').onclick = close;
  $('#ov').onclick = (e) => { if (e.target.id === 'ov') close(); };
  $$('[data-pick]').forEach(b => b.onclick = async () => {
    close();
    if (currentEngine) await currentEngine.end();
    Router.navigate(`#/tutor?scenario=${b.dataset.pick}`);
    location.reload();
  });
}

function showSummary(session) {
  const s = session.scores;
  const labelFor = { grammar: 'Grammar', vocabulary: 'Vocabulary', fluency: 'Fluency', confidence: 'Confidence', pronunciation: 'Pronunciation' };
  $('#app').innerHTML = `
    <div class="tutor-shell" style="max-width:720px">
      <div class="stage" style="min-height:auto;padding:30px 20px">
        <div class="avatar">🎉</div>
        <h1 style="margin:0;font-size:24px">Session complete</h1>
        <p style="color:var(--muted);margin:0;font-size:14px">${esc(session.scenarioName)} · ${Math.round(session.duration / 60)} min</p>
      </div>
      <div class="summary-grid">
        <div class="sum-item"><div class="v">${Math.round(session.duration / 60)}m</div><div class="k">Speaking</div></div>
        <div class="sum-item"><div class="v">${session.turnCount}</div><div class="k">Turns</div></div>
        <div class="sum-item"><div class="v">${session.wordCount}</div><div class="k">Words</div></div>
        <div class="sum-item"><div class="v">${session.mistakes.length}</div><div class="k">Corrections</div></div>
      </div>
      <div class="panel" style="margin-bottom:14px"><h2>📈 This session</h2>
        ${Object.entries(s).filter(([k, v]) => typeof v === 'number').map(([k, v]) => `
          <div class="bar-row"><div class="bar-top"><span>${labelFor[k] || k}</span><span>${v}</span></div>
          <div class="bar"><i class="${v >= 75 ? 'g' : v >= 55 ? '' : 'w'}" style="width:${v}%"></i></div></div>`).join('')}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="againBtn" style="flex:1;min-width:160px">Practise again</button>
        <button class="btn btn-ghost" id="dashBtn" style="flex:1;min-width:160px">Dashboard</button>
      </div>
    </div>`;
  $('#againBtn').onclick = () => { Router.navigate(`#/tutor?scenario=${session.scenario}`); location.reload(); };
  $('#dashBtn').onclick = () => Router.navigate('#/dashboard');
}