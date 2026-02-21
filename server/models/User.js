import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  googleId: String,
  role: { type: String, enum: ['admin', 'jury', 'viewer'], default: 'viewer' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
