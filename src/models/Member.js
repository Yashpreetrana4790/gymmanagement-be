const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    membershipType: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      default: 'basic',
    },
    membershipStart: {
      type: Date,
      default: Date.now,
    },
    membershipEnd: {
      type: Date,
      required: [true, 'Membership end date is required'],
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    healthNotes: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

memberSchema.virtual('isExpired').get(function () {
  return this.membershipEnd < new Date();
});

module.exports = mongoose.model('Member', memberSchema);
