const mongoose = require('mongoose');

const transformationSchema = new mongoose.Schema({
  gym: { type: mongoose.Schema.Types.ObjectId, ref: 'GymProfile', required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  memberName: { type: String, trim: true },
  beforeImageUrl: { type: String, required: true },
  afterImageUrl: { type: String, required: true },
  caption: { type: String, trim: true, maxlength: 500 },
  weightBefore: Number,
  weightAfter: Number,
  achievedAt: { type: Date, default: Date.now },
  isPublic: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Transformation', transformationSchema);
