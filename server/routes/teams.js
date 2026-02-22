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
    console.error('GET /event/:eventId error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/event/:eventId/preview', requireRole('admin'), async (req, res) => {
  try {
    const csv = req.body.csv || req.body.data;

    // P1 FIX #5: Validate CSV input
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'CSV data is required and must be a string' });
    }

    if (csv.trim().length === 0) {
      return res.status(400).json({ error: 'CSV cannot be empty' });
    }

    let rows = [];
    try {
      rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    } catch (parseErr) {
      return res.status(400).json({ error: 'Invalid CSV format: ' + parseErr.message });
    }

    // P1 FIX #6: Validate rows exist
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'CSV has no valid rows' });
    }

    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const nameCol = headers.find(h => /name|team/i.test(h)) || headers[0];
    const projectCol = headers.find(h => /project|title/i.test(h)) || headers[1] || nameCol;
    const domainCol = headers.find(h => /domain|track|category/i.test(h)) || headers[2] || '';

    // Filter out empty rows
    const preview = rows
      .filter(row => row && (row[nameCol] || '').trim())
      .slice(0, 50)
      .map(row => ({
        name: (row[nameCol] || '').trim() || 'Unnamed',
        project: (row[projectCol] || '').trim(),
        domain: (row[domainCol] || '').trim(),
      }));

    res.json({ preview, total: rows.length });
  } catch (err) {
    console.error('POST /preview error:', err);
    res.status(400).json({ error: err.message || 'Invalid CSV' });
  }
});

router.post('/event/:eventId/import', requireRole('admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const csv = req.body.csv || req.body.data;

    // P1 FIX #7: Validate CSV input
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'CSV data is required and must be a string' });
    }

    if (csv.trim().length === 0) {
      return res.status(400).json({ error: 'CSV cannot be empty' });
    }

    let rows = [];
    try {
      rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
    } catch (parseErr) {
      return res.status(400).json({ error: 'Invalid CSV format: ' + parseErr.message });
    }

    // P1 FIX #8: Validate rows exist
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'CSV has no valid rows' });
    }

    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const nameCol = headers.find(h => /name|team/i.test(h)) || headers[0];
    const projectCol = headers.find(h => /project|title/i.test(h)) || headers[1] || nameCol;
    const domainCol = headers.find(h => /domain|track|category/i.test(h)) || headers[2] || '';

    // P1 FIX #9: Filter empty rows, validate names
    const teams = rows
      .filter(row => row && (row[nameCol] || '').trim())
      .map(row => ({
        eventId: event._id,
        name: String(row[nameCol] || '').trim() || 'Unnamed',
        project: String(row[projectCol] || '').trim(),
        domain: String(row[domainCol] || '').trim(),
        qrToken: generateQrToken(),
      }));

    if (teams.length === 0) {
      return res.status(400).json({ error: 'No valid teams to import (all rows have empty names)' });
    }

    const inserted = await Team.insertMany(teams);
    res.status(201).json({ count: inserted.length, teams: inserted });
  } catch (err) {
    console.error('POST /import error:', err);
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
    console.error('GET /by-token/:qrToken error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;