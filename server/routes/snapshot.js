import { Router } from 'express';
import { query } from '../db.js';

const r = Router();

r.post('/:userId', async (req, res) => {
  const { nancy_role, session_count, streak_days, total_minutes, last_topic, payload } = req.body;
  const now = Date.now();
  await query(
    `INSERT INTO snapshots (user_id, nancy_role, session_count, streak_days, total_minutes, last_topic, payload, updated_at)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       nancy_role=COALESCE(VALUES(nancy_role), nancy_role),
       session_count=VALUES(session_count),
       streak_days=VALUES(streak_days),
       total_minutes=VALUES(total_minutes),
       last_topic=VALUES(last_topic),
       payload=VALUES(payload),
       updated_at=VALUES(updated_at)`,
    [req.params.userId, nancy_role || null, session_count || 0, streak_days || 0,
     total_minutes || 0, last_topic || null, JSON.stringify(payload || {}), now]
  );
  res.json({ ok: true });
});

r.get('/:userId', async (req, res) => {
  const rows = await query('SELECT * FROM snapshots WHERE user_id=?', [req.params.userId]);
  if (!rows.length) return res.json(null);
  const row = rows[0];
  res.json({
    nancy_role: row.nancy_role,
    session_count: row.session_count,
    streak_days: row.streak_days,
    total_minutes: row.total_minutes,
    last_topic: row.last_topic,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    updated_at: Number(row.updated_at)
  });
});

export default r;