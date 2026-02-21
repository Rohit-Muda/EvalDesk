import mongoose from 'mongoose';

const scoreLogSchema = new mongoose.Schema({
  action: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  details: mongoose.Schema.Types.Mixed,
}, { _id: false });

const scoreSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  judgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  criteriaScores: [{ type: Number }],
  absent: { type: Boolean, default: false },
  submittedAt: Date,
  locked: { type: Boolean, default: false },
  logs: [scoreLogSchema],
}, { timestamps: true });

scoreSchema.index({ eventId: 1, teamId: 1, judgeId: 1 }, { unique: true });

export default mongoose.model('Score', scoreSchema);
