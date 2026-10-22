# Leadsmith frontend

The React app on its own (Vite + React).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

The app talks to the Leadsmith API through `/api`. By default it expects the API on `http://localhost:4000`.
To use a different API, copy `.env.example` to `.env` and change `API_URL`.

Without the API running, the pages open but login and data will not load.

Demo login (when the API is running with the demo data):
- Email: `dave@ridgewayfab.co.uk`
- Password: `leadsmith-demo`

## Build

```bash
npm run build      # outputs dist/
npm run preview    # serves dist/ on http://localhost:4173
```
