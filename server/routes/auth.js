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
    if (err) {
      console.error('Google auth error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
    if (!user) return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);

    let state = {};
    try {
      if (req.query.state) state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
    } catch (e) {
      console.error('State decode error:', e);
    }

    const eventId = state.eventId;

    // FIX: Normalize email to lowercase everywhere
    const normalizedEmail = user.email.toLowerCase();

    // FIX: Only check domain restrictions if eventId is provided AND has restrictions
    if (eventId) {
      const allowedDomains = (await Event.findById(eventId).select('allowedDomains').lean())?.allowedDomains || [];

      if (allowedDomains.length > 0) {
        const domain = normalizedEmail.split('@')[1]?.toLowerCase();
        if (!domain || !allowedDomains.includes(domain)) {
          return res.redirect(`${process.env.FRONTEND_URL}/login?error=domain_not_allowed`);
        }
      }
    }

    // Check admin emails (case-insensitive)
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    let userRole = 'viewer'; // Default fallback role

    if (adminEmails.includes(normalizedEmail)) {
      userRole = 'admin';
      console.log(`User ${normalizedEmail} assigned ADMIN role`);
    } else if (eventId) {
      // Check jury allocation (case-insensitive)
      const allocation = await JuryAllocation.findOne({
        eventId,
        judgeEmail: normalizedEmail
      }).lean();

      if (allocation) {
        userRole = 'jury';
        console.log(`User ${normalizedEmail} assigned JURY role for event ${eventId}`);
      } else {
        console.log(`User ${normalizedEmail} has no allocation for event ${eventId}, set to VIEWER`);
      }
    } else {
      // No eventId provided, check if user has ANY jury allocation
      const anyAllocation = await JuryAllocation.findOne({
        judgeEmail: normalizedEmail
      }).lean();

      if (anyAllocation) {
        userRole = 'jury';
        console.log(`User ${normalizedEmail} has jury allocation, set to JURY`);
      } else {
        console.log(`User ${normalizedEmail} has no allocations, set to VIEWER`);
      }
    }

    // Always update user with correct role
    await User.updateOne(
      { _id: user._id },
      { role: userRole },
      { upsert: false }
    );
    user.role = userRole;

    const token = signToken(user);
    const redirect = process.env.FRONTEND_URL || 'http://localhost:5173';
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // In production the frontend and backend are on different subdomains:
      // sameSite must be 'none' + secure:true so the browser sends the cookie cross-origin.
      // In dev (localhost) use 'lax' + secure:false.
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    });
    res.redirect(`${redirect}/?token=${token}`);
  })(req, res, next);
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('email name role').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('/auth/me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (_, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  });
  res.json({ ok: true });
});

export default router;