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
    
    // Validate judge email
    if (!judgeEmail || typeof judgeEmail !== 'string' || !judgeEmail.trim()) {
      return res.status(400).json({ error: 'Judge email is required and must be a string' });
    }

    const normalizedEmail = judgeEmail.trim().toLowerCase();
    
    // Validate email format
    if (!normalizedEmail.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate domains array
    const domainList = Array.isArray(domains) ? domains.filter(d => d && typeof d === 'string') : [];

    // Validate maxTeams
    const maxTeamsNum = Math.max(0, parseInt(maxTeams, 10) || 0);

    // P2 FIX #1a: Check for overlapping team assignments
    const existingAllocations = await JuryAllocation.find({
      eventId: req.params.eventId
    }).lean();

    // Get all teams for this event
    const allTeams = await Team.find({ eventId: req.params.eventId }).lean();

    // Calculate teams this judge would see
    let teamsThisJudge = allTeams;
    if (domainList.length > 0) {
      const domainSet = new Set(domainList.map(d => d.toLowerCase()));
      teamsThisJudge = allTeams.filter(t => domainSet.has((t.domain || '').toLowerCase()));
    }
    if (maxTeamsNum > 0) {
      teamsThisJudge = teamsThisJudge.slice(0, maxTeamsNum);
    }

    // Check for overlaps with other judges
    const overlaps = [];
    for (const otherAlloc of existingAllocations) {
      if (otherAlloc.judgeEmail === normalizedEmail) continue; // Skip self

      let otherTeams = allTeams;
      if (otherAlloc.domains && otherAlloc.domains.length > 0) {
        const otherDomainSet = new Set(otherAlloc.domains.map(d => d.toLowerCase()));
        otherTeams = allTeams.filter(t => otherDomainSet.has((t.domain || '').toLowerCase()));
      }
      if (otherAlloc.maxTeams > 0) {
        otherTeams = otherTeams.slice(0, otherAlloc.maxTeams);
      }

      // Find common teams
      const commonTeams = teamsThisJudge.filter(t1 => 
        otherTeams.some(t2 => t2._id.toString() === t1._id.toString())
      );

      if (commonTeams.length > 0) {
        overlaps.push({
          judge: otherAlloc.judgeEmail,
          commonTeams: commonTeams.length,
          teamNames: commonTeams.map(t => t.name)
        });
      }
    }

    // P2 FIX #1b: Warn about overlaps but allow (judges can score same team from different perspectives)
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
    
    console.log(`[AUDIT] Jury allocated - Email: ${normalizedEmail}, Domains: ${domainList || 'all'}, MaxTeams: ${maxTeamsNum}`);

    res.json({
      allocation,
      warnings: overlaps.length > 0 ? {
        message: 'This judge shares team assignments with other judges',
        overlaps
      } : null
    });
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

    // Check if judge has other allocations
    const remainingAllocations = await JuryAllocation.findOne({
      judgeEmail: allocation.judgeEmail
    }).lean();

    if (!remainingAllocations) {
      // Downgrade user role to viewer if no more allocations
      await User.updateOne(
        { email: allocation.judgeEmail },
        { role: 'viewer' }
      );
      console.log(`[AUDIT] Judge ${allocation.judgeEmail} role downgraded to viewer (no allocations)`);
    }

    console.log(`[AUDIT] Jury allocation deleted - Email: ${allocation.judgeEmail}`);
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
    const normalizedEmail = req.userEmail.toLowerCase();

    const allocation = await JuryAllocation.findOne({
      eventId: req.params.eventId,
      judgeEmail: normalizedEmail,
    }).lean();

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