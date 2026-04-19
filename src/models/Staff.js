const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    gym: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GymProfile',
      required: true,
    },

    staffId: { type: String, trim: true }, // auto-generated STF-XXXX

    // ── Personal Info ────────────────────────────────────────────────────────
    firstName:   { type: String, required: true, trim: true },
    lastName:    { type: String, required: true, trim: true },
    phone:       { type: String, required: true, trim: true },
    email:       { type: String, trim: true, lowercase: true },
    gender:      { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth: { type: Date },

    // ── Role & Job ───────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ['trainer', 'receptionist', 'manager', 'cleaner'],
      required: true,
    },
    specialization: [{ type: String, trim: true }], // trainer only
    joiningDate:    { type: Date, required: true },
    salary: {
      amount: { type: Number, min: 0 },
      type:   { type: String, enum: ['monthly', 'per-session'], default: 'monthly' },
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time'],
      default: 'full-time',
    },

    // ── Work Schedule ────────────────────────────────────────────────────────
    schedule: {
      workingDays: [{ type: String }], // ['mon','tue','wed'...]
      shiftType:   { type: String, enum: ['morning', 'evening', 'custom'], default: 'morning' },
      shiftStart:  { type: String }, // "09:00"
      shiftEnd:    { type: String }, // "17:00"
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    tempPassword: { type: String, select: false }, // cleared on staff's first login

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema);
