import mongoose from 'mongoose';

const criteriaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  weight: { type: Number, required: true, min: 0 },
  maxScore: { type: Number, required: true, min: 0 },
}, { _id: false });

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  allowedDomains: [{ type: String }],
  rubric: [criteriaSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // P2 FIX #5a: Add soft-delete support
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// P2 FIX #5b: Add index for soft-delete queries
eventSchema.index({ deletedAt: 1 });

export default mongoose.model('Event', eventSchema);