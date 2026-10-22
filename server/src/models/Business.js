import crypto from 'node:crypto';
import mongoose from 'mongoose';

const { Schema } = mongoose;

const BusinessSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    ownerName: { type: String, trim: true, maxlength: 120, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    vatNumber: { type: String, trim: true, maxlength: 40, default: '' },
    companyNumber: { type: String, trim: true, maxlength: 40, default: '' },
    areas: { type: [String], default: [] },
    // Public key for the website quote form endpoint.
    formKey: { type: String, unique: true, default: () => crypto.randomBytes(12).toString('hex') },
    settings: {
      askForPhoto: { type: Boolean, default: true },
      tone: { type: String, enum: ['standard', 'friendly', 'formal'], default: 'standard' },
      signature: { type: String, maxlength: 300, default: '' },
      nudgeAfterHours: { type: Number, default: 48 },
      followUpDays: { type: [Number], default: [3, 7, 14] },
      quoteValidDays: { type: Number, default: 30 },
      balanceDue: { type: String, enum: ['on_fitting', '7_days', '14_days'], default: 'on_fitting' },
      pricesIncludeVat: { type: Boolean, default: true },
      vatRegistered: { type: Boolean, default: true },
      vatRate: { type: Number, default: 20 },
      deposit: { type: String, enum: ['25%', '50%', 'None'], default: '50%' },
      terms: {
        type: String,
        maxlength: 1000,
        default: 'Prices include supply and fitting unless stated. A deposit books your job in, with the balance due on fitting.',
      },
      bank: {
        accountName: { type: String, maxlength: 120, default: '' },
        sortCode: { type: String, maxlength: 8, default: '' },
        accountNumber: { type: String, maxlength: 8, default: '' },
      },
      notify: {
        customerReplies: { type: Boolean, default: true },
        jobWon: { type: Boolean, default: true },
        morningSummary: { type: Boolean, default: false },
        weeklyReport: { type: Boolean, default: true },
        byEmail: { type: Boolean, default: true },
        bySms: { type: Boolean, default: false },
      },
      whatsappConnected: { type: Boolean, default: false },
    },
    counters: {
      quote: { type: Number, default: 100 },
      job: { type: Number, default: 1 },
      invoice: { type: Number, default: 1 },
    },
  },
  { timestamps: true },
);

export const Business = mongoose.model('Business', BusinessSchema);
