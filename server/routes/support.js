import { Router } from 'express';
import { query } from '../db.js';

const r = Router();
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// User — create ticket
r.post('/', async (req, res) => {
  const { user_id, subject, category = 'general', body, priority = 'normal' } = req.body;
  if (!user_id || !subject || !body) return res.status(400).json({ error: 'missing fields' });
  const id = 't_' + uid();
  const now = Date.now();
  await query(
    'INSERT INTO support_tickets (id, user_id, subject, category, priority, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, user_id, subject, category, priority, 'open', now, now]
  );
  await query(
    'INSERT INTO support_messages (id, ticket_id, sender, sender_id, body, created_at) VALUES (?,?,?,?,?,?)',
    ['m_' + uid(), id, 'user', user_id, body, now]
  );
  res.json({ id });
});

// User — list own tickets
r.get('/user/:userId', async (req, res) => {
  const tickets = await query('SELECT * FROM support_tickets WHERE user_id=? ORDER BY created_at DESC', [req.params.userId]);
  res.json(tickets);
});

// User — get ticket + messages
r.get('/:id', async (req, res) => {
  const [ticket] = await query('SELECT * FROM support_tickets WHERE id=?', [req.params.id]);
  if (!ticket) return res.status(404).json({ error: 'not found' });
  const messages = await query('SELECT * FROM support_messages WHERE ticket_id=? ORDER BY created_at', [req.params.id]);
  res.json({ ...ticket, messages });
});

// User — reply
r.post('/:id/reply', async (req, res) => {
  const { user_id, body } = req.body;
  await query(
    'INSERT INTO support_messages (id, ticket_id, sender, sender_id, body, created_at) VALUES (?,?,?,?,?,?)',
    ['m_' + uid(), req.params.id, 'user', user_id, body, Date.now()]
  );
  await query('UPDATE support_tickets SET status=?, updated_at=? WHERE id=?', ['open', Date.now(), req.params.id]);
  res.json({ ok: true });
});

export default r;