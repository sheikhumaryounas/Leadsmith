import PDFDocument from 'pdfkit';
import { cap, fDate, gbp2, depositPence, addDays } from './format.js';
import { depositLine } from './templates.js';

const INK = '#1b1d21';
const MUTED = '#5a5d63';
const LINE = '#e4e0d8';

function render(build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Producer: 'Leadsmith' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    build(doc);
    doc.end();
  });
}

// Splits a gross amount into net and VAT according to the business's VAT settings.
export function vatSplit(b, gross) {
  const s = b.settings || {};
  if (!s.vatRegistered || !s.vatRate) return { net: gross, vat: 0, total: gross, rate: 0 };
  if (s.pricesIncludeVat) {
    const net = Math.round(gross / (1 + s.vatRate / 100));
    return { net, vat: gross - net, total: gross, rate: s.vatRate };
  }
  const vat = Math.round((gross * s.vatRate) / 100);
  return { net: gross, vat, total: gross + vat, rate: s.vatRate };
}

function header(doc, b, title, ref) {
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(18).text(b.name, 50, 50);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED);
  const addr = [b.address, b.email, b.phone, b.vatNumber ? `VAT ${b.vatNumber}` : ''].filter(Boolean).join('\n');
  doc.text(addr, 50, 74, { width: 280 });
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text(title, 300, 50, { width: 245, align: 'right' });
  doc.font('Courier').fontSize(11).text(ref, 300, 76, { width: 245, align: 'right' });
  doc.moveTo(50, 140).lineTo(545, 140).lineWidth(1.5).strokeColor(INK).stroke();
}

function meta(doc, left, right) {
  let y = 156;
  const block = (pairs, x) => {
    let yy = y;
    for (const [label, value] of pairs) {
      doc.font('Helvetica').fontSize(8).fillColor('#8a8c90').text(label.toUpperCase(), x, yy, { characterSpacing: 0.8 });
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(value || '—', x, yy + 11, { width: 230 });
      yy = doc.y + 8;
    }
    return yy;
  };
  return Math.max(block(left, 50), block(right, 330)) + 6;
}

function table(doc, y, rows) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text('Description', 50, y).text('Amount', 445, y, { width: 100, align: 'right' });
  y += 16;
  doc.moveTo(50, y).lineTo(545, y).lineWidth(1).strokeColor(INK).stroke();
  y += 8;
  for (const [desc, amount] of rows) {
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(desc, 50, y, { width: 370 });
    const h = doc.y - y;
    doc.font('Courier').fontSize(10).text(amount, 445, y, { width: 100, align: 'right' });
    y += Math.max(h, 12) + 8;
    doc.moveTo(50, y - 4).lineTo(545, y - 4).lineWidth(0.5).strokeColor(LINE).stroke();
  }
  return y + 6;
}

function totals(doc, y, rows) {
  for (const [label, value, strong] of rows) {
    doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(INK).text(label, 330, y, { width: 120 });
    doc.font('Courier').text(value, 445, y, { width: 100, align: 'right' });
    y += 18;
  }
  return y;
}

function footer(doc, y, text) {
  doc.moveTo(50, y + 14).lineTo(545, y + 14).lineWidth(0.5).strokeColor(LINE).stroke();
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(text, 50, y + 22, { width: 495 });
}

export function quotePdf(b, e) {
  return render((doc) => {
    const price = e.quote?.price || e.estimate;
    const deposit = e.quote?.deposit || b.settings.deposit;
    const sentAt = e.quote?.sentAt || new Date();
    const split = vatSplit(b, price);
    header(doc, b, 'Quotation', e.quote?.ref || 'DRAFT');
    let y = meta(
      doc,
      [['Prepared for', e.name], ['Location', [e.town, e.postcode].filter(Boolean).join(' ')]],
      [['Date', fDate(sentAt)], ['Valid until', fDate(addDays(sentAt, b.settings.quoteValidDays || 30))]],
    );
    y = table(doc, y, [[`${e.job}\n${cap(e.quote?.description || '')}`.trim(), gbp2(split.net)]]);
    const rows = [['Subtotal', gbp2(split.net)]];
    if (split.rate) rows.push([`VAT at ${split.rate}%`, gbp2(split.vat)]);
    rows.push(['Total', gbp2(split.total), true]);
    if (deposit !== 'None') rows.push([`${deposit} deposit to book`, gbp2(depositPence(split.total, deposit)), true]);
    y = totals(doc, y, rows);
    footer(doc, y, `${depositLine(deposit)} ${b.settings.terms || ''}`.trim());
  });
}

export function invoicePdf(b, j) {
  return render((doc) => {
    const gross = j.lines.reduce((a, l) => a + l.amount, 0) || j.price;
    const split = vatSplit(b, gross);
    const paid = j.paidFullAt ? split.total : j.depositPaidAt ? j.deposit : 0;
    header(doc, b, 'Invoice', j.invoiceNumber);
    let y = meta(doc, [['Bill to', j.customer], ['Site', j.site || [j.town, j.postcode].filter(Boolean).join(' ')]], [['Issued', fDate(j.wonAt)], ['Job', j.number]]);
    y = table(doc, y, (j.lines.length ? j.lines : [{ description: j.title, amount: j.price }]).map((l) => [l.description, gbp2(split.rate && b.settings.pricesIncludeVat ? Math.round(l.amount / (1 + split.rate / 100)) : l.amount)]));
    const rows = [['Subtotal', gbp2(split.net)]];
    if (split.rate) rows.push([`VAT at ${split.rate}%`, gbp2(split.vat)]);
    rows.push(['Total', gbp2(split.total), true]);
    if (j.paidFullAt) rows.push([`Paid ${fDate(j.paidFullAt)}`, `-${gbp2(split.total)}`]);
    else if (j.depositPaidAt) rows.push([`Deposit received`, `-${gbp2(j.deposit)}`]);
    rows.push([split.total - paid ? (j.fittedAt ? 'Balance due now' : 'Balance due on fitting') : 'Balance due', gbp2(split.total - paid), true]);
    y = totals(doc, y, rows);
    const bank = b.settings.bank || {};
    const pay = bank.accountNumber
      ? `Pay by bank transfer to ${bank.accountName || b.name}, sort code ${bank.sortCode}, account ${bank.accountNumber}. Use ${j.invoiceNumber} as the reference.`
      : 'Payment by bank transfer. Bank details are on your quotation.';
    footer(doc, y, `Thank you for your business. ${pay}`);
  });
}
