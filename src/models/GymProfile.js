const mongoose = require('mongoose');
const crypto = require('crypto');

const gymProfileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    gymName: {
      type: String,
      required: [true, 'Gym name is required'],
      trim: true,
    },
    strength: {
      type: Number,
      required: [true, 'Gym capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    location: {
      city: { type: String, required: [true, 'City is required'], trim: true },
      state: { type: String, trim: true },
      country: { type: String, default: 'India', trim: true },
      address: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomBytes(24).toString('hex'),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GymProfile', gymProfileSchema);
