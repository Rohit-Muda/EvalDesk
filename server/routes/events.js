import { Router } from 'express';
import Event from '../models/Event.js';
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
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
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
    const event = await Event.create({
      name: name || 'New Event',
      allowedDomains: Array.isArray(allowedDomains) ? allowedDomains : [],
      rubric: (rubric && rubric.length === 4) ? rubric : defaultRubric,
      createdBy: req.userId,
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { name, allowedDomains, rubric } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (Array.isArray(allowedDomains)) update.allowedDomains = allowedDomains;
    if (rubric && rubric.length === 4) update.rubric = rubric;
    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
