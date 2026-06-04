# Digital Waste Tracking Admin Service — prototype

A clickable, unbranded GOV.UK prototype for user research and stakeholder demos.
All backend behaviour is mocked client-side. **Not production code.**

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
| `/software-providers` | Section landing with side navigation |
| `/software-providers/review-pat` | PAT review (scenarios, report) |
| `/regulators` | Regulators section: Key metrics dashboard |
| `/regulators/not-reporting` | Registered orgs with no receipt in the period |
| `/regulators/reporting` | Registered orgs reporting, + movements by waste code |
| `/regulators/organisation` | Find an organisation → detail (movement receipts) |
| `/waste-organisations` | Dead link → "Not built in this prototype" |
| `/software-providers/manage-credentials` | Dead link → "Not built in this prototype" |

## Architecture notes

- **Unbranded layout** (`app/views/layouts/main.html`): extends the kit's
  unbranded layout (no GOV.UK crown / wordmark / black masthead), then adds a
  simple Defra-green service-name header and a GOV.UK Service navigation bar.
- **Defra theming** (`app/assets/sass/application.scss`): the rebrand's CSS
  custom properties (`--govuk-brand-colour`, `--govuk-link-colour`, …) are
  overridden at `:root` to Defra greens; focus yellow and semantic tags are left
  as GOV.UK defaults.
- **Side navigation** is hand-rolled from `govuk-list` + CSS, because core
  GOV.UK Frontend ships no side-nav component.
- **Dates** are validated server-side (`app/routes.js`) using the GOV.UK "Dates"
  pattern; shared helpers in `app/data/dates.js` (`validateDateParts`,
  `parsePeriod`) back both Service Metrics and the Regulators period filters.
- **Regulators reporting** derives every metric and report from one deterministic,
  seeded mock dataset (`app/data/regulators-data.js`): 287 organisations (matching
  the Service Metrics "287 registered receivers") + ~2,300 movement receipts with
  EWC waste codes. Replace that module with real queries to integrate.
- **Export:** results tables have a "Download CSV" button, client-side in
  `app/assets/javascripts/application.js`.
- **PAT review** assessment is client-side. The integration seam is
  `assessScenario()` in `app/assets/javascripts/application.js` — replace it with
  real sandbox API calls.
- **Scenario seed data** is in `app/data/pat-scenarios.js` (note: R06 is
  deliberately absent; C01 and H02 are non-submitted error scenarios).

## How the brief's open decisions were resolved

Search the codebase for `TODO` to find each of these in context.

1. **Build tool** — GOV.UK Prototype Kit (as recommended).
2. **Service name** — "Waste Tracking Service" (`app/config.json`).
3. **Metric value vs date** — 287 is static regardless of date. `TODO` in
   `routes.js` to confirm whether it should vary.
4. **"Check each scenario"** — scope is inferred from a populated WT ID (brief
   option b). `TODO` in `review-pat.html` for the per-row checkbox alternative.
5. **R06 omission** — treated as intentional; not inserted.
6. **"Error: Invalid Scenario ID"** — no screenshot was provided. Implemented as:
   first submitted row → Error "Scenario ID not recognised", rest pass
   ("11 passed / 1 error"). `TODO` in `application.js` to confirm.
7. **WT ID format** — aligned to the Digital Waste Tracking Receipt API
   `wasteTrackingId` (8-character alphanumeric, e.g. `25HRA0B2`); see
   `WT_ID_PATTERN` in `application.js`.

## Alignment with the Receipt API

The prototype's fake data shapes mirror the [Digital Waste Tracking Receipt
API](https://defra.github.io/waste-tracking-service/production/apiSpecifications/)
where they overlap, but **no live API calls are made**:

- **PAT review** scenarios map to `POST /movements/receive`; the Waste Tracking
  ID uses the API's `wasteTrackingId` format (`25HRA0B2`).
- **EWC codes** (`app/data/regulators-data.js`) follow the
  `GET /reference-data/ewc-codes` shape (6-digit `code`, `isHazardous`).
- **Regulators reporting** and **Service Metrics** have **no** endpoints in this
  API (it is a receiver-submission + reference-data API, not a regulator
  reporting one); they remain mocked prototype-only features.

## Out of scope (intentionally not built)

Waste Organisations, Manage credentials (both dead links), the "Add post-it"
feedback button, and any real backend/API calls.
