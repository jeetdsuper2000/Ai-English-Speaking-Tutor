import { $, esc, toast } from '../utils.js';
import { CONFIG } from '../config.js';
import { Repo } from '../storage.js';
import { Router } from '../router.js';
import { TTS } from '../speech/tts.js';
import { API } from '../api.js';

export function renderSettings() {
  const user = Repo.getUser();
  if (!user) return;
  const s = Repo.getSettings();
  const voices = TTS.getVoices();

  $('#app').innerHTML = `
  <div class="wrap" style="max-width:680px;padding:0 16px 60px">
    <div class="page-head"><h1>Settings</h1></div>

    <div class="panel" style="margin-top:20px">
      <h2>👤 Profile</h2>
      <div class="field"><label>Name</label><input id="setName" type="text" value="${esc(user.name)}" /></div>
      <div class="field"><label>Profession</label><input id="setProfession" type="text" value="${esc(user.profession || '')}" placeholder="e.g. Software engineer" /></div>
      <div class="field"><label>Level</label>
        <select id="setLevel">${CONFIG.levels.map(l => `<option ${l === user.level ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <button class="btn btn-primary btn-sm" id="saveProfile">Save</button>
    </div>

    <div class="panel" style="margin-top:14px">
      <h2>🎙️ Voice</h2>
      <div class="field"><label>Speech recognition language</label>
        <select id="setLang">
          <option value="en-IN" ${s.sttLang === 'en-IN' ? 'selected' : ''}>English (India) — best for Hinglish</option>
          <option value="en-US" ${s.sttLang === 'en-US' ? 'selected' : ''}>English (US)</option>
          <option value="en-GB" ${s.sttLang === 'en-GB' ? 'selected' : ''}>English (UK)</option>
        </select></div>
      <div class="field"><label>Tutor speed — <span id="rateVal">${(s.rate || 0.95).toFixed(2)}</span>×</label>
        <input id="setRate" type="range" min="0.6" max="1.3" step="0.05" value="${s.rate || 0.95}" style="width:100%" /></div>
      <div class="field"><label>Tutor voice</label>
        <select id="setVoice"><option value="">Automatic</option>
          ${voices.map(v => `<option value="${esc(v.voiceURI)}" ${s.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name)} — ${esc(v.lang)}</option>`).join('')}
        </select></div>
      <div class="field"><label>Correction strictness</label>
        <select id="setCorrection">${Object.entries(CONFIG.correctionModes).map(([k, v]) => `<option value="${k}" ${s.correctionMode === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></div>
      <button class="btn btn-primary btn-sm" id="saveVoice">Save voice</button>
      <button class="btn btn-ghost btn-sm" id="testVoice" style="margin-left:8px">Test voice</button>
    </div>

    <div class="panel" style="margin-top:14px">
      <h2>💳 Plan</h2>
      <p style="color:var(--muted);font-size:14px;margin:0 0 14px">You're on the <b style="color:var(--text)">${user.plan === 'pro' ? 'Pro' : user.plan === 'pro_plus' ? 'Pro+' : 'Free'}</b> plan.</p>
      ${user.plan === 'free' ? `<button class="btn btn-primary btn-sm" id="upgradeBtn">Upgrade to Pro — ₹${CONFIG.pricing.pro}/month</button>
        <p class="tiny" style="margin-top:10px">Unlimited speaking, full mistake history, cloud role backup. Cancel anytime.</p>` : `<button class="btn btn-ghost btn-sm" id="cancelPro">Cancel subscription</button>`}
    </div>

    <div class="panel" style="margin-top:14px">
      <h2>📤 Backup</h2>
      <p class="tiny" style="margin-bottom:14px">Export your data as JSON. Import on another device to restore.</p>
      <button class="btn btn-ghost btn-sm" id="exportBtn">Export</button>
      <button class="btn btn-ghost btn-sm" id="importBtn" style="margin-left:8px">Import</button>
      <input id="importFile" type="file" accept=".json" style="display:none" />
    </div>

    <div class="panel" style="margin-top:14px">
      <h2>💬 Support</h2>
      <p class="tiny" style="margin-bottom:14px">Questions, bugs, feature requests — anything. We read every ticket.</p>
      <a href="#/support" class="btn btn-ghost btn-sm">Open support</a>
    </div>

    <div class="panel" style="margin-top:14px">
      <h2>🚪 Account</h2>
      <button class="btn btn-ghost btn-sm" id="signOut">Sign out</button>
      <button class="btn btn-danger btn-sm" id="wipe" style="margin-left:8px">Delete all data</button>
    </div>
  </div>`;

  $('#saveProfile').onclick = async () => {
    const name = $('#setName').value.trim();
    const profession = $('#setProfession').value.trim();
    const level = $('#setLevel').value;
    if (!name) { toast('Name required'); return; }
    const updated = { ...user, name, profession, level };
    Repo.setUser(updated);
    try { await API.createOrUpdateUser({ id: user.id, name, level, profession }); } catch {}
    toast('Saved'); location.reload();
  };

  $('#setRate').oninput = e => { $('#rateVal').textContent = parseFloat(e.target.value).toFixed(2); };
  $('#saveVoice').onclick = () => {
    Repo.setSettings({
      sttLang: $('#setLang').value,
      rate: parseFloat($('#setRate').value),
      voiceURI: $('#setVoice').value || null,
      correctionMode: $('#setCorrection').value
    });
    toast('Voice settings saved');
  };
  $('#testVoice').onclick = () => {
    TTS.cancel();
    TTS.speak("Hello! This is how I'll sound.", { rate: parseFloat($('#setRate').value) });
  };

  const upBtn = $('#upgradeBtn');
  if (upBtn) upBtn.onclick = async () => {
    try {
      const data = await API.createSubscription(user.id, 'pro');
      if (!window.Razorpay) { toast('Razorpay not loaded'); return; }
      const rzp = new window.Razorpay({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: 'FluentAI Pro',
        description: 'Unlimited speaking',
        handler: () => { toast('Payment successful!'); setTimeout(() => location.reload(), 1500); }
      });
      rzp.open();
    } catch (e) { toast('Could not start payment'); }
  };
  const cancelBtn = $('#cancelPro');
  if (cancelBtn) cancelBtn.onclick = async () => {
    if (!confirm('Cancel Pro?')) return;
    try { await API.cancelSubscription(user.id); toast('Cancelled'); } catch { toast('Error'); }
  };

  $('#exportBtn').onclick = () => {
    const data = localStorage.getItem('fluentai.v1');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluentai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        localStorage.setItem('fluentai.v1', JSON.stringify(data));
        toast('Imported — reloading');
        setTimeout(() => location.reload(), 800);
      } catch { toast('Invalid file'); }
    };
    reader.readAsText(file);
  };

  $('#signOut').onclick = () => { Repo.clearUser(); Router.navigate('#/'); location.reload(); };
  $('#wipe').onclick = () => {
    if (!confirm('Delete all data? Cannot be undone.')) return;
    localStorage.clear();
    Router.navigate('#/');
    location.reload();
  };
}