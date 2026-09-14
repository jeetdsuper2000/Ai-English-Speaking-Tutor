import { $, $$, esc, toast, fmtDur, fmtClock } from '../utils.js';
import { API } from '../api.js';

let section = 'overview';

export async function renderAdmin() {
  const user = JSON.parse(localStorage.getItem('fluentai.user') || 'null');
  if (!user) { location.hash = '#/'; return; }

  try {
    const me = await API.getUser(user.id);
    if (!me.is_admin) {
      toast('Access denied');
      location.hash = '#/dashboard';
      return;
    }
  } catch { location.hash = '#/dashboard'; return; }

  $('#app').innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div style="margin-bottom:14px">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);font-weight:700;margin-bottom:6px">Admin</div>
        </div>
        <nav class="admin-nav" id="adminNav">
          <button data-s="overview" class="on">📊 Overview</button>
          <button data-s="users">👥 Users</button>
          <button data-s="sessions">🎙️ Sessions</button>
          <button data-s="payments">💳 Payments</button>
          <button data-s="support">🎫 Support</button>
          <button data-s="plans">📦 Plans</button>
          <button data-s="settings">⚙️ Settings</button>
          <button data-s="logs">📋 Activity</button>
        </nav>
      </aside>
      <main class="admin-content" id="adminContent"><div class="empty">Loading…</div></main>
    </div>`;

  $$('#adminNav button').forEach(b => b.onclick = () => {
    section = b.dataset.s;
    $$('#adminNav button').forEach(x => x.classList.toggle('on', x === b));
    renderSection();
  });

  renderSection();
}

async function renderSection() {
  const el = $('#adminContent');
  el.innerHTML = '<div class="empty">Loading…</div>';
  try {
    switch (section) {
      case 'overview': return renderOverview(el);
      case 'users': return renderUsers(el);
      case 'sessions': return renderSessions(el);
      case 'payments': return renderPayments(el);
      case 'support': return renderSupport(el);
      case 'plans': return renderPlans(el);
      case 'settings': return renderSettings(el);
      case 'logs': return renderLogs(el);
    }
  } catch (e) {
    el.innerHTML = `<div class="banner bad">Failed: ${esc(e.message)}</div>`;
  }
}

async function renderOverview(el) {
  const stats = await API.adminStats();
  el.innerHTML = `
    <div class="page-head"><h1>Overview</h1></div>
    <div class="grid g4" style="margin-top:20px">
      <div class="stat"><div class="k">Total Users</div><div class="v">${stats.users.total}</div></div>
      <div class="stat"><div class="k">Active Today</div><div class="v">${stats.users.activeToday}</div></div>
      <div class="stat"><div class="k">Pro Users</div><div class="v">${stats.plans.pro}</div></div>
      <div class="stat"><div class="k">Pro+ Users</div><div class="v">${stats.plans.pro_plus}</div></div>
      <div class="stat"><div class="k">Sessions Today</div><div class="v">${stats.sessions.today}</div></div>
      <div class="stat"><div class="k">Revenue (month)</div><div class="v">₹${stats.revenue.month}</div></div>
      <div class="stat"><div class="k">Open Tickets</div><div class="v">${stats.support.open}</div></div>
      <div class="stat"><div class="k">Signups (week)</div><div class="v">${stats.users.week}</div></div>
    </div>
    <div class="grid g2" style="margin-top:20px">
      <div class="panel"><h2>📈 Recent signups</h2>
        ${(stats.recentSignups || []).map(u => `<div class="mistake-item"><span class="cat">${esc(u.plan)}</span>
          <div class="body"><div style="font-weight:600">${esc(u.name)}</div>
          <div class="meta">${fmtClock(Number(u.created_at))}</div></div></div>`).join('') || '<div class="empty">None</div>'}
      </div>
      <div class="panel"><h2>🎫 Recent tickets</h2>
        ${(stats.recentTickets || []).map(t => `<div class="mistake-item"><span class="cat">${esc(t.status)}</span>
          <div class="body"><div style="font-weight:600">${esc(t.subject)}</div>
          <div class="meta">${fmtClock(Number(t.created_at))}</div></div></div>`).join('') || '<div class="empty">None</div>'}
      </div>
    </div>
  `;
}

async function renderUsers(el) {
  const users = await API.adminListUsers({ limit: 100 });
  el.innerHTML = `
    <div class="page-head"><h1>Users</h1><p>${users.length} users</p></div>
    <div class="admin-table panel" style="margin-top:20px">
      <table>
        <thead><tr><th>Name</th><th>Plan</th><th>Profession</th><th>Nancy role</th><th>Last seen</th><th></th></tr></thead>
        <tbody>${users.map(u => `<tr>
          <td>${esc(u.name)}</td>
          <td><span class="cat">${esc(u.plan)}</span></td>
          <td>${esc(u.profession || '—')}</td>
          <td>${esc(u.nancy_role || '—')}</td>
          <td style="color:var(--dim);font-size:12px">${u.last_seen_at ? fmtClock(Number(u.last_seen_at)) : '—'}</td>
          <td><button class="btn btn-ghost btn-sm" data-view="${u.id}">View</button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
  $$('[data-view]').forEach(b => b.onclick = () => openUser(b.dataset.view));
}

async function openUser(id) {
  const data = await API.adminGetUser(id);
  const root = $('#modalRoot');
  root.innerHTML = `
    <div class="overlay" id="ov"><div class="modal" style="max-width:560px">
      <h2>${esc(data.user.name)}</h2>
      <p class="sub">${esc(data.user.plan)} · joined ${fmtClock(Number(data.user.created_at))}</p>
      <div class="grid g2" style="gap:10px;margin:14px 0">
        <div class="stat"><div class="k">Sessions</div><div class="v">${data.stats.sessions}</div></div>
        <div class="stat"><div class="k">Minutes</div><div class="v">${data.stats.minutes}</div></div>
        <div class="stat"><div class="k">Mistakes</div><div class="v">${data.stats.mistakes}</div></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" data-imp="${id}">View as user</button>
        <button class="btn ${data.user.is_banned ? 'btn-ghost' : 'btn-danger'} btn-sm" data-ban="${id}" data-banned="${data.user.is_banned ? 1 : 0}">${data.user.is_banned ? 'Unban' : 'Ban'}</button>
        <button class="btn btn-ghost btn-sm" id="closeModal">Close</button>
      </div>
    </div></div>`;
  $('#closeModal').onclick = () => root.innerHTML = '';
  $('#ov').onclick = (e) => { if (e.target.id === 'ov') root.innerHTML = ''; };
  $('[data-imp]').onclick = () => {
    localStorage.setItem('fluentai.impersonate', id);
    toast('Viewing as user');
    location.hash = '#/dashboard';
  };
  $('[data-ban]').onclick = async () => {
    await API.adminBanUser(id, !data.user.is_banned);
    toast('Updated');
    root.innerHTML = '';
    renderSection();
  };
}

async function renderSessions(el) {
  const sessions = await API.adminListSessions({ limit: 100 });
  el.innerHTML = `
    <div class="page-head"><h1>Sessions</h1></div>
    <div class="admin-table panel" style="margin-top:20px">
      <table>
        <thead><tr><th>User</th><th>Scenario</th><th>Duration</th><th>When</th></tr></thead>
        <tbody>${sessions.map(s => `<tr>
          <td>${esc(s.user_name || s.user_id)}</td>
          <td>${esc(s.scenario_name)}</td>
          <td>${fmtDur(s.duration)}</td>
          <td style="color:var(--dim);font-size:12px">${fmtClock(Number(s.started_at))}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

async function renderPayments(el) {
  const payments = await API.adminListPayments({ limit: 100 });
  el.innerHTML = `
    <div class="page-head"><h1>Payments</h1></div>
    <div class="admin-table panel" style="margin-top:20px">
      <table>
        <thead><tr><th>User</th><th>Plan</th><th>Amount</th><th>Status</th><th>When</th></tr></thead>
        <tbody>${payments.map(p => `<tr>
          <td>${esc(p.user_name || p.user_id)}</td>
          <td>${esc(p.plan_id)}</td>
          <td>₹${(p.amount / 100).toFixed(0)}</td>
          <td><span class="cat">${esc(p.status)}</span></td>
          <td style="color:var(--dim);font-size:12px">${fmtClock(Number(p.created_at))}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

async function renderSupport(el) {
  const tickets = await API.adminListTickets({ limit: 100 });
  el.innerHTML = `
    <div class="page-head"><h1>Support Tickets</h1></div>
    <div class="panel" style="margin-top:20px">
      ${tickets.length ? tickets.map(t => `<div class="mistake-item">
        <span class="cat">${esc(t.status)}</span>
        <div class="body"><div style="font-weight:600">${esc(t.subject)}</div>
        <div class="meta">${esc(t.user_name || '')} · ${esc(t.category)} · ${fmtClock(Number(t.created_at))}</div></div>
        <button class="btn btn-ghost btn-sm" data-ticket="${t.id}">Open</button>
      </div>`).join('') : '<div class="empty">No tickets</div>'}
    </div>`;
  $$('[data-ticket]').forEach(b => b.onclick = () => openTicket(b.dataset.ticket));
}

async function openTicket(id) {
  const ticket = await API.adminGetTicket(id);
  const root = $('#modalRoot');
  root.innerHTML = `
    <div class="overlay" id="ov"><div class="modal" style="max-width:600px">
      <h2>${esc(ticket.subject)}</h2>
      <p class="sub">${esc(ticket.category)} · ${esc(ticket.status)}</p>
      <div style="max-height:40vh;overflow-y:auto;margin-bottom:14px">
        ${ticket.messages.map(m => `<div class="turn ${m.sender === 'user' ? 'user' : ''}" style="margin-bottom:10px;max-width:100%">
          <div class="bub"><div class="who">${m.sender === 'user' ? 'User' : 'Admin'}</div><div>${esc(m.body)}</div>
          <div style="font-size:11px;color:var(--dim);margin-top:4px">${fmtClock(Number(m.created_at))}</div></div>
        </div>`).join('')}
      </div>
      ${ticket.status !== 'closed' ? `
      <div class="field"><textarea id="replyBody" rows="3" placeholder="Reply…"></textarea></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" id="sendReply">Send</button>
        <button class="btn btn-ghost btn-sm" id="closeTicket">Close ticket</button>
        <button class="btn btn-ghost btn-sm" id="closeModal">X</button>
      </div>` : `<button class="btn btn-ghost btn-sm" id="closeModal">Close</button>`}
    </div></div>`;
  const close = () => { root.innerHTML = ''; };
  $('#closeModal').onclick = close;
  $('#ov').onclick = (e) => { if (e.target.id === 'ov') close(); };
  const send = $('#sendReply');
  if (send) send.onclick = async () => {
    const body = $('#replyBody').value.trim();
    if (!body) return;
    await API.adminReplyTicket(id, body);
    close(); renderSection();
  };
  const closeT = $('#closeTicket');
  if (closeT) closeT.onclick = async () => {
    await API.adminCloseTicket(id);
    close(); renderSection();
  };
}

async function renderPlans(el) {
  const plans = await API.adminListPlans();
  el.innerHTML = `
    <div class="page-head"><h1>Plans</h1><p>Configurable tiers — no code changes needed.</p></div>
    <div class="grid g3" style="margin-top:20px">
      ${plans.map(p => `<div class="panel">
        <h2>${esc(p.name)}</h2>
        <div style="font-size:26px;font-weight:800;margin:10px 0">₹${p.price_inr}<span style="font-size:14px;color:var(--muted)">/mo</span></div>
        <div class="tiny" style="display:grid;gap:4px">
          <div>Daily: ${p.daily_minutes ? p.daily_minutes + ' min' : 'Unlimited'}</div>
          <div>Storage: ${p.storage_mb} MB</div>
          <div>Cloud: ${p.cloud_sync ? '✓' : '✗'} · History: ${p.full_history ? '✓' : '✗'} · Summary: ${p.summarization ? '✓' : '✗'}</div>
        </div>
      </div>`).join('')}
    </div>`;
}

async function renderSettings(el) {
  const settings = await API.adminGetSettings();
  el.innerHTML = `
    <div class="page-head"><h1>Settings</h1><p>Live config — no deploy needed.</p></div>
    <div class="panel" style="margin-top:20px">
      ${Object.entries(settings).map(([k, v]) => `
        <div class="field"><label>${esc(k.replace(/_/g, ' '))}</label>
        <input data-setting="${esc(k)}" value="${esc(v)}" /></div>`).join('')}
      <button class="btn btn-primary btn-sm" id="saveSettings">Save all</button>
    </div>`;
  $('#saveSettings').onclick = async () => {
    const patch = {};
    $$('[data-setting]').forEach(i => patch[i.dataset.setting] = i.value);
    await API.adminUpdateSettings(patch);
    toast('Saved');
  };
}

async function renderLogs(el) {
  const logs = await API.adminListLogs({ limit: 200 });
  el.innerHTML = `
    <div class="page-head"><h1>Activity log</h1></div>
    <div class="panel" style="margin-top:20px">
      ${logs.map(l => `<div class="mistake-item">
        <span class="cat">${esc(l.action)}</span>
        <div class="body"><div style="font-weight:600">${esc(l.actor_id)}</div>
        <div class="meta">${esc(l.target_type || '')} ${esc(l.target_id || '')} · ${fmtClock(Number(l.created_at))}</div></div>
      </div>`).join('')}
    </div>`;
}
