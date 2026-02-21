import { Router } from 'express';
import { parse } from 'csv-parse/sync';
import Event from '../models/Event.js';
import Team, { generateQrToken } from '../models/Team.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/event/:eventId', async (req, res) => {
  try {
    const teams = await Team.find({ eventId: req.params.eventId }).sort({ name: 1 }).lean();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/event/:eventId/preview', requireRole('admin'), async (req, res) => {
  try {
    const csv = req.body.csv || req.body.data;
    if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'CSV required' });
    const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const nameCol = headers.find(h => /name|team/i.test(h)) || headers[0];
    const projectCol = headers.find(h => /project|title/i.test(h)) || headers[1] || nameCol;
    const domainCol = headers.find(h => /domain|track|category/i.test(h)) || headers[2] || '';
    const preview = rows.slice(0, 50).map(row => ({
      name: row[nameCol] || '',
      project: row[projectCol] || '',
      domain: row[domainCol] || '',
    }));
    res.json({ preview, total: rows.length });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid CSV' });
  }
});

router.post('/event/:eventId/import', requireRole('admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const csv = req.body.csv || req.body.data;
    if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'CSV required' });
    const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const nameCol = headers.find(h => /name|team/i.test(h)) || headers[0];
    const projectCol = headers.find(h => /project|title/i.test(h)) || headers[1] || nameCol;
    const domainCol = headers.find(h => /domain|track|category/i.test(h)) || headers[2] || '';
    const teams = rows.map(row => ({
      eventId: event._id,
      name: String(row[nameCol] || '').trim() || 'Unnamed',
      project: String(row[projectCol] || '').trim(),
      domain: String(row[domainCol] || '').trim(),
      qrToken: generateQrToken(),
    }));
    const inserted = await Team.insertMany(teams);
    res.status(201).json({ count: inserted.length, teams: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-token/:qrToken', async (req, res) => {
  try {
    const team = await Team.findOne({ qrToken: req.params.qrToken })
      .populate('eventId', 'name rubric')
      .lean();
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
