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
    const list = await Event.find()
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
    const event = await Event.findById(req.params.id).lean();
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

    // P2 FIX #1: Validate event name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    // P2 FIX #2: Validate domains array
    const validDomains = Array.isArray(allowedDomains)
      ? allowedDomains.filter(d => d && typeof d === 'string')
      : [];

    // P2 FIX #3: Validate rubric
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
    });

    res.status(201).json(event);
  } catch (err) {
    console.error('POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
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

    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!event) return res.status(404).json({ error: 'Event not found' });

    res.json(event);
  } catch (err) {
    console.error('PATCH /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // P0 FIX #14: Cascade delete related data
    // This prevents orphaned records and ensures data integrity
    await Promise.all([
      Team.deleteMany({ eventId: req.params.id }),
      Score.deleteMany({ eventId: req.params.id }),
      JuryAllocation.deleteMany({ eventId: req.params.id }),
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;