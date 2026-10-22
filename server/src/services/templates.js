import { first, gbp } from './format.js';

// Every message Leadsmith writes for the business. Nothing goes out without approval,
// except the scheduled check-ins and nudges the business switched on.
export function signature(b) {
  return (b.settings?.signature || '').trim() || `${first(b.ownerName)}\n${b.name}`;
}

const who = (e) => e.contact || first(e.name);

export function questionsDraft(e, b, tone = b.settings?.tone || 'standard') {
  const n = who(e);
  const items = e.pending.map((d, i) => `${i + 1}. ${d.ask}`).join('\n');
  const photo = b.settings?.askForPhoto && !e.photos?.length ? `\nA photo of where it's going helps us quote faster.\n` : '';
  const sig = signature(b);
  if (tone === 'friendly')
    return `Hi ${n},\n\nThanks for getting in touch, happy to help with this! So I can give you a proper price, could you let me know:\n\n${items}\n${photo}\nCheers,\n${sig}`;
  if (tone === 'formal')
    return `Dear ${e.contact || e.name},\n\nThank you for your enquiry about the ${e.job.toLowerCase()}. To prepare an accurate quotation, please could you confirm the following:\n\n${items}\n${photo}\nKind regards,\n${b.ownerName || ''}\n${b.name}`.replace('\n\n\n', '\n\n');
  return `Hi ${n},\n\nThanks for getting in touch. To give you an accurate price, could you let me know:\n\n${items}\n${photo}\nThanks,\n${sig}`;
}

export const depositLine = (deposit) =>
  deposit === 'None' ? 'Payment is due on fitting.' : `A ${deposit} deposit books you in, with the balance on fitting.`;

export function quoteEmail(e, b, price, deposit) {
  const vat = b.settings?.vatRegistered ? (b.settings.pricesIncludeVat ? ' including VAT' : ' plus VAT') : '';
  return `Hi ${who(e)},\n\nThanks for sending the details over. The price for ${e.quote?.description || e.job.toLowerCase()} is ${gbp(price)}${vat}. ${depositLine(deposit)}\n\nThe full quotation is attached. Any questions, just reply to this email.\n\nThanks,\n${signature(b)}`;
}

export function followUpText(e, b, index) {
  const n = who(e);
  const job = e.job.toLowerCase();
  const days = b.settings?.quoteValidDays || 30;
  const lines = [
    `Hi ${n}, just checking the quote for your ${job} reached you OK. Happy to answer any questions.`,
    `Hi ${n}, wanted to see if you'd had a chance to look at the quote. If anything needs changing, like the finish or the design, let me know and I'll update it.`,
    `Hi ${n}, last check-in from me on the ${job} quote. If the timing isn't right, no problem. The price holds for ${days} days.`,
  ];
  return `${lines[Math.min(index, 2)]}\n\nThanks,\n${signature(b)}`;
}

export function nudgeText(e, b) {
  return `Hi ${who(e)},\n\nJust checking you saw my message about your ${e.job.toLowerCase()}. Once I have those details I can send your price.\n\nThanks,\n${signature(b)}`;
}

export function inviteEmail(b, link) {
  return `Hi,\n\n${b.ownerName || b.name} has invited you to Leadsmith for ${b.name}.\n\nSet up your account here (the link works for 7 days):\n${link}\n\nThanks,\nLeadsmith`;
}
