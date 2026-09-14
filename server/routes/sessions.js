import { Router } from 'express';
import { query } from '../db.js';

const r = Router();
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

r.post('/', async (req, res) => {
  const s = req.body;
  const id = s.id || 's_' + uid();
  await query(
    `INSERT INTO sessions (id, user_id, scenario, scenario_name, level, started_at, ended_at,
      duration, turn_count, word_count, corrections, grammar_score, vocabulary_score,
      fluency_score, confidence_score, pronunciation_score)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, s.user_id, s.scenario, s.scenario_name, s.level, s.started_at, s.ended_at,
     s.duration, s.turn_count, s.word_count, s.corrections || 0,
     s.grammar_score ?? null, s.vocabulary_score ?? null, s.fluency_score ?? null,
     s.confidence_score ?? null, s.pronunciation_score ?? null]
  );
  res.json({ id });
});

r.get('/:userId', async (req, res) => {
  const rows = await query('SELECT * FROM sessions WHERE user_id=? ORDER BY started_at DESC LIMIT 100', [req.params.userId]);
  res.json(rows);
});

export default r;