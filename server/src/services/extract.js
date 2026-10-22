import { jobTypeFor } from './catalog.js';

// Rule-based reading of an enquiry message. It picks up the obvious facts
// (sizes, finish, quantity, postcode) and lists what is still missing.
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, pair: 2 };

const UNIT = String.raw`(\d+(?:\.\d+)?)\s*(mm|millimetres?|cm|m|metres?|meters?|ft|feet|foot|')`;
const FT_TO_MM = 304.8;

function toMm(value, unit) {
  const v = parseFloat(value);
  const u = unit.toLowerCase();
  if (u.startsWith('mm') || u.startsWith('milli')) return Math.round(v);
  if (u === 'cm') return Math.round(v * 10);
  if (u === 'ft' || u.startsWith('feet') || u === 'foot' || u === "'") return Math.round((v * FT_TO_MM) / 10) * 10;
  return Math.round(v * 1000);
}

function sizeNear(text, words) {
  const re = new RegExp(String.raw`(?:${words})[^.\d]{0,20}${UNIT}|${UNIT}\s*(?:${words})`, 'i');
  const m = text.match(re);
  if (!m) return null;
  const [value, unit] = m[1] ? [m[1], m[2]] : [m[3], m[4]];
  const mm = toMm(value, unit).toLocaleString('en-GB');
  return /^(mm|milli)/i.test(unit) ? `${mm} mm` : `≈${mm} mm (“${value} ${unit}”)`;
}

export function quantityOf(text) {
  const m =
    text.match(/[×x]\s?(\d{1,2})\b/i) ||
    text.match(/\b(\d{1,2})\s+(?:windows?|balconies|grilles?|gates|units|off)\b/i) ||
    text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|pair)\b(?:\s+of)?\s+(?:juliet|windows?|balconies|grilles?|rear windows)/i);
  if (!m) return 1;
  const n = NUMBER_WORDS[m[1].toLowerCase()] || parseInt(m[1], 10);
  return n > 0 && n < 50 ? n : 1;
}

export function readMessage({ message = '', job = '' }) {
  const text = `${job}. ${message}`;
  const type = jobTypeFor(text);
  const found = {};

  const height = sizeNear(text, 'tall|high|height|ht');
  if (height) found.Height = height;
  const width = sizeNear(text, 'wide|width|opening|across');
  if (width) found.Width = found['Opening width'] = width;
  const length = sizeNear(text, 'long|length|run|metres? of|along');
  if (length) found.Length = found['Run length'] = found['Landing run'] = length;
  const len2 = text.match(/(?:about|around|roughly|approx\.?)?\s*(\d+(?:\.\d+)?)\s*m\b(?!m)/i);
  if (!found.Length && len2 && type.type === 'railings') found.Length = `≈${len2[1]} m`;

  const finishes = [];
  if (/galvani[sz]/i.test(text)) finishes.push('Galvanised');
  if (/powder[- ]?coat/i.test(text)) finishes.push('Powder coat');
  const ral = text.match(/\bRAL\s?(\d{4})\b/i);
  if (ral) finishes.push(`RAL ${ral[1]}`);
  else if (/\bblack\b/i.test(text)) finishes.push('Black');
  else if (/\bwhite\b/i.test(text)) finishes.push('White');
  if (finishes.length) found.Finish = finishes.join(', ');

  if (/supply (and|&) fit|supplied and fitted|fit(ted)? please/i.test(text)) found['Supply or fit'] = 'Supply and fit';
  else if (/supply only/i.test(text)) found['Supply or fit'] = 'Supply only';

  const steps = text.match(/(\d{1,2})\s+steps/i);
  if (steps) found['Number of steps'] = `${steps[1]} steps`;
  if (/\bglass\b/i.test(text) && !/glass or metal|metal or glass/i.test(text)) found.Infill = 'Glass';
  const deadline = text.match(/before (christmas|easter|the summer|[a-z]+ \d{1,2}|\d{1,2} [a-z]+)/i);

  const qty = quantityOf(text);
  const details = [{ key: 'Job', value: type.label === 'Custom metalwork' ? job : `${type.label}${qty > 1 ? `, ${qty} off` : ''}`, source: 'message' }];
  for (const [key] of type.need) if (found[key]) details.push({ key, value: found[key], source: 'message' });
  if (deadline) details.push({ key: 'Deadline', value: `Before ${deadline[1]}`, source: 'message' });

  const pending = type.need.filter(([key]) => !found[key]).map(([key, ask]) => ({ key, ask }));
  const unit = type.perUnit ? qty : 1;
  return {
    jobType: type.type,
    details,
    pending,
    estimate: type.estimate * unit,
    range: [type.range[0] * unit, type.range[1] * unit],
    effort: type.effort,
    fit: type.fit,
    shopping: /getting (a few )?(prices|quotes)|shopping around|few prices/i.test(text),
  };
}

const POSTCODE = /\b([A-Z]{1,2}\d{1,2}[A-Z]?)(?:\s*\d[A-Z]{2})?\b/;
export function postcodeFrom(text = '') {
  const m = String(text).toUpperCase().match(POSTCODE);
  return m ? m[1] : '';
}
