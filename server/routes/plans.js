import { Router } from 'express';
import { query } from '../db.js';

const r = Router();

r.get('/', async (_req, res) => {
  const plans = await query('SELECT * FROM plans WHERE is_active=1 ORDER BY display_order');
  plans.forEach(p => { try { p.features = JSON.parse(p.features); } catch {} });
  res.json(plans);
});

export default r;