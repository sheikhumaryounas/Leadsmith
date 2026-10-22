import mongoose from 'mongoose';

const { Schema } = mongoose;

const InviteSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: ['full', 'jobsheets'], default: 'jobsheets' },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acceptedAt: Date,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const Invite = mongoose.model('Invite', InviteSchema);
