import { Router } from 'express';
import passport from '../config/passport.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import JuryAllocation from '../models/JuryAllocation.js';
import { signToken, verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/google', (req, res, next) => {
  const eventId = req.query.eventId;
  const state = eventId ? Buffer.from(JSON.stringify({ eventId })).toString('base64') : undefined;
  passport.authenticate('google', { state })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', async (err, user, info) => {
    if (err) return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    if (!user) return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);

    let state = {};
    try {
      if (req.query.state) state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
    } catch {}

    const eventId = state.eventId;
    const allowedDomains = eventId
      ? (await Event.findById(eventId).select('allowedDomains').lean())?.allowedDomains || []
      : [];

    const domain = user.email.split('@')[1]?.toLowerCase();
    if (allowedDomains.length > 0 && (!domain || !allowedDomains.includes(domain))) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=domain_not_allowed`);
    }

    // FIX #1: Use lowercase for admin email comparison
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    
    if (adminEmails.includes(user.email.toLowerCase())) {
      // FIX #2: Ensure admin role is set
      await User.updateOne({ _id: user._id }, { role: 'admin' });
      user.role = 'admin';
    } else {
      // FIX #3: Use lowercase for jury email comparison
      const allocation = eventId
        ? await JuryAllocation.findOne({ 
            eventId, 
            judgeEmail: user.email.toLowerCase() 
          }).lean()
        : null;
      
      if (allocation) {
        // FIX #4: Set jury role if allocated
        await User.updateOne({ _id: user._id }, { role: 'jury' });
        user.role = 'jury';
      } else {
        // FIX #5: Explicitly set viewer role if not admin or jury
        await User.updateOne({ _id: user._id }, { role: 'viewer' });
        user.role = 'viewer';
      }
    }

    const token = signToken(user);
    const redirect = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
    res.redirect(`${redirect}/?token=${token}`);
  })(req, res, next);
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('email name role').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (_, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

export default router;