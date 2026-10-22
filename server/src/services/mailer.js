import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { Outbox } from '../models/Outbox.js';

let transport = null;
function getTransport() {
  // Without SMTP settings, mails are rendered but not delivered (status "logged").
  if (!transport) transport = nodemailer.createTransport(config.smtp || { jsonTransport: true });
  return transport;
}

export async function sendMail({ business, enquiry, to, subject, text, attachments = [], kind = 'other' }) {
  const from = config.mailFrom || `${business.name} <${business.email || 'no-reply@localhost'}>`;
  let status = config.smtp ? 'sent' : 'logged';
  let error;
  if (!to) {
    status = 'skipped';
    error = 'No email address for this customer';
  } else {
    try {
      await getTransport().sendMail({ from, to, subject, text, attachments, replyTo: business.email || undefined });
    } catch (err) {
      status = 'failed';
      error = err.message;
    }
  }
  await Outbox.create({
    business: business._id,
    enquiry: enquiry?._id,
    kind,
    to,
    subject,
    text,
    attachments: attachments.map((a) => a.filename),
    status,
    error,
  });
  return { status, error };
}
