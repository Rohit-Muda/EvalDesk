import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
  credentials: true 
}));
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
    jwt_configured: !!process.env.JWT_SECRET
  });
});

// API Routes (protected)
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

// Start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('⚠️ MongoDB connection failed:', err.message);
    console.error('Continuing without database...');
  }

  const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
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