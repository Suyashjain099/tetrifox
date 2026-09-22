import mongoose from 'mongoose';

const batchJobSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    filename: {
      type: String,
      default: 'inline-payload',
    },
    fileType: {
      type: String,
      enum: ['JSON', 'XML'],
      required: true,
    },
    totalParcels: {
      type: Number,
      required: true,
      default: 0,
    },
    routedCounts: {
      Mail: { type: Number, default: 0 },
      Regular: { type: Number, default: 0 },
      Heavy: { type: Number, default: 0 },
      Insurance: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING',
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const BatchJobModel = mongoose.model('BatchJob', batchJobSchema);
