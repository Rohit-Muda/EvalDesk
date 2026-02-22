import mongoose from 'mongoose';

export async function connectDB() {
  // Reuse existing connection across serverless invocations (Vercel caches module scope)
  if (mongoose.connection.readyState === 1) return;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/evaldesk';
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000, // fail fast if Atlas is unreachable
    connectTimeoutMS: 5000,
  });
}
