import mongoose from 'mongoose';

const scoreLogSchema = new mongoose.Schema({
  action: String, // 'submit', 'update', 'absent_toggle', 'unlock' (admin)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String, // Store name for readability
  userEmail: String, // Store email for readability
  timestamp: { type: Date, default: Date.now },
  details: mongoose.Schema.Types.Mixed, // { criteriaScores, absent, oldValue, newValue }
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

// Ensure unique score per (event, team, judge)
scoreSchema.index({ eventId: 1, teamId: 1, judgeId: 1 }, { unique: true });

export default mongoose.model('Score', scoreSchema);