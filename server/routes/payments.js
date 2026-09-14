import { Router } from 'express';
import crypto from 'node:crypto';
import 'dotenv/config';
import { query } from '../db.js';

const r = Router();
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

r.post('/create-subscription', async (req, res) => {
  try {
    const { user_id, plan_id = 'pro' } = req.body;
    const planId = plan_id === 'pro_plus' ? process.env.RAZORPAY_PLAN_PRO_PLUS_ID : process.env.RAZORPAY_PLAN_PRO_ID;
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body: JSON.stringify({ plan_id: planId, total_count: 120, quantity: 1, customer_notify: 1, notes: { user_id, plan_id } })
    });
    if (!rzpRes.ok) throw new Error(await rzpRes.text());
    const data = await rzpRes.json();
    await query('UPDATE users SET razorpay_customer_id=?, razorpay_sub_id=? WHERE id=?', [data.customer_id || data.id, data.id, user_id]);
    res.json({ subscription_id: data.id, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (e) { console.error(e); res.status(500).json({ error: 'could not create subscription' }); }
});

r.post('/webhook', async (req, res) => {
  try {
    const raw = req.body;
    const sig = req.headers['x-razorpay-signature'];
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
    if (sig !== expected) return res.status(400).json({ error: 'bad signature' });

    const event = JSON.parse(raw.toString());
    const eventId = event.event_id || uid();
    const type = event.event;
    const existing = await query('SELECT event_id FROM webhook_events WHERE event_id=?', [eventId]);
    if (existing.length) return res.json({ ok: true, skipped: true });

    await query('INSERT INTO webhook_events (event_id, event_type, payload, processed, received_at) VALUES (?,?,?,?,?)',
      [eventId, type, JSON.stringify(event), 0, Date.now()]);

    if (type === 'subscription.activated' || type === 'subscription.charged') {
      const sub = event.payload.subscription.entity;
      const userId = sub.notes?.user_id;
      const planId = sub.notes?.plan_id || 'pro';
      const payment = event.payload.payment?.entity;
      const expiresAt = Date.now() + 30 * 86400000;
      if (userId) {
        await query('UPDATE users SET plan=?, plan_expires_at=?, plan_started_at=COALESCE(plan_started_at, ?) WHERE id=?',
          [planId, expiresAt, Date.now(), userId]);
        if (payment) {
          await query(
            `INSERT INTO payments (id, user_id, plan_id, razorpay_payment_id, razorpay_order_id, razorpay_sub_id, amount, currency, status, method, created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            ['p_' + uid(), userId, planId, payment.id, payment.order_id || null, sub.id,
             payment.amount, payment.currency, 'captured', payment.method || null, Date.now()]
          );
        }
      }
    }
    if (type === 'subscription.cancelled' || type === 'subscription.halted') {
      const sub = event.payload.subscription.entity;
      const userId = sub.notes?.user_id;
      if (userId) {
        // Plan stays until plan_expires_at
      }
    }
    await query('UPDATE webhook_events SET processed=1 WHERE event_id=?', [eventId]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

r.post('/cancel', async (req, res) => {
  try {
    const { user_id } = req.body;
    const [user] = await query('SELECT razorpay_sub_id FROM users WHERE id=?', [user_id]);
    if (!user?.razorpay_sub_id) return res.status(400).json({ error: 'no subscription' });
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const rzpRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${user.razorpay_sub_id}/cancel`, {
      method: 'POST', headers: { Authorization: `Basic ${auth}` }
    });
    if (!rzpRes.ok) throw new Error('cancel failed');
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'could not cancel' }); }
});

export default r;