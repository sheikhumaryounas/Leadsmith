import mongoose from 'mongoose';

const { Schema } = mongoose;

const JobSchema = new Schema(
  {
    business: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    enquiry: { type: Schema.Types.ObjectId, ref: 'Enquiry' },
    number: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    title: { type: String, required: true, maxlength: 160 },
    customer: { type: String, required: true, maxlength: 120 },
    email: { type: String, default: '' },
    phone: { type: String, maxlength: 40, default: '' },
    town: { type: String, default: '' },
    postcode: { type: String, default: '' },
    site: { type: String, maxlength: 300, default: '' },
    access: { type: String, maxlength: 500, default: '' },
    price: { type: Number, required: true }, // pence
    deposit: { type: Number, default: 0 }, // pence
    wonAt: { type: Date, default: Date.now },
    depositPaidAt: Date,
    fittedAt: Date,
    paidFullAt: Date,
    specs: [{ k: String, v: String, _id: false }],
    lines: [{ description: String, amount: Number, _id: false }], // pence, gross
    note: { type: String, maxlength: 2000, default: '' },
    confidenceAtQuote: Number,
    photos: [{ name: String, url: String, _id: false }],
  },
  { timestamps: true },
);

JobSchema.index({ business: 1, wonAt: -1 });

export const Job = mongoose.model('Job', JobSchema);
