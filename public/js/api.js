import { CONFIG } from './config.js';

function currentUserId() {
  try { return JSON.parse(localStorage.getItem('fluentai.user'))?.id; } catch { return null; }
}

async function j(method, url, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const uid = currentUserId();
  if (uid) headers['X-User-Id'] = uid;
  const res = await fetch(CONFIG.apiBase + url, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${txt.slice(0, 100)}`);
  }
  return res.json();
}

export const API = {
  createOrUpdateUser: (p) => j('POST', '/users', p),
  getUser: (id) => j('GET', `/users/${id}`),
  saveRole: (user_id, role, profession) => j('POST', '/users/role', { user_id, role, profession }),
  getRole: (userId) => j('GET', `/users/role/${userId}`),

  createSession: (p) => j('POST', '/sessions', p),
  listSessions: (userId) => j('GET', `/sessions/${userId}`),

  pushSnapshot: (userId, data) => j('POST', `/snapshot/${userId}`, data),
  pullSnapshot: (userId) => j('GET', `/snapshot/${userId}`),

  createSubscription: (userId, plan_id) => j('POST', '/payments/create-subscription', { user_id: userId, plan_id }),
  cancelSubscription: (userId) => j('POST', '/payments/cancel', { user_id: userId }),

  listPlans: () => j('GET', '/plans'),

  // Support
  createTicket: (p) => j('POST', '/support', p),
  listTickets: (userId) => j('GET', `/support/user/${userId}`),
  getTicket: (id) => j('GET', `/support/${id}`),
  replyTicket: (id, user_id, body) => j('POST', `/support/${id}/reply`, { user_id, body }),

  // Admin
  adminStats: () => j('GET', '/admin/stats'),
  adminListUsers: (q) => j('GET', `/admin/users?limit=${q.limit || 100}`),
  adminGetUser: (id) => j('GET', `/admin/users/${id}`),
  adminBanUser: (id, banned) => j('POST', `/admin/users/${id}/ban`, { banned }),
  adminListSessions: (q) => j('GET', `/admin/sessions?limit=${q.limit || 100}`),
  adminListPayments: (q) => j('GET', `/admin/payments?limit=${q.limit || 100}`),
  adminListTickets: (q) => j('GET', `/admin/tickets?limit=${q.limit || 100}`),
  adminGetTicket: (id) => j('GET', `/admin/tickets/${id}`),
  adminReplyTicket: (id, body) => j('POST', `/admin/tickets/${id}/reply`, { body }),
  adminCloseTicket: (id) => j('POST', `/admin/tickets/${id}/close`),
  adminListPlans: () => j('GET', '/admin/plans'),
  adminUpdatePlan: (id, patch) => j('POST', `/admin/plans/${id}`, patch),
  adminGetSettings: () => j('GET', '/admin/settings'),
  adminUpdateSettings: (patch) => j('POST', '/admin/settings', patch),
  adminListLogs: (q) => j('GET', `/admin/logs?limit=${q.limit || 200}`)
};