import { Router } from 'express';
import { query } from '../db.js';
import crypto from 'node:crypto';

const r = Router();
const uid = () => crypto.randomBytes(8).toString('hex');

async function requireAdmin(req, res, next) {
  const userId = req.headers['x-user-id'] || req.query.user_id || req.body.user_id;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const [user] = await query('SELECT is_admin, is_banned FROM users WHERE id=?', [userId]);
  if (!user || !user.is_admin) return res.status(403).json({ error: 'forbidden' });
  if (user.is_banned) return res.status(403).json({ error: 'banned' });
  req.adminId = userId;
  next();
}

async function logAction(actorId, action, targetId, targetType, meta = {}) {
  await query(
    'INSERT INTO activity_log (id, actor_id, actor_type, action, target_id, target_type, meta, created_at) VALUES (?,?,?,?,?,?,?,?)',
    ['l_' + uid(), actorId, 'admin', action, targetId, targetType, JSON.stringify(meta), Date.now()]
  );
}

r.get('/stats', requireAdmin, async (_req, res) => {
  const now = Date.now();
  const dayAgo = now - 86400000;
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;

  const [users] = await query('SELECT COUNT(*) as total FROM users');
  const [activeToday] = await query('SELECT COUNT(*) as c FROM users WHERE last_seen_at > ?', [dayAgo]);
  const [week] = await query('SELECT COUNT(*) as c FROM users WHERE created_at > ?', [weekAgo]);
  const [pro] = await query("SELECT COUNT(*) as c FROM users WHERE plan='pro'");
  const [proPlus] = await query("SELECT COUNT(*) as c FROM users WHERE plan='pro_plus'");
  const [sessionsToday] = await query('SELECT COUNT(*) as c FROM sessions WHERE started_at > ?', [dayAgo]);
  const [revenue] = await query("SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status='captured' AND created_at > ?", [monthAgo]);
  const [openTickets] = await query("SELECT COUNT(*) as c FROM support_tickets WHERE status='open'");
  const recentSignups = await query('SELECT id, name, plan, created_at FROM users ORDER BY created_at DESC LIMIT 5');
  const recentTickets = await query('SELECT id, subject, status, created_at FROM support_tickets ORDER BY created_at DESC LIMIT 5');

  res.json({
    users: { total: users.total, activeToday: activeToday.c, week: week.c },
    plans: { pro: pro.c, pro_plus: proPlus.c },
    sessions: { today: sessionsToday.c },
    revenue: { month: (Number(revenue.s) / 100).toFixed(2) },
    support: { open: openTickets.c },
    recentSignups, recentTickets
  });
});

r.get('/users', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const users = await query(
    'SELECT id, name, email, phone, plan, level, profession, nancy_role, is_admin, is_banned, created_at, last_seen_at FROM users ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
  res.json(users);
});

r.get('/users/:id', requireAdmin, async (req, res) => {
  const [user] = await query('SELECT * FROM users WHERE id=?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'not found' });
  delete user.password_hash;
  const [sessions] = await query('SELECT COUNT(*) as c, COALESCE(SUM(duration),0) as d FROM sessions WHERE user_id=?', [req.params.id]);
  const [mistakes] = await query('SELECT COUNT(*) as c FROM mistakes WHERE user_id=?', [req.params.id]);
  res.json({
    user,
    stats: { sessions: sessions.c, minutes: Math.round(sessions.d / 60), mistakes: mistakes.c, streak: 0 }
  });
});

r.post('/users/:id/ban', requireAdmin, async (req, res) => {
  const { banned } = req.body;
  await query('UPDATE users SET is_banned=? WHERE id=?', [banned ? 1 : 0, req.params.id]);
  await logAction(req.adminId, banned ? 'ban_user' : 'unban_user', req.params.id, 'user');
  res.json({ ok: true });
});

r.get('/sessions', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const sessions = await query(
    `SELECT s.*, u.name as user_name FROM sessions s
     LEFT JOIN users u ON u.id = s.user_id
     ORDER BY s.started_at DESC LIMIT ?`, [limit]
  );
  res.json(sessions);
});

r.get('/payments', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const payments = await query(
    `SELECT p.*, u.name as user_name FROM payments p
     LEFT JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC LIMIT ?`, [limit]
  );
  res.json(payments);
});

r.get('/tickets', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const tickets = await query(
    `SELECT t.*, u.name as user_name FROM support_tickets t
     LEFT JOIN users u ON u.id = t.user_id
     ORDER BY t.created_at DESC LIMIT ?`, [limit]
  );
  res.json(tickets);
});

r.get('/tickets/:id', requireAdmin, async (req, res) => {
  const [ticket] = await query('SELECT * FROM support_tickets WHERE id=?', [req.params.id]);
  if (!ticket) return res.status(404).json({ error: 'not found' });
  const messages = await query('SELECT * FROM support_messages WHERE ticket_id=? ORDER BY created_at', [req.params.id]);
  res.json({ ...ticket, messages });
});

r.post('/tickets/:id/reply', requireAdmin, async (req, res) => {
  await query(
    'INSERT INTO support_messages (id, ticket_id, sender, sender_id, body, created_at) VALUES (?,?,?,?,?,?)',
    ['m_' + uid(), req.params.id, 'admin', req.adminId, req.body.body, Date.now()]
  );
  await query('UPDATE support_tickets SET status=?, updated_at=? WHERE id=?', ['in_progress', Date.now(), req.params.id]);
  await logAction(req.adminId, 'reply_ticket', req.params.id, 'support_ticket');
  res.json({ ok: true });
});

r.post('/tickets/:id/close', requireAdmin, async (req, res) => {
  await query('UPDATE support_tickets SET status=?, closed_at=?, updated_at=? WHERE id=?',
    ['closed', Date.now(), Date.now(), req.params.id]);
  await logAction(req.adminId, 'close_ticket', req.params.id, 'support_ticket');
  res.json({ ok: true });
});

r.get('/plans', requireAdmin, async (_req, res) => {
  const plans = await query('SELECT * FROM plans ORDER BY display_order');
  plans.forEach(p => { try { p.features = JSON.parse(p.features); } catch {} });
  res.json(plans);
});

r.post('/plans/:id', requireAdmin, async (req, res) => {
  const { price_inr, daily_minutes, storage_mb, features } = req.body;
  await query(
    'UPDATE plans SET price_inr=?, daily_minutes=?, storage_mb=?, features=?, updated_at=? WHERE id=?',
    [price_inr, daily_minutes, storage_mb, JSON.stringify(features), Date.now(), req.params.id]
  );
  await logAction(req.adminId, 'update_plan', req.params.id, 'plan');
  res.json({ ok: true });
});

r.get('/settings', requireAdmin, async (_req, res) => {
  const rows = await query('SELECT key_name, value FROM settings');
  const out = {};
  rows.forEach(row => { out[row.key_name] = row.value; });
  res.json(out);
});

r.post('/settings', requireAdmin, async (req, res) => {
  for (const [k, v] of Object.entries(req.body)) {
    await query(
      'INSERT INTO settings (key_name, value, updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=VALUES(updated_at)',
      [k, String(v), Date.now()]
    );
  }
  await logAction(req.adminId, 'update_settings', null, 'settings');
  res.json({ ok: true });
});

r.get('/logs', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const logs = await query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?', [limit]);
  res.json(logs);
});

export default r;
