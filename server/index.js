import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import usersRouter from './routes/users.js';
import sessionsRouter from './routes/sessions.js';
import paymentsRouter from './routes/payments.js';
import snapshotRouter from './routes/snapshot.js';
import supportRouter from './routes/support.js';
import plansRouter from './routes/plans.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use('/api/users', usersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/snapshot', snapshotRouter);
app.use('/api/support', supportRouter);
app.use('/api/plans', plansRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, at: Date.now() }));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`FluentAI at http://localhost:${port}`));