//
// Routes for the Waste Tracking Service prototype.
// See: https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const patSubmissions = require('./data/pat-submissions')
const reg = require('./data/regulators-data')
const {
  formatDateObj,
  formatDateShortObj,
  validateDateParts,
  parseDateInput,
  defaultPeriod
} = require('./data/dates')

// --- Service metrics -------------------------------------------------------

// GET: show the form with today's date pre-filled (build brief §4).
router.get('/service-metrics', (req, res) => {
  const today = new Date()
  res.render('service-metrics', {
    dateValues: {
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: today.getFullYear()
    }
  })
})

// POST: validate the date (GOV.UK "Dates" pattern), then render the metrics.
router.post('/service-metrics', (req, res) => {
  const dateValues = {
    day: (req.body['metrics-date-day'] || '').trim(),
    month: (req.body['metrics-date-month'] || '').trim(),
    year: (req.body['metrics-date-year'] || '').trim()
  }

  const { error, date } = validateDateParts(dateValues.day, dateValues.month, dateValues.year)

  if (error) {
    return res.render('service-metrics', {
      errors: { date: error },
      errorList: [{ text: error, href: '#metrics-date-day' }],
      dateValues
    })
  }

  res.render('service-metrics', {
    dateValues,
    asAtDate: formatDateObj(date),
    // TODO: value is mocked and static regardless of date (brief §9.3).
    metrics: [
      { name: 'Waste Organisations Registered as Receivers', value: '287' }
    ]
  })
})

// --- Regulators reporting --------------------------------------------------

function periodLabel (period) {
  return `${formatDateObj(period.from)} to ${formatDateObj(period.to)}`
}

// Lenient period parse — no validation. Uses whatever dates parse; falls back
// to the default period for any missing/unparseable part, and swaps a reversed
// range, so "Show organisations" always produces a figure (never an error).
function lenientPeriod (query) {
  const d = defaultPeriod()
  const f = parseDateInput(query, 'period-from')
  const t = parseDateInput(query, 'period-to')
  let from = f.date || d.from
  let to = t.date || d.to
  if (from > to) { const tmp = from; from = to; to = tmp }
  const keep = (v, fallback) => (v.day && v.month && v.year) ? v : fallback
  return {
    from,
    to,
    values: { from: keep(f.values, d.values.from), to: keep(t.values, d.values.to) }
  }
}

// Waste organisations registered within the period. Uses GET so the period is
// in the URL and the results can be bookmarked/shared. No query params = an
// initial visit (default dates, no results); any params = a submission. No
// validation.
router.get('/regulators', (req, res) => {
  const submitted = Object.prototype.hasOwnProperty.call(req.query, 'period-from-day')
  if (!submitted) {
    const d = defaultPeriod()
    return res.render('regulators/index', { period: { from: d.from, to: d.to, values: d.values, errors: {} } })
  }
  const period = lenientPeriod(req.query)
  const rows = reg.listRegisteredInPeriod(period.from, period.to).map((o) => ({
    registered: formatDateShortObj(o.registeredDate),
    id: o.id,
    idShort: o.id.split('-').slice(0, 2).join('-') + '…', // truncate at 2nd hyphen
    apiCodeCount: o.apiCodeCount,
    organisationName: o.organisationName,
    paymentStatus: o.paymentStatus,
    paymentPeriod: o.paymentPeriod || ''
  }))
  res.render('regulators/index', {
    period,
    rows,
    count: rows.length,
    periodLabel: periodLabel(period)
  })
})

// --- Dead links / not-built placeholders (build brief §8) -------------------

router.get('/waste-organisations', (req, res) => {
  res.render('placeholder', {
    heading: 'Waste Organisations',
    activeSection: 'organisations',
    tools: ['Manage service charge']
  })
})

// --- PAT Submission Viewer --------------------------------------------------

// Search by Submission ID. Software Providers only has one feature now, so
// this lives straight on the section's top-level URL rather than a separate
// landing page. A match redirects straight to the detail page; no match
// re-renders this page with a "no results" message.
router.get('/software-providers', (req, res) => {
  const submissionId = (req.query.submissionId || '').trim()
  const testData = patSubmissions.listTestData()

  if (submissionId) {
    const submission = patSubmissions.getSubmission(submissionId)
    if (submission) {
      return res.redirect(`/software-providers/pat-viewer/submission/${submission.submissionId}`)
    }
    return res.render('software-providers/pat-viewer', { searched: true, query: submissionId, testData })
  }

  res.render('software-providers/pat-viewer', { testData })
})

// Submission detail: the WTIDs collected under one Submission ID.
router.get('/software-providers/pat-viewer/submission/:id', (req, res) => {
  const submission = patSubmissions.getSubmission(req.params.id)
  if (!submission) {
    return res.status(404).render('placeholder', {
      heading: 'Submission not found',
      activeSection: 'providers'
    })
  }
  const results = patSubmissions.submissionResults(submission)
  const counts = patSubmissions.statusCounts(results)
  const failedText = results
    .filter((r) => r.status === 'Fail')
    .map((r) => `${r.scenarioId} – FAILED – ${r.message}`)
    .join('\n')

  res.render('software-providers/pat-viewer-submission', {
    submission,
    results,
    counts,
    failedText,
    submittedAtLabel: patSubmissions.formatSubmittedAt(submission.submittedAt),
    testData: patSubmissions.listTestData()
  })
})
