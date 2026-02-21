import mongoose from 'mongoose';
import crypto from 'crypto';

const teamSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  project: { type: String, default: '' },
  domain: { type: String, default: '' },
  qrToken: { type: String, required: true, unique: true },
}, { timestamps: true });

teamSchema.index({ eventId: 1 });

export function generateQrToken() {
  return crypto.randomBytes(24).toString('hex');
}

export default mongoose.model('Team', teamSchema);
