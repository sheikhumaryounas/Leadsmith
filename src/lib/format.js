// Money comes from the API in pence.
export const gbp = (pence) => '£' + Math.round((pence || 0) / 100).toLocaleString('en-GB');
export const kf = (pence) => {
  const n = (pence || 0) / 100;
  return n >= 1000 ? `£${Math.round(n / 100) / 10}K` : `£${Math.round(n)}`;
};
export const toPence = (text) => {
  const n = parseFloat(String(text).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

const DAY = 86400000;
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const fD = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');
export const fW = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '') : '';
export const fTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
export const fLong = (d = new Date()) =>
  new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

// "Today 07:42", "Yesterday", "Mon", "2 Oct"
export function fRel(d) {
  if (!d) return '';
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY);
  if (days <= 0) return `Today ${fTime(d)}`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return new Date(d).toLocaleDateString('en-GB', { weekday: 'short' });
  return fD(d);
}

export const plural = (n, word, many) => `${n} ${n === 1 ? word : many || word + 's'}`;
export const enqs = (n, pre = '') => `${n} ${pre}${n === 1 ? 'enquiry' : 'enquiries'}`;
export const first = (name) => String(name || '').trim().split(/\s+/)[0] || '';
export const initials = (n) =>
  String(n || '?').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
};
