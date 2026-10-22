// How likely an enquiry is to become a paying customer, 5 to 95.
// Same rules as the original Leadsmith demo.
export function confidence(e) {
  if (e.status === 'won') return { n: 100, band: 'client' };
  if (e.status === 'lost') return null;
  const total = e.details.length + e.pending.length || 1;
  let n = 40 + Math.round((e.details.length / total) * 25);
  if (e.photos?.length) n += 8;
  if (e.details.filter((d) => d.source === 'message').length >= 4) n += 10;
  if (e.details.some((d) => d.source === 'reply')) n += 12;
  if (e.status === 'waiting') n -= 5;
  if (e.shopping) n -= 20;
  if (e.status === 'quoted') {
    n += 5;
    if (e.customerReply?.text) n += 15;
    else n -= 12 * (e.followUps?.sent || 0);
  }
  n = Math.max(5, Math.min(95, n));
  return { n, band: n >= 70 ? 'hi' : n >= 45 ? 'mid' : 'lo' };
}

// Where the enquiry sits for the person running the business.
export function stageOf(e) {
  if (e.status === 'needs_info' || e.status === 'ready' || (e.status === 'quoted' && e.customerReply?.text && !e.customerReply.answered))
    return 'you';
  return { waiting: 'wait', quoted: 'sent', won: 'won', lost: 'lost' }[e.status];
}

export const valueOf = (e) => e.quote?.price || e.estimate || 0;
