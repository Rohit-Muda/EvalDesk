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
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);
