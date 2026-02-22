import mongoose from 'mongoose';
import crypto from 'crypto';

const teamSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  project: { type: String, default: '' },
  domain: { type: String, default: '' },
  qrToken: { type: String, required: true, unique: true },
  // P2 FIX #5c: Add soft-delete support
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

teamSchema.index({ eventId: 1 });
// P2 FIX #5d: Add index for soft-delete queries
teamSchema.index({ deletedAt: 1 });

export function generateQrToken() {
  return crypto.randomBytes(24).toString('hex');
}

export default mongoose.model('Team', teamSchema);