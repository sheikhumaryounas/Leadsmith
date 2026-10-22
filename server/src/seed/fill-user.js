// Adds sample enquiries and jobs to an existing account so you can try every screen.
// Usage: npm run seed:user -- someone@example.com
// While the dev server is running, point MONGODB_URI at its database (see README).
import { connectDb, disconnectDb } from '../db.js';
import { User } from '../models/User.js';
import { Business } from '../models/Business.js';
import { Enquiry } from '../models/Enquiry.js';
import { Job } from '../models/Job.js';
import { fillDemoData } from './demo.js';

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Give the account email: npm run seed:user -- someone@example.com');
  process.exit(1);
}

await connectDb();
try {
  const user = await User.findOne({ email });
  if (!user) throw new Error(`No account with the email ${email}.`);
  const b = await Business.findById(user.business);
  if (await Enquiry.exists({ business: b._id, name: 'Sarah Whitfield', email: 's.whitfield@example.com' }))
    throw new Error(`${b.name} already has the sample data.`);
  await fillDemoData(b);
  const [enquiries, jobs] = await Promise.all([Enquiry.countDocuments({ business: b._id }), Job.countDocuments({ business: b._id })]);
  console.log(`[seed] Sample data added to "${b.name}" (${email}): ${enquiries} enquiries, ${jobs} jobs.`);
} catch (err) {
  console.error(`[seed] ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
