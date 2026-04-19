const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  gym: { type: mongoose.Schema.Types.ObjectId, ref: 'GymProfile', required: true },
  submitterName: { type: String, required: true, trim: true },
  submitterEmail: { type: String, trim: true, lowercase: true },
  category: {
    type: String,
    enum: ['complaint', 'suggestion', 'compliment', 'general'],
    default: 'general',
  },
  rating: { type: Number, min: 1, max: 5 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
  adminResponse: { type: String, trim: true },
  resolvedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
