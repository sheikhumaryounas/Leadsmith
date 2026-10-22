import mongoose from 'mongoose';

const { Schema } = mongoose;

export const STATUSES = ['needs_info', 'waiting', 'ready', 'quoted', 'won', 'lost'];
export const CHANNELS = ['Website form', 'Email', 'Phone note', 'WhatsApp'];

const Detail = new Schema(
  {
    key: { type: String, required: true, maxlength: 60 },
    value: { type: String, required: true, maxlength: 300 },
    source: { type: String, enum: ['message', 'photo', 'reply', 'you'], default: 'message' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const Pending = new Schema(
  {
    key: { type: String, required: true, maxlength: 60 },
    ask: { type: String, required: true, maxlength: 300 },
  },
  { _id: false },
);

const Event = new Schema(
  {
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const EnquirySchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    contact: { type: String, trim: true, maxlength: 120, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    town: { type: String, trim: true, maxlength: 80, default: '' },
    postcode: { type: String, trim: true, uppercase: true, maxlength: 12, default: '' },
    job: { type: String, required: true, trim: true, maxlength: 120 },
    jobType: { type: String, default: 'custom' },
    channel: { type: String, enum: CHANNELS, default: 'Phone note' },
    message: { type: String, maxlength: 5000, default: '' },
    photos: [{ name: String, url: String, _id: false }],
    details: [Detail],
    pending: [Pending],
    estimate: { type: Number, default: 0 }, // pence
    range: { type: [Number], default: [0, 0] }, // pence
    effort: { type: String, default: '' },
    fit: { type: String, default: '' },
    shopping: { type: Boolean, default: false },
    notes: { type: String, maxlength: 2000, default: '' },
    status: { type: String, enum: STATUSES, default: 'needs_info', index: true },
    draft: { text: String, tone: String, edited: { type: Boolean, default: false } },
    questionsSentAt: Date,
    nudgeAt: Date,
    nudgedAt: Date,
    detailsInAt: Date,
    quote: {
      ref: String,
      price: Number, // pence, including VAT when the business quotes that way
      deposit: { type: String, enum: ['25%', '50%', 'None'] },
      description: String,
      sentAt: Date,
    },
    followUps: {
      sent: { type: Number, default: 0 },
      paused: { type: Boolean, default: false },
      nextAt: Date,
    },
    customerReply: { text: String, at: Date, answered: { type: Boolean, default: false }, answer: String },
    confidenceAtQuote: Number,
    lostReason: { type: String, maxlength: 200 },
    closedAt: Date,
    jobRef: { type: Schema.Types.ObjectId, ref: 'Job' },
    events: [Event],
  },
  { timestamps: true },
);

EnquirySchema.index({ business: 1, createdAt: -1 });
EnquirySchema.index({ status: 1, 'followUps.nextAt': 1 });
EnquirySchema.index({ status: 1, nudgeAt: 1 });

export const Enquiry = mongoose.model('Enquiry', EnquirySchema);
