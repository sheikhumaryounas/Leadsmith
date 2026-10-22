import { fD, first, gbp, plural } from './format.js';

export const who = (e) => e.contact || first(e.name);

// Simple stage shown in lists. Same colours as the dashboard pipeline.
export const STAGES = {
  you: ['p-you', 'Needs you'],
  wait: ['p-wait', 'Waiting on customer'],
  sent: ['p-sent', 'Quote sent'],
  won: ['p-won', 'Won'],
  lost: ['p-lost', 'Lost'],
};

// Checked for colour-blind separation on the dark dashboard card.
export const PIPE_COLOURS = { you: '#e0662c', wait: '#9aa1aa', sent: '#3987e5', won: '#1fa463' };

export const STATUS_LABEL = {
  needs_info: 'Needs your OK',
  waiting: 'Waiting on customer',
  ready: 'Ready to price',
  quoted: 'Quote sent',
  won: 'Won',
  lost: 'Lost',
};

export function nextShort(e) {
  switch (e.status) {
    case 'needs_info': return 'Approve the reply';
    case 'waiting': return `Waiting for ${who(e)} to reply`;
    case 'ready': return 'Add your price';
    case 'quoted':
      if (e.customerReply?.text && !e.customerReply.answered) return `Answer ${who(e)}’s question`;
      if (e.customerReply?.answered) return `Waiting for ${who(e)} to confirm`;
      if (e.followUps?.paused) return 'Reminders paused';
      return e.followUps?.nextAt ? `Reminder goes out ${fD(e.followUps.nextAt)}` : 'All reminders sent';
    case 'won': return 'Job booked';
    default: return e.lostReason || 'Lost';
  }
}

export function needMessage(e) {
  if (e.status === 'needs_info') return `Your reply is ready. It asks for ${plural(e.pending.length, 'missing detail')}.`;
  if (e.status === 'ready') return 'All details are in. Add your price to send the quote.';
  return `${who(e)} replied: “${e.customerReply?.text || ''}”`;
}

export function todoTitle(e) {
  if (e.status === 'needs_info') return `Approve the reply to ${e.name}`;
  if (e.status === 'ready') return `Add your price for ${e.name}`;
  return e.contact ? `Answer ${e.contact} at ${e.name}` : `Answer ${e.name}`;
}

export const JOB_STATE = {
  dep: { label: 'Awaiting deposit', cls: 'p-due' },
  work: { label: 'In workshop', cls: 'p-sent' },
  fitted: { label: 'Fitted, balance due', cls: 'p-due' },
  done: { label: 'Completed', cls: 'p-paid' },
};

export function jobSub(j) {
  if (j.state === 'done') return `Fitted ${fD(j.fittedAt)} · paid ${fD(j.paidFullAt)}`;
  if (j.state === 'fitted') return `Balance ${gbp(j.due)} due`;
  if (j.state === 'work') return j.deposit ? `Deposit paid ${fD(j.depositPaidAt)}` : 'No deposit on this job';
  return `Deposit ${gbp(j.deposit)} invoiced`;
}
