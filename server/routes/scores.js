import { Router } from 'express';
import Team from '../models/Team.js';
import Score from '../models/Score.js';
import JuryAllocation from '../models/JuryAllocation.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

function canJudgeAccess(judgeEmail, teamDomain, allocation) {
  if (!allocation) return false;
  if (!allocation.domains || allocation.domains.length === 0) return true;
  return allocation.domains.some(d => d.toLowerCase() === (teamDomain || '').toLowerCase());
}

router.get('/team/:qrToken', async (req, res) => {
  try {
    const team = await Team.findOne({ qrToken: req.params.qrToken }).populate('eventId').lean();
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const allocation = await JuryAllocation.findOne({
      eventId: team.eventId._id,
      judgeEmail: req.userEmail,
    }).lean();
    if (!canJudgeAccess(req.userEmail, team.domain, allocation)) {
      return res.status(403).json({ error: 'You are not assigned to evaluate this team' });
    }
    const score = await Score.findOne({
      eventId: team.eventId._id,
      teamId: team._id,
      judgeId: req.userId,
    }).lean();
    res.json({
      team: {
        _id: team._id,
        name: team.name,
        project: team.project,
        domain: team.domain,
        eventId: team.eventId._id,
        rubric: team.eventId.rubric,
      },
      score: score || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/team/:qrToken', async (req, res) => {
  try {
    const team = await Team.findOne({ qrToken: req.params.qrToken }).populate('eventId').lean();
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const allocation = await JuryAllocation.findOne({
      eventId: team.eventId._id,
      judgeEmail: req.userEmail,
    }).lean();
    if (!canJudgeAccess(req.userEmail, team.domain, allocation)) {
      return res.status(403).json({ error: 'You are not assigned to evaluate this team' });
    }
    let score = await Score.findOne({
      eventId: team.eventId._id,
      teamId: team._id,
      judgeId: req.userId,
    });
    if (score && score.locked) return res.status(400).json({ error: 'Score already submitted and locked' });

    const { criteriaScores, absent } = req.body;
    const rubric = team.eventId.rubric || [];
    const scores = Array.isArray(criteriaScores)
      ? criteriaScores.slice(0, rubric.length).map((v, i) => Math.min(Math.max(Number(v) || 0, 0), (rubric[i] && rubric[i].maxScore) ? rubric[i].maxScore : 10))
      : [];

    const logEntry = {
      action: 'submit',
      userId: req.userId,
      timestamp: new Date(),
      details: { criteriaScores: scores, absent: !!absent },
    };

    if (!score) {
      score = await Score.create({
        eventId: team.eventId._id,
        teamId: team._id,
        judgeId: req.userId,
        criteriaScores: scores,
        absent: !!absent,
        submittedAt: new Date(),
        locked: true,
        logs: [logEntry],
      });
    } else {
      score.criteriaScores = scores;
      score.absent = !!absent;
      score.submittedAt = new Date();
      score.locked = true;
      score.logs = score.logs || [];
      score.logs.push(logEntry);
      await score.save();
    }
    res.json(score);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/team/:qrToken', async (req, res) => {
  try {
    const team = await Team.findOne({ qrToken: req.params.qrToken }).populate('eventId').lean();
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const allocation = await JuryAllocation.findOne({
      eventId: team.eventId._id,
      judgeEmail: req.userEmail,
    }).lean();
    if (!canJudgeAccess(req.userEmail, team.domain, allocation)) {
      return res.status(403).json({ error: 'Not assigned to this team' });
    }
    let score = await Score.findOne({
      eventId: team.eventId._id,
      teamId: team._id,
      judgeId: req.userId,
    });
    if (score && score.locked) return res.status(400).json({ error: 'Score is locked' });

    const { criteriaScores, absent } = req.body;
    const rubric = team.eventId.rubric || [];

    if (criteriaScores && Array.isArray(criteriaScores)) {
      score = score || await Score.create({
        eventId: team.eventId._id,
        teamId: team._id,
        judgeId: req.userId,
        criteriaScores: [],
        absent: false,
        logs: [],
      });
      score.criteriaScores = criteriaScores.slice(0, rubric.length).map((v, i) => {
        const max = (rubric[i] && rubric[i].maxScore) ? rubric[i].maxScore : 10;
        return Math.min(Math.max(Number(v) || 0, 0), max);
      });
      score.logs = score.logs || [];
      score.logs.push({ action: 'update', userId: req.userId, timestamp: new Date(), details: {} });
    }
    if (typeof absent === 'boolean') {
      score = score || await Score.findOne({
        eventId: team.eventId._id,
        teamId: team._id,
        judgeId: req.userId,
      });
      if (score && !score.locked) {
        score.absent = absent;
        score.logs = score.logs || [];
        score.logs.push({ action: 'absent_toggle', userId: req.userId, timestamp: new Date(), details: { absent } });
        await score.save();
      }
    }
    if (score) await score.save();
    res.json(score || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
