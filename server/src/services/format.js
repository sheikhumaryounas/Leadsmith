// Small shared helpers. Money is stored in pence everywhere.
export const gbp = (pence) => '£' + Math.round((pence || 0) / 100).toLocaleString('en-GB');
export const gbp2 = (pence) =>
  '£' + ((pence || 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const first = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';
export const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const pad4 = (n) => String(n).padStart(4, '0');
export const fDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const addDays = (d, n) => new Date(new Date(d).getTime() + n * 86400000);
export const depositPence = (price, deposit) =>
  deposit === 'None' ? 0 : Math.round((price * parseInt(deposit, 10)) / 100);
