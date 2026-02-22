import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';
import { connectDB } from './config/db.js';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import teamRoutes from './routes/teams.js';
import scoreRoutes from './routes/scores.js';
import juryRoutes from './routes/jury.js';
import trackingRoutes from './routes/tracking.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Vercel's proxy layer so req.secure, req.ip, etc. are correct
app.set('trust proxy', 1);

// Allowed CORS origins: support local dev and multiple production URLs
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS: origin not allowed: ' + origin));
  },
  credentials: true,
}));

// cookie-session: stores OAuth state in a signed cookie so it survives
// Vercel's stateless function invocations (session travels in the browser)
app.use(cookieSession({
  name: 'oauth_session',
  keys: [process.env.JWT_SECRET || 'dev-session-secret'],
  maxAge: 10 * 60 * 1000, // 10 minutes — only needed during OAuth handshake
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  httpOnly: true,
}));

// Passport v0.6+ requires regenerate() and save() on req.session.
// cookie-session doesn't provide them, so we shim them.
app.use((req, res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb) => { cb(); };
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb) => { cb(); };
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Health Check (no DB required)
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    ok: true,
    environment: process.env.NODE_ENV || 'development',
    mongodb_configured: !!process.env.MONGODB_URI,
    google_configured: !!process.env.GOOGLE_CLIENT_ID,
    jwt_configured: !!process.env.JWT_SECRET,
    routes: [
      '/api/auth',
      '/api/events',
      '/api/teams',
      '/api/scores',
      '/api/jury',
      '/api/tracking'
    ]
  });
});

// ✅ API Routes - MAKE SURE THESE ARE HERE
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/jury', juryRoutes);
app.use('/api/tracking', trackingRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅' : '❌'}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
};

startServer().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

export default app;