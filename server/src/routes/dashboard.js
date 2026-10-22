import { Router } from 'express';
import { ah } from '../middleware/errors.js';
import { allow } from '../middleware/auth.js';
import { dashboard, counts, weeklyReport } from '../services/stats.js';

const r = Router();
r.use(allow('owner', 'full'));

r.get('/dashboard', ah(async (req, res) => res.json(await dashboard(req.business._id))));
r.get('/counts', ah(async (req, res) => res.json(await counts(req.business._id))));
r.get('/report', ah(async (req, res) => {
  const offset = Math.max(0, Math.min(52, parseInt(req.query.offset, 10) || 0));
  res.json(await weeklyReport(req.business._id, offset));
}));

export default r;
