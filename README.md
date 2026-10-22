# Leadsmith

Turns enquiries into won jobs for small fabrication businesses: drafted replies, quotes with PDF, automatic check-ins, jobs, deposits and invoices.

Built with **MongoDB, Express, React and Node** (MERN).

## Run it

You need Node 20 or newer. MongoDB is optional in development.

```bash
npm run setup     # installs everything (root, server, client)
npm run dev       # API on http://localhost:4000, app on http://localhost:5173
```

Open http://localhost:5173 and log in with the demo account:

- Email: `dave@ridgewayfab.co.uk`
- Password: `leadsmith-demo`

On first run without `MONGODB_URI`, the API starts a local MongoDB that stores its data in `server/.data` and loads the Ridgeway Fabrication demo. To reset the demo, stop `npm run dev` and run `npm run seed`.

## Tests

```bash
npm test
```

- `server/test`: the API against a throwaway database. Covers sign-up, the full enquiry flow, PDFs, the scheduler, the website form, roles and data isolation.
- `client/test`: the real React app driven against the real API. Logs in, opens every screen, quotes one enquiry and chases another.

## Settings (`server/.env`)

Copy `server/.env.example` to `server/.env`.

| Variable | What it does |
|---|---|
| `MONGODB_URI` | Your MongoDB or Atlas connection string. Empty in development = local database. **Required in production.** |
| `JWT_SECRET` | Long random string that signs login cookies. **Required in production.** |
| `CLIENT_ORIGIN`, `APP_URL` | Where the app runs. Used for CORS and links in invite emails. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Outgoing email. Without `SMTP_HOST`, emails are not delivered; they show in **Settings › Your data › Sent emails**. |
| `SCHEDULER_MS` | How often check-ins and nudges are sent. Default 60000 (1 minute). |

## Production

```bash
npm run build                          # builds client/dist
NODE_ENV=production npm start          # serves the API and the built app on PORT
```

## How it's organised

```
server/src
  models/      Business, User, Invite, Enquiry, Job, Outbox (sent emails)
  services/    extract (reads messages), templates (every email), enquiries (the flow),
               pdf (quotes, invoices), scheduler (check-ins, nudges), stats (dashboard, report)
  routes/      auth, enquiries, jobs, dashboard, settings, public (website form)
  seed/        the Ridgeway demo account
client/src
  pages/       Dashboard, Today, Enquiries, EnquiryDetail, Quotes (and Follow-ups), Jobs, Report, Settings, Auth
  components/  Layout (sidebar), EnquiryTable, NewEnquiryModal, shared UI
  lib/         api, formatting, status labels, icons, hooks
```

Money is stored in pence everywhere.

## The enquiry flow

1. **New enquiry**: added by hand, or posted by the website form. Leadsmith picks out sizes, finish and quantity, lists what is missing, and drafts a reply.
2. **Needs your OK**: you approve, edit or change the tone. Nothing goes out without your OK.
3. **Waiting on customer**: a nudge goes out after the time you set. When they reply, you add their answers.
4. **Ready to price**: you set the price. The quote email goes with a PDF.
5. **Quote sent**: check-ins go out on day 3, 7 and 14 (you can change these). They stop when the customer replies.
6. **Won**: a job is created with its deposit. Then deposit paid, fitted, paid in full, and the invoice PDF. Or **lost** with a reason, which you can reopen.

## Website form

Settings › Inbox and website form gives you an address and a ready-made HTML form. It accepts JSON or a normal form post. A plain form post gets a thank-you page.

```
POST /api/public/forms/<form key>
name, email, phone, town, postcode, job, message
```

## Team roles

- **Owner**: everything.
- **Office**: everything except the team.
- **Workshop**: job sheets only.

## Not built yet

- Reading replies straight from the inbox (Gmail/IMAP). For now, replies are added in the app.
- AI reading of messages. Extraction is rule-based.
- Photo uploads.
- SMS and WhatsApp sending.
- Online payments.
- Alert emails to you (customer replied, job won, morning summary, weekly report). The switches are saved, but nothing sends them yet.
