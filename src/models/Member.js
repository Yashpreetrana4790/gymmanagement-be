const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    gym: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GymProfile',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // ── Membership ──────────────────────────────────────────────────────────
    membershipType: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      default: 'basic',
    },
    membershipStart: { type: Date, default: Date.now },
    membershipEnd: {
      type: Date,
      required: [true, 'Membership end date is required'],
    },

    // ── Physique ────────────────────────────────────────────────────────────
    physique: {
      height:   { type: Number },           // cm
      weight:   { type: Number },           // kg
      bodyType: {
        type: String,
        enum: ['ectomorph', 'mesomorph', 'endomorph', ''],
        default: '',
      },
    },

    // ── Diet & Nutrition ────────────────────────────────────────────────────
    diet: {
      type: {
        type: String,
        enum: ['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian', ''],
        default: '',
      },
      allergies:   [{ type: String, trim: true }],  // e.g. ['nuts', 'dairy']
      supplements: { type: String, trim: true },     // freeform
    },

    // ── Fitness Goal ────────────────────────────────────────────────────────
    goal: {
      primary: {
        type: String,
        enum: ['weight-loss', 'muscle-gain', 'endurance', 'flexibility', 'general-fitness', 'rehabilitation', ''],
        default: '',
      },
      targetWeight: { type: Number },   // kg
      notes:        { type: String, trim: true },
    },

    // ── Health ──────────────────────────────────────────────────────────────
    health: {
      medicalConditions: { type: String, trim: true },
      injuries:          { type: String, trim: true },
      notes:             { type: String, trim: true },
    },

    // ── Emergency Contact ───────────────────────────────────────────────────
    emergencyContact: {
      name:     String,
      phone:    String,
      relation: String,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

memberSchema.virtual('isExpired').get(function () {
  return this.membershipEnd < new Date();
});

module.exports = mongoose.model('Member', memberSchema);
