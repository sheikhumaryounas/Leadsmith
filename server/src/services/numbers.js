import { Business } from '../models/Business.js';
import { pad4 } from './format.js';

// Atomically takes the next quote, job or invoice number for a business.
export async function nextNumber(businessId, key) {
  const before = await Business.findByIdAndUpdate(businessId, { $inc: { [`counters.${key}`]: 1 } }, { new: false });
  const n = before.counters[key];
  return { quote: `Q${pad4(n)}`, job: `J-${pad4(n)}`, invoice: `INV-${pad4(n)}` }[key];
}
