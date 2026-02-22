import { Router } from 'express';
import { parse } from 'csv-parse/sync';
import Event from '../models/Event.js';
import Team, { generateQrToken } from '../models/Team.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/event/:eventId', async (req, res) => {
  try {
    // P2 FIX #5j: Only return non-deleted teams
    const teams = await Team.find({ eventId: req.params.eventId, deletedAt: null })
      .sort({ name: 1 })
      .lean();
    res.json(teams);
  } catch (err) {
    console.error('GET /event/:eventId error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/event/:eventId/preview', requireRole('admin'), async (req, res) => {
  try {
    const csv = req.body.csv || req.body.data;

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

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'CSV has no valid rows' });
    }

    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const nameCol = headers.find(h => /name|team/i.test(h)) || headers[0];
    const projectCol = headers.find(h => /project|title/i.test(h)) || headers[1] || nameCol;
    const domainCol = headers.find(h => /domain|track|category/i.test(h)) || headers[2] || '';

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

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'CSV has no valid rows' });
    }

    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const nameCol = headers.find(h => /name|team/i.test(h)) || headers[0];
    const projectCol = headers.find(h => /project|title/i.test(h)) || headers[1] || nameCol;
    const domainCol = headers.find(h => /domain|track|category/i.test(h)) || headers[2] || '';

    const teams = rows
      .filter(row => row && (row[nameCol] || '').trim())
      .map(row => ({
        eventId: event._id,
        name: String(row[nameCol] || '').trim() || 'Unnamed',
        project: String(row[projectCol] || '').trim(),
        domain: String(row[domainCol] || '').trim(),
        qrToken: generateQrToken(),
        deletedAt: null,
      }));

    if (teams.length === 0) {
      return res.status(400).json({ error: 'No valid teams to import (all rows have empty names)' });
    }

    const inserted = await Team.insertMany(teams);
    console.log(`[AUDIT] Teams imported - Event: ${event.name}, Count: ${inserted.length}`);
    res.status(201).json({ count: inserted.length, teams: inserted });
  } catch (err) {
    console.error('POST /import error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-token/:qrToken', async (req, res) => {
  try {
    // P2 FIX #5k: Check soft-delete
    const team = await Team.findOne({ qrToken: req.params.qrToken, deletedAt: null })
      .populate('eventId', 'name rubric')
      .lean();
    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json(team);
  } catch (err) {
    console.error('GET /by-token/:qrToken error:', err);
    res.status(500).json({ error: err.message });
  }
});

// P2 FIX #5l: NEW endpoint to soft-delete a team
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const team = await Team.findOne({ _id: req.params.id, deletedAt: null });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    await Team.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
      deletedBy: req.userId
    });

    console.log(`[AUDIT] Team soft-deleted - ID: ${req.params.id}, Name: ${team.name}`);
    res.json({ ok: true, message: 'Team deleted successfully' });
  } catch (err) {
    console.error('DELETE /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// P2 FIX #5m: NEW endpoint to restore a team
router.post('/:id/restore', requireRole('admin'), async (req, res) => {
  try {
    const team = await Team.findOneAndUpdate(
      { _id: req.params.id, deletedAt: { $ne: null } },
      { 
        deletedAt: null,
        deletedBy: null
      },
      { new: true }
    );

    if (!team) return res.status(404).json({ error: 'Team not found or not deleted' });

    console.log(`[AUDIT] Team restored - ID: ${req.params.id}, Name: ${team.name}`);
    res.json(team);
  } catch (err) {
    console.error('POST /:id/restore error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;