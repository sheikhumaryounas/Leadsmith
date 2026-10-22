import { Enquiry } from '../models/Enquiry.js';
import { Business } from '../models/Business.js';
import { sendFollowUp, sendNudge } from './enquiries.js';

// Sends the check-ins and nudges that are due. Safe to run often: each send moves
// the enquiry's next date forward, so nothing goes twice.
export async function runDue(now = new Date()) {
  const result = { followUps: 0, nudges: 0, errors: 0 };
  const businesses = new Map();
  const biz = async (id) => {
    const key = String(id);
    if (!businesses.has(key)) businesses.set(key, await Business.findById(id));
    return businesses.get(key);
  };

  const quoted = await Enquiry.find({
    status: 'quoted',
    'followUps.paused': { $ne: true },
    'followUps.nextAt': { $lte: now },
    'customerReply.text': { $exists: false },
  }).limit(200);
  for (const e of quoted) {
    try {
      await sendFollowUp(e, await biz(e.business));
      result.followUps++;
    } catch (err) {
      result.errors++;
      console.error('[scheduler] follow-up failed', String(e._id), err.message);
    }
  }

  const waiting = await Enquiry.find({ status: 'waiting', nudgeAt: { $lte: now } }).limit(200);
  for (const e of waiting) {
    try {
      await sendNudge(e, await biz(e.business));
      result.nudges++;
    } catch (err) {
      result.errors++;
      console.error('[scheduler] nudge failed', String(e._id), err.message);
    }
  }
  return result;
}

export function startScheduler(everyMs) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const r = await runDue();
      if (r.followUps || r.nudges) console.log(`[scheduler] sent ${r.followUps} check-ins and ${r.nudges} nudges`);
    } catch (err) {
      console.error('[scheduler]', err.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, everyMs);
  timer.unref?.();
  tick();
  return () => clearInterval(timer);
}
