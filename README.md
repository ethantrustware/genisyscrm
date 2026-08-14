# Genisys CRM — Frontend

A Vite + React frontend for the Genisys Hub, built so it can be previewed and
edited visually in **Lovable** while the real backend keeps running on Render.

It is a **frontend only**. There is no database and no business logic here —
every number on screen comes from the Hub's read-only external API.

## Two modes

| Mode | When | What you see |
|---|---|---|
| **Demo** (default) | No token entered | Realistic mock data. This is what Lovable's preview shows. No credentials needed. |
| **Live** | Token entered on the Connect screen | Real data from the Hub on Render. |

Design and iterate in Demo mode — it needs nothing and risks nothing. Switch to
Live only when you want to see real numbers.

## Connecting to the Hub

1. In the Hub: **Settings → API Tokens** → create a token (admin only).
2. Copy it — it is shown exactly once.
3. In this app: **Connect** → paste the Hub URL + token → **Connect**.

The token is stored in your browser's localStorage. It is deliberately **not**
read from an env var and **not** committed — this repo is public and Lovable
previews are shareable, so a bundled token would be a published credential.

## What this app can and can't do

- Reads a curated, **read-only** API surface (`/api/external/v1`).
- Cannot charge a card, send an SMS, dispatch an appointment, or delete
  anything. Those endpoints are not exposed to it.
- Customer phone numbers and emails arrive **already masked** from the Hub.

## Design system

Tokens in `src/index.css` are copied verbatim from the Hub's `globals.css` so
the two apps look like one product. Tailwind v4, CSS-first — there is no
`tailwind.config` file; utility names come from the `@theme inline` block.

Two things worth knowing before restyling:

- `--radius` is `0.875rem`, so `rounded-xl` is **18px**, not Tailwind's stock
  12px. This is load-bearing for matching the Hub.
- Dark mode is **class-based** (`.dark` on `<html>`), not `prefers-color-scheme`.
  `index.html` applies it before first paint to avoid a flash.

If you restyle a shared primitive, change it in the Hub too — they are meant to
stay in sync.

## Local development

```bash
npm install
npm run dev     # http://localhost:8080
npm run build   # typecheck + production build
```

## Layout

```
src/
  lib/api.ts        API client, types, and the mock dataset
  lib/utils.ts      cn() — same as the Hub's
  components/ui.tsx UI primitives ported class-for-class from the Hub
  components/shell.tsx  Sidebar + app shell
  pages/            Dashboard, Clients, Appointments, Connect
```

## Related

- **Hub (backend + full CRM):** https://github.com/nxrth007/Genisys-Hub — Next.js
  on Render. This is where all the real work happens.
- The previous Lovable prototype that lived on this repo is preserved on the
  `lovable-prototype-archive` branch and the `lovable-prototype-2026-04-30` tag.
