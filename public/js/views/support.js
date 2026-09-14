import { $, $$, esc, toast, fmtClock } from '../utils.js';
import { Repo } from '../storage.js';
import { API } from '../api.js';

let view = 'list';
let currentTicketId = null;

export async function renderSupport() {
  const user = Repo.getUser();
  if (!user) return;

  if (view === 'list') {
    let tickets = [];
    try { tickets = await API.listTickets(user.id); } catch {}
    $('#app').innerHTML = `
      <div class="wrap" style="max-width:760px;padding:0 16px 60px">
        <div class="page-head"><h1>Support</h1><p>Questions, bugs, feedback — anything goes.</p></div>
        <div style="margin:20px 0">
          <button class="btn btn-primary" id="newTicket">+ New ticket</button>
        </div>
        <div class="panel">
          ${tickets.length ? tickets.map(t => `<div class="mistake-item" style="cursor:pointer" data-ticket="${t.id}">
            <span class="cat">${esc(t.status)}</span>
            <div class="body"><div style="font-weight:600">${esc(t.subject)}</div>
            <div class="meta">${esc(t.category)} · ${fmtClock(Number(t.created_at))}</div></div>
            <span style="color:var(--muted)">→</span>
          </div>`).join('') : '<div class="empty">No tickets yet.</div>'}
        </div>
      </div>`;
    $('#newTicket').onclick = () => { view = 'new'; renderSupport(); };
    $$('[data-ticket]').forEach(b => b.onclick = () => {
      currentTicketId = b.dataset.ticket;
      view = 'detail';
      renderSupport();
    });
  } else if (view === 'new') {
    $('#app').innerHTML = `
      <div class="wrap" style="max-width:640px;padding:0 16px 60px">
        <div class="page-head"><h1>New ticket</h1></div>
        <div class="panel" style="margin-top:20px">
          <div class="field"><label>Subject</label><input id="sSubject" placeholder="Short summary" /></div>
          <div class="field"><label>Category</label>
            <select id="sCategory">
              <option value="bug">Bug / something broken</option>
              <option value="billing">Billing / payment</option>
              <option value="feature">Feature request</option>
              <option value="general" selected>General</option>
            </select></div>
          <div class="field"><label>Details</label><textarea id="sBody" rows="5" placeholder="What's going on?"></textarea></div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" id="submitTicket">Submit</button>
            <button class="btn btn-ghost" id="cancelTicket">Cancel</button>
          </div>
        </div>
      </div>`;
    $('#cancelTicket').onclick = () => { view = 'list'; renderSupport(); };
    $('#submitTicket').onclick = async () => {
      const subject = $('#sSubject').value.trim();
      const body = $('#sBody').value.trim();
      const category = $('#sCategory').value;
      if (!subject || !body) { toast('Fill both fields'); return; }
      try {
        await API.createTicket({ user_id: user.id, subject, category, body });
        toast('Ticket created');
        view = 'list';
        renderSupport();
      } catch { toast('Could not create'); }
    };
  } else if (view === 'detail' && currentTicketId) {
    let ticket = null;
    try { ticket = await API.getTicket(currentTicketId); } catch {}
    if (!ticket) { view = 'list'; renderSupport(); return; }
    $('#app').innerHTML = `
      <div class="wrap" style="max-width:760px;padding:0 16px 60px">
        <div class="page-head">
          <button class="btn btn-ghost btn-sm" id="back" style="margin-bottom:10px">← Back</button>
          <h1>${esc(ticket.subject)}</h1>
          <p>${esc(ticket.category)} · ${esc(ticket.status)}</p>
        </div>
        <div class="panel" style="margin-top:20px;max-height:50vh;overflow-y:auto">
          ${ticket.messages.map(m => `<div class="turn ${m.sender === 'user' ? 'user' : ''}" style="margin-bottom:12px;max-width:100%">
            <div class="bub"><div class="who">${m.sender === 'user' ? 'You' : 'Support'}</div>
            <div>${esc(m.body)}</div>
            <div style="font-size:11px;color:var(--dim);margin-top:6px">${fmtClock(Number(m.created_at))}</div></div>
          </div>`).join('')}
        </div>
        ${ticket.status !== 'closed' ? `<div class="panel" style="margin-top:14px">
          <div class="field"><textarea id="replyBody" rows="3" placeholder="Write a reply…"></textarea></div>
          <button class="btn btn-primary btn-sm" id="sendReply">Send</button>
        </div>` : '<div class="banner info" style="margin-top:14px">This ticket is closed. Create a new one if you need more help.</div>'}
      </div>`;
    $('#back').onclick = () => { view = 'list'; currentTicketId = null; renderSupport(); };
    const send = $('#sendReply');
    if (send) send.onclick = async () => {
      const body = $('#replyBody').value.trim();
      if (!body) return;
      try {
        await API.replyTicket(ticket.id, user.id, body);
        renderSupport();
      } catch { toast('Could not send'); }
    };
  }
}