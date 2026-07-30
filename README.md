# Waste Management Admin Portal — prototype

A clickable GOV.UK prototype for user research and stakeholder demos, styled
with Defra's "black branding" (department name in place of the crown — see
DEFRA/waste-organisation-frontend PR #116). All backend behaviour is mocked
client-side. **Not production code.**

Built on the [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/docs/)
(v13) wrapping GOV.UK Frontend v6. Pure GOV.UK Frontend — no MOJ Frontend.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

> Requires Node.js 20+ (developed on Node 22). `node_modules` is not included —
> `npm install` regenerates it from `package-lock.json`.

## Distribution

**As a source bundle (run locally):** unzip, then `npm install && npm run dev`.

**Hosting (clickable link, no install):** any Node host works. A `Procfile`
(`web: npm start`) is included for Heroku-style platforms. To stop the hosted
prototype being publicly accessible, set these environment variables on the host:

- `NODE_ENV=production`
- `PASSWORD=<a shared password>` — the kit then prompts for it before showing any page.

## Pages

| Path | What it is |
|---|---|
| `/` | Homepage (service name + placeholder copy) |
| `/service-metrics` | Date input → metrics table |
| `/software-providers` | PAT Submission Viewer: search by Submission ID |
| `/software-providers/pat-viewer/submission/:id` | Submission detail: per-scenario Pass/Fail/Not submitted results |
| `/regulators` | Waste organisations report: period filter → table (name, registered date, active API codes, payment status, payment period) |
| `/waste-organisations` | Dead link → "Not built in this prototype" |

## Architecture notes

- **Branded layout** (`app/views/layouts/main.html`): extends the kit's
  *branded* layout (`govuk-branded.njk`), then overrides the header block with
  Defra's "black branding" — classic GOV.UK black background, the department
  name in place of the crown, and a blue band underneath. GDS Transport isn't
  licensed on CDP, so the whole template is forced to Arial
  (`app/assets/sass/application.scss`) to match the real service. The content
  container is widened to 1200px (this is an admin tool with wide tables).
  There is no side navigation — the GOV.UK Service Navigation bar (two items:
  Software Providers, Reporting) is the only nav.
- **Styling** (`app/assets/sass/application.scss`): visited links keep the
  same colour as unvisited (like GOV.UK breadcrumbs, no purple state); the
  footer's left-hand crown is hidden (the Defra crest sits on the right).
- **Dates** are validated server-side (`app/routes.js`) using the GOV.UK "Dates"
  pattern; shared helpers in `app/data/dates.js` (`validateDateParts`,
  `parseDateInput`, `defaultPeriod`) back the Service Metrics date input and the
  Regulators period filter. The period filter itself is lenient (no
  validation errors — always produces a result) and submits via `GET` so
  results are bookmarkable.
- **Regulators reporting** (`app/data/regulators-data.js`) is one deterministic,
  seeded mock dataset of 293 organisations, sorted by registration date: each
  has a registered date, an active API code count, a payment status
  (paid/unpaid/in progress), a payment period (Oct–Sep cycle, e.g. `Oct 25 –
  Sep 26`), and an organisation name — which is only ever "not known" for
  organisations registered before 27 Apr 2026. Replace this module with real
  queries to integrate.
- **Export:** the "Download CSV" button on the Regulators report is a
  non-functional placeholder — no export actually happens.
- **PAT Submission Viewer**: browses pre-seeded submission results (there is
  no live PAT assessment/scoring logic). Seed data — including the canonical
  14 scenario IDs (R06 is deliberately absent) — is in
  `app/data/pat-submissions.js`. `app/assets/javascripts/application.js`
  provides a "copy failed scenarios" clipboard helper. Every seed page also
  renders a grey "test data crib sheet" (`_id-cribsheet.html`) below the
  footer, listing Submission IDs to try.

## Alignment with the Receipt API

The PAT Submission Viewer's seed data shapes loosely mirror the [Digital Waste
Tracking Receipt API](https://defra.github.io/waste-tracking-service/production/apiSpecifications/)
(e.g. `wasteTrackingId`-style IDs, the canonical scenario set), but **no live
API calls are made** — this is a prototype browsing fixed mock data.
Regulators reporting and Service Metrics have no endpoints in this API (it is
a receiver-submission + reference-data API, not a regulator-reporting one);
they remain mocked prototype-only features.

## Known open items

- `routes.js`: the Service Metrics "287 registered receivers" value is
  mocked and static regardless of the date entered — `TODO` to confirm
  whether it should vary.

## Out of scope (intentionally not built)

Waste Organisations (dead link), the "Add post-it" feedback button, and any
real backend/API calls.
