import { Router } from 'express';
import Event from '../models/Event.js';
import Team from '../models/Team.js';
import Score from '../models/Score.js';
import JuryAllocation from '../models/JuryAllocation.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/event/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const teams = await Team.find({ eventId }).lean();
    const teamIds = teams.map(t => t._id);
    const scores = await Score.find({ eventId, teamId: { $in: teamIds } }).lean();

    const total = teams.length;
    let evaluated = 0;
    let absent = 0;
    const byJudge = new Map();
    const byDomain = new Map();

    for (const team of teams) {
      const domain = team.domain || '(no domain)';
      if (!byDomain.has(domain)) {
        byDomain.set(domain, { total: 0, evaluated: 0, absent: 0 });
      }
      const d = byDomain.get(domain);
      d.total += 1;

      const teamScores = scores.filter(s => s.teamId.toString() === team._id.toString());
      const submitted = teamScores.find(s => s.locked);
      if (submitted) {
        if (submitted.absent) absent += 1;
        else evaluated += 1;
        d.absent += submitted.absent ? 1 : 0;
        d.evaluated += submitted.absent ? 0 : 1;
        for (const s of teamScores) {
          const email = s.judgeId?.toString();
          if (email) {
            if (!byJudge.has(email)) byJudge.set(email, { total: 0, done: 0 });
            const j = byJudge.get(email);
            j.total += 1;
            if (s.locked) j.done += 1;
          }
        }
      }
    }

    const judgeIds = [...new Set(scores.map(s => s.judgeId?.toString()).filter(Boolean))];
    const users = await User.find({ _id: { $in: judgeIds } }).select('email name').lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const perJudge = judgeIds.map(id => {
      const j = byJudge.get(id) || { total: 0, done: 0 };
      const u = userMap.get(id);
      return {
        judgeId: id,
        email: u?.email,
        name: u?.name,
        total: j.total,
        done: j.done,
        percent: j.total ? Math.round((j.done / j.total) * 100) : 0,
      };
    });

    const domainProgress = [...byDomain.entries()].map(([name, d]) => ({
      domain: name,
      total: d.total,
      evaluated: d.evaluated,
      absent: d.absent,
      pending: d.total - d.evaluated - d.absent,
      percent: d.total ? Math.round(((d.evaluated + d.absent) / d.total) * 100) : 0,
    }));

    res.json({
      total,
      evaluated,
      absent,
      pending: total - evaluated - absent,
      perJudge,
      domainProgress,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/event/:eventId/export', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId).lean();
    const rubricCriteria = event?.rubric || [];
    const teams = await Team.find({ eventId }).sort({ name: 1 }).lean();
    const teamIds = teams.map(t => t._id);
    const scores = await Score.find({ eventId, teamId: { $in: teamIds } })
      .populate('judgeId', 'email name')
      .lean();

    const header = ['Team', 'Project', 'Domain', 'Judge', 'Absent', 'SubmittedAt'];
    rubricCriteria?.forEach((c, i) => header.push(`Criterion ${i + 1} (${c.name})`));
    header.push('Weighted Total');

    const rows = [header.join(',')];

    for (const team of teams) {
      const teamScores = scores.filter(s => s.teamId.toString() === team._id.toString());
      for (const s of teamScores) {
        const judge = s.judgeId;
        const judgeEmail = judge?.email || '';
        const judgeName = judge?.name || '';
        const absent = s.absent ? 'Yes' : 'No';
        const submittedAt = s.submittedAt ? new Date(s.submittedAt).toISOString() : '';
        const crit = (s.criteriaScores || []).slice(0, rubricCriteria?.length || 0);
        const weights = (rubricCriteria || []).map(c => (c.weight || 0) / 100);
        const maxScores = (rubricCriteria || []).map(c => c.maxScore || 10);
        let weighted = 0;
        if (weights.length && !s.absent) {
          weighted = crit.reduce((sum, v, i) => sum + (Number(v) || 0) / (maxScores[i] || 1) * (weights[i] || 0), 0);
          weighted = Math.round(weighted * 100) / 100;
        }
        const cells = [
          `"${(team.name || '').replace(/"/g, '""')}"`,
          `"${(team.project || '').replace(/"/g, '""')}"`,
          `"${(team.domain || '').replace(/"/g, '""')}"`,
          `"${judgeEmail}"`,
          absent,
          submittedAt,
          ...crit.map(v => String(v)),
          String(weighted),
        ];
        rows.push(cells.join(','));
      }
    }

    const csv = rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=evaldesk-export-${eventId}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
