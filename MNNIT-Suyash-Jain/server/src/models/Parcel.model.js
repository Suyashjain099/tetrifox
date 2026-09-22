import mongoose from 'mongoose';

const parcelSchema = new mongoose.Schema(
  {
    parcelId: {
      type: String,
      index: true,
    },
    warehouseId: {
      type: String,
      default: 'WH-AMS-01',
      index: true,
    },
    recipient: {
      name: { type: String, default: 'Unknown' },
      street: { type: String },
      houseNumber: { type: String },
      postalCode: { type: String },
      city: { type: String },
    },
    weightKg: {
      type: Number,
      required: true,
      min: 0,
    },
    valueEur: {
      type: Number,
      required: true,
      min: 0,
    },
    destinationCountry: {
      type: String,
      default: 'NL',
    },
    postalCode: {
      type: String,
    },
    department: {
      type: String,
      enum: ['Mail', 'Regular', 'Heavy', 'Insurance', 'Customs'],
      required: true,
    },
    requiresApproval: {
      type: Boolean,
      required: true,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NOT_REQUIRED',
      index: true,
    },
    approvedBy: {
      type: String,
    },
    approvedAt: {
      type: Date,
    },
    releasedFromEscrow: {
      type: Boolean,
      default: false,
      index: true,
    },
    matchedRule: {
      type: String,
      required: true,
    },
    evaluatedRules: {
      type: [String],
      default: [],
    },
    batchId: {
      type: String,
      index: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ParcelModel = mongoose.model('Parcel', parcelSchema);
