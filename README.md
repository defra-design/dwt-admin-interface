# Waste Management Admin Portal — prototype

A clickable GOV.UK prototype for user research and stakeholder demos, styled
with Defra's "black branding" (department name in place of the crown — see
DEFRA/waste-organisation-frontend PR #116). All backend behaviour is mocked
client-side. **Not production code.**

Built on the [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/docs/)
(v13) wrapping GOV.UK Frontend v6. Version 2 also uses MOJ Frontend for pagination.

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
| `/` | Prototype index — one short card per version, for navigation only |
| `/about-this-service` | About this service (hub) |
| `/versions/v1`, `/versions/v2`, `/versions/v3` | Per-version detail: what changed and why. Version 3 also has a "Design rationale" section |
| `/v3/start` | In-service start page (current working version) |
| `/v3/software-providers` | Software providers list (newest first), or an empty state on first visit |
| `/v3/software-providers/example` | Orphan page: the same list with 4 fictional providers, newest first |
| `/v3/software-providers/add` | Add a software provider: company name, up to 5 email addresses, notes |
| `/v3/software-providers/:id` | Company detail: name and emails (editable), notes (not editable), and the API keys table |
| `/v3/software-providers/:id/change-name` | Change company name |
| `/v3/software-providers/:id/change-emails` | Change email addresses |
| `/v3/software-providers/:id/api-keys/:environment/generate` | Create a Test/Production API key (asks for an application name), or delete-and-regenerate an existing one (no application name field, just a warning and a button naming the consequence) |
| `/v3/software-providers/:id/api-keys/:environment` | The one-time API key reveal, as a confirmation page: the key and a copy button sit inside the green panel, then a checkbox that must be ticked before "Close" returns to the detail page |
| `/v3/software-providers/:id/api-keys/:environment/change-application-name` | Change the application name recorded against a key, without changing the secret |
| `/v3/software-providers/:id/api-keys/:environment/delete` | Confirm and delete an API key, resetting that environment back to empty |
| `/v3/regulators` | Waste organisations report (unchanged from version 2) |
| `/v2/start` | In-service start page (previous version) |
| `/v2/service-metrics` | Date input → metrics table |
| `/v2/software-providers` | PAT Submission Viewer: search by Submission ID |
| `/v2/software-providers/pat-viewer/submission/:id` | Submission detail: per-scenario Pass/Fail/Not submitted results |
| `/v2/regulators` | Waste organisations report: period filter → table (name, registered date, active API codes, payment status, payment period) |
| `/v2/waste-organisations` | Dead link → "Not built in this prototype" |
| `/v1/…` | Frozen copy of the same journeys |

## Version 3

Version 3 is a partial copy of version 2: the start page and the waste
organisations report are unchanged, Service metrics and the PAT Submission
Viewer are gone, and Software providers is a new list-plus-add journey
(`app/views/v3/`, `layouts/v3.html`, `registerV3Routes()` in `app/routes.js`).

- **Software providers are session data**, not seed data
  (`app/data/software-providers.js`, stored on
  `req.session.data.softwareProviders`). Every participant starts with an empty
  list, and "Clear data" in the footer resets it between sessions. Test and
  production client IDs are UUIDs generated on save.
- **`/v3/software-providers/example`** is an orphan page for demos: nothing in
  the service links to it, only the prototype index and `/versions/v3`. It
  renders the *same view* as the real list with the fixed `exampleProviders`
  data, so the two cannot drift apart. The journey from "View prototype" still
  starts on the empty state. The 4 company names are fictional. Company names
  link to the same detail page as the live list (`/v3/software-providers/:id`).
- **The list is newest first.** After a save there is no success banner — the new
  row at the top with today's date is the confirmation. See `/versions/v3`
  (Design rationale) for the GDS / departmental evidence.
- **Company detail** is a summary list plus an MOJ timeline for notes. Change
  links go to one-question pages. Notes have no Change link.
- **Email addresses use the MOJ "Add another" component**, built as HTML rather
  than via `mojAddAnother` and *without* `data-module="moj-add-another"`. Adding
  and removing fields happens on the server — the no-JavaScript baseline MOJ
  describes — so the maximum of 5 can be enforced with the standard GOV.UK error
  summary and error message instead of silently in the browser. The newly added
  field is given focus on re-render; after a removal, focus goes to the "Add
  another email address" button.
- **Email validation messages** live in `validate()` in
  `app/data/software-providers.js`. Errors sit on the individual field, not the
  group, and name it ("Enter email address 2 or remove the empty field") so each
  message still makes sense in the error summary. The exception is the
  5-address maximum, which has no single field at fault and so sits on the group
  with the summary linking to the "Add another email address" button.
- **Notes are append-only.** Each note is stored with the date and time it was
  added and is never edited. Nothing displays them yet — a software provider
  detail page would be the place for that.
- **API keys** (`app/data/software-providers.js`, "API keys" section) are a
  Test and a Production secret per provider, kept apart from the existing
  client IDs: client IDs are generated at provider creation but no longer
  shown anywhere (the list page's two ID columns were removed once the API
  keys table replaced them as the operationally useful view); API keys
  authenticate requests, are secret, and are generated on demand from the
  detail page's "API keys" table — modelled on how GOV.UK Notify's own API
  keys work.
  - **Each table action sits in the column it changes**, on its own line
    below the value — "Change" under the application name, "Rotate" under
    the key — rather than in a shared "Actions" column, the same "act where
    the value is" logic as GOV.UK's summary list Change links. The Actions
    column holds whichever single action applies to the row as a whole:
    "Create" before a key exists, "Delete API key" (with its own
    confirmation page) once one does.
  - **"Create" and the key-regenerating half of "Rotate"/"Delete" share one
    route** (`/api-keys/:environment/generate`), but are two different
    pages: creating asks for an application name (there isn't one yet);
    regenerating does not (the name isn't changing) and instead shows a
    warning and a button naming the consequence — "Delete current key and
    generate new API key" — rather than a generic "Continue".
  - **The generated key is shown exactly once**, on `/api-keys/:environment`,
    built as a GOV.UK confirmation page: the key and its copy button sit
    inside the green panel (the one thing to walk away with, in place of a
    reference number), a `govukWarningText` below it says it won't be shown
    again, and a single checkbox — "I confirm that I have copied or saved
    this API key" — must be ticked before "Close" is accepted. This is the
    WCAG technique for a one-time, unrecoverable value (G155). A `revealed`
    flag is set once closed, so a bookmark or back-button press on that URL
    cannot show the secret again — it redirects to the detail page instead.
  - **The table only ever shows the last 4 characters** of a created key.
    The full value exists only in session data and on the one-time reveal
    page.
  - **Checkbox gotcha**: the kit's own `auto-store-data.js` (loaded on every
    page, for its session-data feature) appends a hidden `_unchecked` input
    with the same `name` to every form on submit, so a ticked checkbox
    arrives in `req.body` as an array (`['true', '_unchecked']`), not the
    string `'true'`. `sp.isCheckboxTicked()` handles both shapes — a plain
    `=== 'true'` check will always fail. Anywhere else a lone checkbox
    gates a submit button, use the same helper.
- Caveat of the server-side add/remove: pressing Enter inside a text field
  triggers the first submit button in the form, which is "Add another email
  address" rather than "Save". The real MOJ component behaves the same way; the
  result is a spare blank field, which the user can remove.

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
