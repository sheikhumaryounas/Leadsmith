import { useState } from 'react';
import { api } from '../lib/api.js';
import { useApp } from '../lib/app-context.jsx';
import { Modal } from './ui.jsx';

const EMPTY = { name: '', email: '', phone: '', town: '', postcode: '', job: '', channel: 'Phone note', message: '' };

export function NewEnquiryModal({ onClose, onCreated }) {
  const { toast } = useApp();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim() || !f.job.trim()) return setError('Add the customer’s name and what the job is.');
    setBusy(true);
    setError('');
    try {
      const { enquiry } = await api.post('/enquiries', f);
      toast(`Enquiry from ${enquiry.name} added. ${enquiry.status === 'needs_info' ? 'Reply drafted.' : 'Ready to price.'}`);
      onCreated(enquiry);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Add an enquiry"
      icon="plus"
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-accent" form="new-enquiry" type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add enquiry'}</button>
      </>}
    >
      <form className="form" id="new-enquiry" onSubmit={submit}>
        <p className="muted" style={{ margin: 0 }}>Type it the way the customer said it. Leadsmith picks out what it can and drafts the questions for the rest.</p>
        <div className="two-f">
          <div><label htmlFor="ne-name">Customer name</label><input id="ne-name" value={f.name} onChange={set('name')} maxLength={120} required /></div>
          <div><label htmlFor="ne-job">Job</label><input id="ne-job" value={f.job} onChange={set('job')} maxLength={120} placeholder="e.g. Driveway gates" required /></div>
        </div>
        <div className="two-f">
          <div><label htmlFor="ne-email">Email</label><input id="ne-email" type="email" value={f.email} onChange={set('email')} maxLength={200} /></div>
          <div><label htmlFor="ne-phone">Phone</label><input id="ne-phone" type="tel" value={f.phone} onChange={set('phone')} maxLength={40} /></div>
        </div>
        <div className="two-f">
          <div><label htmlFor="ne-town">Town</label><input id="ne-town" value={f.town} onChange={set('town')} maxLength={80} /></div>
          <div><label htmlFor="ne-ch">Came in by</label>
            <select id="ne-ch" value={f.channel} onChange={set('channel')}>
              <option>Phone note</option><option>Email</option><option>Website form</option><option>WhatsApp</option>
            </select>
          </div>
        </div>
        <div><label htmlFor="ne-msg">What they said</label><textarea id="ne-msg" value={f.message} onChange={set('message')} maxLength={5000} placeholder="e.g. Wants a pair of gates, about 5ft tall, black." /></div>
        {error && <div className="err">{error}</div>}
      </form>
    </Modal>
  );
}
