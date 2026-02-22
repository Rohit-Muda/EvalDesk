import { Router } from 'express';
import Team from '../models/Team.js';
import Score from '../models/Score.js';
import JuryAllocation from '../models/JuryAllocation.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/event/:eventId/allocations', requireRole('admin'), async (req, res) => {
  try {
    const list = await JuryAllocation.find({ eventId: req.params.eventId }).lean();
    res.json(list);
  } catch (err) {
    console.error('GET /allocations error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/event/:eventId/allocations', requireRole('admin'), async (req, res) => {
  try {
    const { judgeEmail, domains, maxTeams } = req.body;
    
    // P1 FIX #1: Validate judge email
    if (!judgeEmail || typeof judgeEmail !== 'string' || !judgeEmail.trim()) {
      return res.status(400).json({ error: 'Judge email is required and must be a string' });
    }

    // P0 FIX #5: Normalize judge email to lowercase
    const normalizedEmail = judgeEmail.trim().toLowerCase();
    
    // Validate email format (basic)
    if (!normalizedEmail.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate domains array
    const domainList = Array.isArray(domains) ? domains.filter(d => d && typeof d === 'string') : [];

    // Validate maxTeams
    const maxTeamsNum = Math.max(0, parseInt(maxTeams, 10) || 0);

    const allocation = await JuryAllocation.findOneAndUpdate(
      { 
        eventId: req.params.eventId, 
        judgeEmail: normalizedEmail 
      },
      { 
        $set: { 
          domains: domainList, 
          maxTeams: maxTeamsNum 
        } 
      },
      { upsert: true, new: true }
    ).lean();
    
    res.json(allocation);
  } catch (err) {
    console.error('POST /allocations error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/event/:eventId/allocations/:id', requireRole('admin'), async (req, res) => {
  try {
    const allocation = await JuryAllocation.findOneAndDelete({
      _id: req.params.id,
      eventId: req.params.eventId,
    }).lean();

    if (!allocation) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    // P1 FIX #2: When allocation is deleted, check if judge has other allocations
    // If not, downgrade to viewer
    const remainingAllocations = await JuryAllocation.findOne({
      judgeEmail: allocation.judgeEmail
    }).lean();

    if (!remainingAllocations) {
      // P1 FIX #3: Downgrade user role to viewer if no more allocations
      await User.updateOne(
        { email: allocation.judgeEmail },
        { role: 'viewer' }
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /allocations error:', err);
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
    // P0 FIX #6: Normalize jury email for lookup
    const normalizedEmail = req.userEmail.toLowerCase();

    const allocation = await JuryAllocation.findOne({
      eventId: req.params.eventId,
      judgeEmail: normalizedEmail,
    }).lean();

    // P1 FIX #4: Return empty array (not error) if not allocated
    // Frontend will show "No teams assigned" message
    if (!allocation) {
      return res.json([]);
    }

    const teams = await Team.find({ eventId: req.params.eventId }).sort({ name: 1 }).lean();
    const domainFilter = allocation.domains && allocation.domains.length > 0;
    let filtered = teams;

    if (domainFilter) {
      const domainSet = new Set(allocation.domains.map(d => d.toLowerCase()));
      filtered = teams.filter(t => domainSet.has((t.domain || '').toLowerCase()));
    }

    // Apply max teams cap
    if (allocation.maxTeams > 0) {
      filtered = filtered.slice(0, allocation.maxTeams);
    }

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
      return { 
        ...team, 
        qrToken: team.qrToken, 
        status, 
        scoreId: s ? s._id : null 
      };
    });

    res.json(result);
  } catch (err) {
    console.error('GET /my-teams error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;