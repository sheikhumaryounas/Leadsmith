import mongoose from 'mongoose';

const { Schema } = mongoose;

// Every email Leadsmith sends (or would send, when SMTP is not configured).
const OutboxSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    enquiry: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    kind: { type: String, default: 'other' },
    to: String,
    subject: String,
    text: String,
    attachments: [String],
    status: { type: String, enum: ['sent', 'logged', 'skipped', 'failed'], required: true },
    error: String,
  },
  { timestamps: true },
);

OutboxSchema.index({ business: 1, createdAt: -1 });

export const Outbox = mongoose.model('Outbox', OutboxSchema);
