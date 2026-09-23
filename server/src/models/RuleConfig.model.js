import mongoose from 'mongoose';

const historyItemSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    mailMaxWeightKg: { type: Number, required: true },
    regularMaxWeightKg: { type: Number, required: true },
    insuranceMinThresholdEur: { type: Number, required: true },
    updatedAt: { type: String, required: true },
    updatedBy: { type: String, default: 'Supervisor' },
  },
  { _id: false }
);

const ruleConfigSchema = new mongoose.Schema(
  {
    mailMaxWeightKg: {
      type: Number,
      required: true,
      default: 1.0,
    },
    regularMaxWeightKg: {
      type: Number,
      required: true,
      default: 10.0,
    },
    insuranceMinThresholdEur: {
      type: Number,
      required: true,
      default: 1000.0,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    history: {
      type: [historyItemSchema],
      default: [],
    },
    updatedBy: {
      type: String,
      default: 'System',
    },
  },
  {
    timestamps: true,
  }
);

export const RuleConfigModel = mongoose.model('RuleConfig', ruleConfigSchema);
