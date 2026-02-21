import { Router } from 'express';
import Team from '../models/Team.js';
import Score from '../models/Score.js';
import JuryAllocation from '../models/JuryAllocation.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/event/:eventId/allocations', requireRole('admin'), async (req, res) => {
  try {
    const list = await JuryAllocation.find({ eventId: req.params.eventId }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/event/:eventId/allocations', requireRole('admin'), async (req, res) => {
  try {
    const { judgeEmail, domains, maxTeams } = req.body;
    const allocation = await JuryAllocation.findOneAndUpdate(
      { eventId: req.params.eventId, judgeEmail: (judgeEmail || '').trim() },
      { $set: { domains: Array.isArray(domains) ? domains : [], maxTeams: Number(maxTeams) || 0 } },
      { upsert: true, new: true }
    ).lean();
    res.json(allocation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/event/:eventId/allocations/:id', requireRole('admin'), async (req, res) => {
  try {
    await JuryAllocation.findOneAndDelete({
      _id: req.params.id,
      eventId: req.params.eventId,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function canJudgeAccess(judgeEmail, teamDomain, allocation) {
  if (!allocation) return false;
  if (!allocation.domains || allocation.domains.length === 0) return true;
  return allocation.domains.some(d => d.toLowerCase() === (teamDomain || '').toLowerCase());
}

router.get('/event/:eventId/my-teams', async (req, res) => {
  try {
    const allocation = await JuryAllocation.findOne({
      eventId: req.params.eventId,
      judgeEmail: req.userEmail,
    }).lean();

    if (!allocation) return res.json([]);

    const teams = await Team.find({ eventId: req.params.eventId }).sort({ name: 1 }).lean();
    const domainFilter = allocation.domains && allocation.domains.length > 0;
    let filtered = teams;
    if (domainFilter) {
      const domainSet = new Set(allocation.domains.map(d => d.toLowerCase()));
      filtered = teams.filter(t => domainSet.has((t.domain || '').toLowerCase()));
    }
    if (allocation.maxTeams > 0) filtered = filtered.slice(0, allocation.maxTeams);

    const teamIds = filtered.map(t => t._id);
    const scores = await Score.find({
      eventId: req.params.eventId,
      teamId: { $in: teamIds },
      judgeId: req.userId,
    }).lean();

    const scoreMap = new Map(scores.map(s => [s.teamId.toString(), s]));

    const result = filtered.map(team => {
      const s = scoreMap.get(team._id.toString());
      let status = 'pending';
      if (s) {
        if (s.absent) status = 'absent';
        else if (s.locked) status = 'evaluated';
      }
      return { ...team, qrToken: team.qrToken, status, scoreId: s ? s._id : null };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
