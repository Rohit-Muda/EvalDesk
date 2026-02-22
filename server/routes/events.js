import { Router } from 'express';
import Event from '../models/Event.js';
import Team from '../models/Team.js';
import Score from '../models/Score.js';
import JuryAllocation from '../models/JuryAllocation.js';
import { verifyToken, requireRole, attachUser } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);
router.use(attachUser);

router.get('/', async (req, res) => {
  try {
    // P2 FIX #5e: Only return non-deleted events
    const list = await Event.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .select('name allowedDomains rubric createdAt')
      .lean();
    res.json(list);
  } catch (err) {
    console.error('GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    // P2 FIX #5f: Check soft-delete
    const event = await Event.findOne({ _id: req.params.id, deletedAt: null }).lean();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    console.error('GET /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

const defaultRubric = [
  { name: 'Innovation', weight: 25, maxScore: 10 },
  { name: 'Execution', weight: 25, maxScore: 10 },
  { name: 'Presentation', weight: 25, maxScore: 10 },
  { name: 'Impact', weight: 25, maxScore: 10 },
];

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, allowedDomains, rubric } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    const validDomains = Array.isArray(allowedDomains)
      ? allowedDomains.filter(d => d && typeof d === 'string')
      : [];

    let validRubric = defaultRubric;
    if (rubric && Array.isArray(rubric) && rubric.length === 4) {
      const isValidRubric = rubric.every(c =>
        c && typeof c === 'object' &&
        c.name && typeof c.name === 'string' &&
        typeof c.weight === 'number' && c.weight >= 0 &&
        typeof c.maxScore === 'number' && c.maxScore > 0
      );
      if (isValidRubric) {
        validRubric = rubric;
      }
    }

    const event = await Event.create({
      name: name.trim(),
      allowedDomains: validDomains,
      rubric: validRubric,
      createdBy: req.userId,
      deletedAt: null,
    });

    console.log(`[AUDIT] Event created - Name: ${event.name}, ID: ${event._id}`);
    res.status(201).json(event);
  } catch (err) {
    console.error('POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    // P2 FIX #5g: Check soft-delete before update
    const event = await Event.findOne({ _id: req.params.id, deletedAt: null });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { name, allowedDomains, rubric } = req.body;
    const update = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Event name must be a non-empty string' });
      }
      update.name = name.trim();
    }

    if (allowedDomains !== undefined) {
      if (Array.isArray(allowedDomains)) {
        update.allowedDomains = allowedDomains.filter(d => d && typeof d === 'string');
      }
    }

    if (rubric !== undefined) {
      if (Array.isArray(rubric) && rubric.length === 4) {
        const isValidRubric = rubric.every(c =>
          c && typeof c === 'object' &&
          c.name && typeof c.name === 'string' &&
          typeof c.weight === 'number' && c.weight >= 0 &&
          typeof c.maxScore === 'number' && c.maxScore > 0
        );
        if (isValidRubric) {
          update.rubric = rubric;
        }
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    console.log(`[AUDIT] Event updated - ID: ${req.params.id}, Changes: ${JSON.stringify(update)}`);
    res.json(updatedEvent);
  } catch (err) {
    console.error('PATCH /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    // P2 FIX #5h: Soft-delete instead of hard-delete
    const event = await Event.findOne({ _id: req.params.id, deletedAt: null });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Mark as deleted instead of removing
    await Event.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
      deletedBy: req.userId
    });

    // Also soft-delete all related teams
    await Team.updateMany(
      { eventId: req.params.id, deletedAt: null },
      { 
        deletedAt: new Date(),
        deletedBy: req.userId
      }
    );

    console.log(`[AUDIT] Event soft-deleted - ID: ${req.params.id}, By: ${req.userEmail}`);
    res.json({ ok: true, message: 'Event deleted successfully' });
  } catch (err) {
    console.error('DELETE /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// P2 FIX #5i: NEW endpoint to restore deleted event (admin only)
router.post('/:id/restore', requireRole('admin'), async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, deletedAt: { $ne: null } },
      { 
        deletedAt: null,
        deletedBy: null
      },
      { new: true }
    );

    if (!event) return res.status(404).json({ error: 'Event not found or not deleted' });

    // Also restore all soft-deleted teams
    await Team.updateMany(
      { eventId: req.params.id, deletedAt: { $ne: null } },
      { 
        deletedAt: null,
        deletedBy: null
      }
    );

    console.log(`[AUDIT] Event restored - ID: ${req.params.id}, By: ${req.userEmail}`);
    res.json(event);
  } catch (err) {
    console.error('POST /:id/restore error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;