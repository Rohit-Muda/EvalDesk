import mongoose from 'mongoose';

const juryAllocationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  judgeEmail: { type: String, required: true },
  domains: [{ type: String }],
  maxTeams: { type: Number, default: 0 },
}, { timestamps: true });

juryAllocationSchema.index({ eventId: 1, judgeEmail: 1 }, { unique: true });

export default mongoose.model('JuryAllocation', juryAllocationSchema);
