//
// Client-side behaviour for the Waste Tracking Service prototype.
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  initCopyTableButtons()
  initPatReview()
})

// ---------------------------------------------------------------------------
// Copy a table to the clipboard as tab-separated values (brief §4).
// One row per line, cells separated by tabs, so a single paste lands in
// discrete spreadsheet cells.
// ---------------------------------------------------------------------------

function tableToTsv (table) {
  return Array.from(table.querySelectorAll('tr'))
    .map((row) =>
      Array.from(row.querySelectorAll('th, td'))
        .map((cell) => cell.textContent.trim())
        .join('\t')
    )
    .join('\n')
}

function copyText (text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback for older browsers / insecure contexts.
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'absolute'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  try {
    document.execCommand('copy')
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(err)
  } finally {
    document.body.removeChild(area)
  }
}

function flashStatus (button, message) {
  const status = button.parentNode.querySelector('.app-copy-status')
  if (status) {
    status.textContent = message
    window.setTimeout(() => { status.textContent = '' }, 4000)
  }
}

function initCopyTableButtons () {
  document.querySelectorAll('[data-copy-table]').forEach((button) => {
    button.addEventListener('click', () => {
      const table = document.querySelector(button.getAttribute('data-copy-table'))
      if (!table) return
      copyText(tableToTsv(table))
        .then(() => flashStatus(button, 'Copied'))
        .catch(() => flashStatus(button, 'Could not copy'))
    })
  })
}

// ---------------------------------------------------------------------------
// Review PAT submission (brief §6).
// ---------------------------------------------------------------------------

// WT ID format. TODO (brief §6.6): replace with the canonical Waste Tracking
// ID format once it is known.
const WT_ID_PATTERN = /^WT\d+$/

// Fail reasons keyed by scenario ID. The first six are verbatim from the
// screenshots (brief §6.5); the rest are authored in the same register for the
// "All fail" mode.
const FAIL_REASONS = {
  R01: 'Expected a single waste item but none was recorded.',
  R02: 'Expected multiple waste items but only one was found.',
  R03: "Means of transport 'Road' was missing from the receipt.",
  R04: 'Disposal or Recovery codes were present but should have been omitted.',
  R05: 'Multiple Disposal or Recovery codes were expected but only one was found.',
  R07: 'Only a single EWC code was found; dual EWC codes expected.',
  C02: 'Carrier registration number was absent and no reason was supplied.',
  B01: 'Broker / Dealer details were absent or incomplete.',
  P01: 'POPs waste components were missing or incomplete.',
  H01: 'Hazardous waste components were missing or malformed.',
  H03: 'Consignment Note Code was missing and no reason was supplied.',
  X01: 'Hazardous and POPs classification was not correctly applied.'
}

// Scenario IDs that PASS in "Partial" mode (strict alternation starting with
// Pass across the 12 submitted rows). Everything else fails. (brief §6.5)
const PARTIAL_PASS = ['R01', 'R03', 'R05', 'C02', 'P01', 'H03']

//
// The integration seam. In production this would be replaced with real calls to
// the sandbox API for each submitted scenario. Here it is mocked per the active
// Simulate mode. (brief §6.4 / §6.5)
//
// Returns { result: 'Pass'|'Fail'|'Error', reason: string }.
//
function assessScenario (scenario, mode, context) {
  switch (mode) {
    case 'all-pass':
      return { result: 'Pass', reason: '—' }

    case 'all-fail':
      return { result: 'Fail', reason: FAIL_REASONS[scenario.id] || 'Scenario did not pass assessment.' }

    case 'partial':
      return PARTIAL_PASS.indexOf(scenario.id) !== -1
        ? { result: 'Pass', reason: '—' }
        : { result: 'Fail', reason: FAIL_REASONS[scenario.id] || 'Scenario did not pass assessment.' }

    case 'error-wt-not-found':
      // Any WT ID that does not match the expected format is "not found".
      // For the demo, if nothing is genuinely malformed, flag the first
      // submitted row so the response shape is always visible. (brief §6.5)
      if (!WT_ID_PATTERN.test(scenario.wtId) ||
          (context.noneInvalid && scenario.id === context.firstId)) {
        return { result: 'Error', reason: 'Waste Tracking ID not found' }
      }
      return { result: 'Pass', reason: '—' }

    case 'error-scenario-id':
      // OPEN (brief §6.5): no screenshot was provided. Proposed behaviour —
      // one submitted row returns an error, the rest pass.
      // TODO: confirm intended behaviour and which row.
      if (scenario.id === context.firstId) {
        return { result: 'Error', reason: 'Scenario ID not recognised' }
      }
      return { result: 'Pass', reason: '—' }

    default:
      return { result: 'Pass', reason: '—' }
  }
}

function initPatReview () {
  const form = document.querySelector('[data-module="app-pat-review"]')
  if (!form) return

  const reportContainer = document.getElementById('review-report')

  // The mocked assessment always runs in "partial" mode. The prototype's
  // SIMULATE controls (which let a reviewer switch response shapes) have been
  // removed; assessScenario() still supports the other modes if needed.
  const mode = 'partial'

  // Collect the in-scope rows: enabled WT ID input with a value. (brief §6.1)
  function getSubmittedScenarios () {
    return Array.from(form.querySelectorAll('[data-scenario-row]'))
      .map((row) => {
        const input = row.querySelector('[data-wt-input]')
        return {
          id: row.getAttribute('data-id'),
          description: row.children[1].textContent.trim(),
          wtId: input.value.trim(),
          disabled: input.disabled
        }
      })
      .filter((s) => !s.disabled && s.wtId !== '')
  }

  // Run Review
  form.querySelector('[data-action="run"]').addEventListener('click', () => {
    const submitted = getSubmittedScenarios()
    const noneInvalid = submitted.every((s) => WT_ID_PATTERN.test(s.wtId))
    const context = { noneInvalid, firstId: submitted.length ? submitted[0].id : null }

    const rows = submitted.map((s) => Object.assign({}, s, assessScenario(s, mode, context)))
    renderReport(reportContainer, rows)
  })

  // Clear all — reset WT ID inputs and remove the report. (brief §6.3)
  form.querySelector('[data-action="clear"]').addEventListener('click', () => {
    form.querySelectorAll('[data-wt-input]').forEach((input) => {
      if (!input.disabled) input.value = ''
    })
    reportContainer.innerHTML = ''
  })
}

function tagClass (result) {
  if (result === 'Pass') return 'govuk-tag--green'
  if (result === 'Fail') return 'govuk-tag--red'
  return 'govuk-tag--yellow'
}

function escapeHtml (value) {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

function renderReport (container, rows) {
  const passed = rows.filter((r) => r.result === 'Pass').length
  const failed = rows.filter((r) => r.result === 'Fail').length
  const errored = rows.filter((r) => r.result === 'Error').length

  const summaryParts = [`${passed} passed`]
  if (failed) summaryParts.push(`${failed} failed`)
  if (errored) summaryParts.push(`${errored} error`)
  const summaryLine = `${summaryParts.join(' / ')} of ${rows.length} submitted`

  const bodyRows = rows.map((r) => {
    const tinted = r.result !== 'Pass'
    return `
      <tr class="govuk-table__row${tinted ? ' app-table__row--tinted' : ''}">
        <th scope="row" class="govuk-table__header">${escapeHtml(r.id)}</th>
        <td class="govuk-table__cell">${escapeHtml(r.description)}</td>
        <td class="govuk-table__cell">${escapeHtml(r.wtId)}</td>
        <td class="govuk-table__cell"><strong class="govuk-tag ${tagClass(r.result)}">${r.result}</strong></td>
        <td class="govuk-table__cell">${escapeHtml(r.reason)}</td>
      </tr>`
  }).join('')

  container.innerHTML = `
    <h2 class="govuk-heading-m">Review Report</h2>

    <div class="govuk-inset-text">
      Results are mocked. The <code>assessScenario()</code> function in
      <code>application.js</code> should be replaced with real calls to the
      sandbox API.
    </div>

    <p class="govuk-body govuk-!-font-weight-bold">${summaryLine}</p>
    ${govukButtonHtml('Copy results', { 'data-copy-table': '#review-report-table' })}
    <span class="app-copy-status govuk-body" role="status" aria-live="polite"></span>

    <table class="govuk-table" id="review-report-table">
      <thead class="govuk-table__head">
        <tr class="govuk-table__row">
          <th scope="col" class="govuk-table__header">Scenario</th>
          <th scope="col" class="govuk-table__header">Description</th>
          <th scope="col" class="govuk-table__header">WT ID submitted</th>
          <th scope="col" class="govuk-table__header">Result</th>
          <th scope="col" class="govuk-table__header">Reason</th>
        </tr>
      </thead>
      <tbody class="govuk-table__body">
        ${bodyRows}
      </tbody>
    </table>`

  // Wire up the newly-rendered "Copy results" button.
  initCopyTableButtons()
}

function govukButtonHtml (text, attrs) {
  const attrString = Object.keys(attrs)
    .map((k) => `${k}="${attrs[k]}"`)
    .join(' ')
  return `<button type="button" class="govuk-button govuk-button--secondary" data-module="govuk-button" ${attrString}>${text}</button>`
}
