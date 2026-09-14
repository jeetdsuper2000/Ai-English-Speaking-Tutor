import { Router } from 'express';
import { query } from '../db.js';

const r = Router();
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

r.post('/', async (req, res) => {
  try {
    const { id, name, level, tutor_id, profession, nancy_role } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const now = Date.now();

    if (id) {
      const rows = await query('SELECT id, created_at FROM users WHERE id=?', [id]);
      if (rows.length) {
        await query(
          'UPDATE users SET name=?, level=?, profession=?, nancy_role=?, last_seen_at=? WHERE id=?',
          [name, level || 'Intermediate', profession || null, nancy_role || null, now, id]
        );
        const [full] = await query('SELECT id, name, level, profession, nancy_role, plan, is_admin, created_at, last_seen_at FROM users WHERE id=?', [id]);
        return res.json(full);
      }
    }
    const newId = id || 'u_' + uid();
    await query(
      'INSERT INTO users (id, name, level, profession, nancy_role, plan, created_at, last_seen_at) VALUES (?,?,?,?,?,?,?,?)',
      [newId, name, level || 'Intermediate', profession || null, nancy_role || null, 'free', now, now]
    );
    await query('INSERT INTO snapshots (user_id, payload, updated_at) VALUES (?,?,?)',
      [newId, JSON.stringify({}), now]);
    res.json({ id: newId, name, level: level || 'Intermediate', profession, nancy_role, plan: 'free', created_at: now, last_seen_at: now });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

r.get('/:id', async (req, res) => {
  const rows = await query('SELECT id, name, level, profession, nancy_role, plan, plan_expires_at, is_admin, is_banned, created_at, last_seen_at FROM users WHERE id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  res.json(rows[0]);
});

r.post('/role', async (req, res) => {
  const { user_id, role, profession } = req.body;
  await query('UPDATE users SET nancy_role=?, profession=?, role_locked_at=? WHERE id=?',
    [role, profession, Date.now(), user_id]);
  res.json({ ok: true });
});

r.get('/role/:userId', async (req, res) => {
  const rows = await query('SELECT nancy_role, profession FROM users WHERE id=?', [req.params.userId]);
  if (!rows.length) return res.json({ role: null });
  res.json({ role: rows[0].nancy_role, profession: rows[0].profession });
});

export default r;