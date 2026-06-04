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
| `/service-metrics` | Date input → metrics table, with "Copy" (TSV) |
| `/software-providers` | Section landing with side navigation |
| `/software-providers/review-pat` | PAT review (scenarios, report) |
| `/waste-organisations` | Dead link → "Not built in this prototype" |
| `/software-providers/manage-credentials` | Dead link → "Not built in this prototype" |

## Architecture notes

- **Unbranded layout** (`app/views/layouts/main.html`): extends the kit's
  unbranded layout (no GOV.UK crown / wordmark / black masthead), then adds a
  simple service-name header, a GOV.UK Service navigation bar, and the standard
  "Prototype" phase banner.
- **Side navigation** is hand-rolled from `govuk-list` + CSS
  (`app/assets/sass/application.scss`), because core GOV.UK Frontend ships no
  side-nav component.
- **Service metrics** date validation is server-side (`app/routes.js`) using the
  GOV.UK "Dates" pattern (error summary + field error).
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
7. **WT ID format** — free text; the not-found mode flags anything not matching
   `^WT\d+$`. `TODO` (the `WT_ID_PATTERN` constant) to replace with the canonical
   format once known.

## Out of scope (intentionally not built)

Waste Organisations, Manage credentials (both dead links), the "Add post-it"
feedback button, and any real backend/API calls.
