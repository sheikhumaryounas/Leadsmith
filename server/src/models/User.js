import mongoose from 'mongoose';

const { Schema } = mongoose;

// owner: everything. full: everything except team and account. jobsheets: read-only jobs.
export const ROLES = ['owner', 'full', 'jobsheets'];

const UserSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 200 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'owner' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

export const User = mongoose.model('User', UserSchema);
