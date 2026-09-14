import { $, $$, esc, toast } from '../utils.js';
import { CONFIG } from '../config.js';
import { Repo } from '../storage.js';
import { Router } from '../router.js';
import { API } from '../api.js';
import { SCENARIOS } from '../scenarios.js';

export function renderLanding() {
  $('#app').innerHTML = `
  <section class="hero wrap" style="padding:56px 0 40px;text-align:center">
    <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:100px;background:var(--brand-soft);border:1px solid rgba(99,102,241,.32);font-size:12px;font-weight:600;color:#C7D2FE">Voice-first English practice</span>
    <h1 style="font-size:clamp(30px,7vw,58px);line-height:1.08;letter-spacing:-.035em;font-weight:800;margin:18px auto 16px;max-width:820px">Speak English. Think in English.<br><span style="background:var(--grad);-webkit-background-clip:text;color:transparent">Become confident.</span></h1>
    <p style="font-size:clamp(15px,2.2vw,18px);color:var(--muted);max-width:620px;margin:0 auto 30px;line-height:1.6">Practice real conversations with a friend who listens, corrects you gently, and remembers everything you've talked about.</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-primary btn-lg" id="ctaStart">🎤 Start Speaking</button>
    </div>
    <p class="tiny" style="margin-top:16px">Free · Works in your browser · No credit card</p>
  </section>

  <section class="wrap" style="padding:48px 16px">
    <h2 style="font-size:clamp(22px,4vw,32px);font-weight:750;letter-spacing:-.03em;margin:0 0 10px">Built like a friendship, not a classroom</h2>
    <p style="color:var(--muted);margin:0 0 30px;font-size:15.5px">You already understand English. The gap is speaking.</p>
    <div class="grid g3">
      ${[
        ['🗣️','Speak Hindi, learn English','Say something in Hindi. Nancy responds in English with the English version — never replies in Hindi.'],
        ['🧠','Real memory','Nancy remembers your girlfriend, job, gym routine. Days later, she asks how those things are going.'],
        ['🎭','Friend, not teacher','She shares her own day, her own struggles, her own small wins. Two-way conversation.'],
        ['🎯','Native + professional','Every correction comes with a casual version and an office-ready version.'],
        ['🔁','Repeat and verify','She stops you when it matters, teaches the fix, and waits for you to say it back.'],
        ['📈','Honest progress','Grammar, vocabulary, fluency, recurring mistakes. No fake scores.']
      ].map(([i,t,d]) => `<div class="card"><div class="icon-box">${i}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}
    </div>
  </section>

  <section class="wrap" style="padding:48px 16px">
    <h2 style="font-size:clamp(22px,4vw,32px);font-weight:750;letter-spacing:-.03em;margin:0 0 10px">Choose a scenario</h2>
    <p style="color:var(--muted);margin:0 0 30px;font-size:15.5px">Each one behaves differently.</p>
    <div class="chips" id="scenarioChips"></div>
  </section>

  <section class="wrap" style="padding:48px 16px">
    <h2 style="font-size:clamp(22px,4vw,32px);font-weight:750;letter-spacing:-.03em;margin:0 0 10px">Simple pricing</h2>
    <p style="color:var(--muted);margin:0 0 30px;font-size:15.5px">Start free. Upgrade only if you're actually using it.</p>
    <div class="grid g3" style="max-width:760px">
      <div class="card">
        <h3>Free</h3>
        <div style="font-size:36px;font-weight:800;letter-spacing:-.04em;margin:10px 0 6px">₹0</div>
        <p class="tiny" style="margin-bottom:14px">For getting started</p>
        <ul style="list-style:none;padding:0;margin:0 0 20px;display:grid;gap:10px;font-size:14px;color:var(--muted)">
          <li>✓ <b style="color:var(--text)">10 minutes</b> of speaking per day</li>
          <li>✓ All scenarios</li>
          <li>✓ Voice corrections</li>
          <li>✓ Hindi → English help</li>
        </ul>
        <button class="btn btn-ghost" style="width:100%" data-start>Start free</button>
      </div>
      <div class="card" style="border-color:rgba(99,102,241,.5)">
        <span style="position:absolute;top:14px;right:14px;font-size:10.5px;font-weight:700;padding:5px 10px;border-radius:100px;background:var(--grad);color:#fff;text-transform:uppercase">Recommended</span>
        <h3>Pro</h3>
        <div style="font-size:36px;font-weight:800;letter-spacing:-.04em;margin:10px 0 6px">₹${CONFIG.pricing.pro}<span style="font-size:14px;color:var(--muted);font-weight:500">/month</span></div>
        <p class="tiny" style="margin-bottom:14px">For serious learners</p>
        <ul style="list-style:none;padding:0;margin:0 0 20px;display:grid;gap:10px;font-size:14px;color:var(--muted)">
          <li>✓ <b style="color:var(--text)">Unlimited</b> speaking time</li>
          <li>✓ Full mistake history</li>
          <li>✓ Cloud role backup</li>
          <li>✓ Advanced pronunciation</li>
        </ul>
        <button class="btn btn-primary" style="width:100%" data-start>Start with Free</button>
      </div>
    </div>
  </section>

  <footer><div class="wrap" style="display:flex;gap:14px;flex-wrap:wrap;justify-content:space-between;padding:0 16px">
    <div>© ${new Date().getFullYear()} FluentAI</div>
    <div>Speak English. Think in English.</div>
  </div></footer>`;

  const chipsEl = $('#scenarioChips');
  chipsEl.innerHTML = SCENARIOS.map(s => `<button class="chip" data-scenario="${s.id}">${s.icon} ${esc(s.name)}</button>`).join('');
  $$('[data-scenario]').forEach(b => b.onclick = () => openAuthModal(null, b.dataset.scenario));
  $('#ctaStart').onclick = () => openAuthModal();
  $$('[data-start]').forEach(b => b.onclick = () => openAuthModal());
}

export function openAuthModal(subtitle, preselectedScenario) {
  const root = $('#modalRoot');
  root.innerHTML = `
    <div class="overlay" id="ov">
      <div class="modal" role="dialog" aria-modal="true">
        <h2>Let's get you speaking</h2>
        <p class="sub">${esc(subtitle || 'Your conversations stay on your device. No email needed.')}</p>
        <div class="field"><label for="auName">Your name</label>
          <input id="auName" type="text" placeholder="e.g. Rahul" autocomplete="name" /></div>
        <div class="field"><label for="auProfession">What do you do? (optional)</label>
          <input id="auProfession" type="text" placeholder="e.g. Software engineer, Doctor, Teacher" /></div>
        <div class="field"><label for="auLevel">Your English level</label>
          <select id="auLevel">${CONFIG.levels.map(l => `<option ${l === 'Intermediate' ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <button class="btn btn-primary" id="auGo" style="width:100%;margin-top:6px">Start Speaking</button>
        <button class="btn btn-ghost" id="auCancel" style="width:100%;margin-top:10px">Cancel</button>
      </div>
    </div>`;
  const close = () => { root.innerHTML = ''; };
  $('#auCancel').onclick = close;
  $('#ov').onclick = (e) => { if (e.target.id === 'ov') close(); };
  $('#auGo').onclick = async () => {
    const name = $('#auName').value.trim();
    const profession = $('#auProfession').value.trim();
    const level = $('#auLevel').value;
    if (!name) { toast('Please enter your name'); $('#auName').focus(); return; }

    const user = { id: 'u_' + Math.random().toString(36).slice(2, 10), name, level, profession, plan: 'free', createdAt: Date.now() };
    Repo.setUser(user);
    try { await API.createOrUpdateUser({ id: user.id, name, level, profession }); } catch {}
    close();
    toast(`Welcome, ${name}!`);
    Router.navigate('#/tutor' + (preselectedScenario ? `?scenario=${preselectedScenario}` : ''));
  };
  setTimeout(() => $('#auName')?.focus(), 80);
}