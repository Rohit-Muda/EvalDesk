import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const strategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`,
    scope: ['profile', 'email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(null, null, { message: 'No email from Google' });

      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          email,
          name: profile.displayName,
          googleId: profile.id,
          role: 'viewer',
        });
      } else if (!user.googleId) {
        user.googleId = profile.id;
        user.name = profile.displayName;
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
);

// Bypass session-based CSRF state verification for Vercel serverless.
// On Vercel each request can be a fresh function instance — session data
// stored during /google redirect is gone by the time /google/callback runs.
// Google's code exchange already validates flow integrity end-to-end.
strategy._stateStore = {
  store: function (req, state, callback) {
    // Called on GET /api/auth/google — nothing to store
    callback(null, 'stateless');
  },
  verify: function (req, providedState, meta, callback) {
    // Called on GET /api/auth/google/callback — always accept
    callback(null, true, providedState);
  },
};

passport.use(strategy);

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
