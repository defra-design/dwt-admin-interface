//
// Routes for the Waste Tracking Service prototype.
// See: https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const patSubmissions = require('./data/pat-submissions')
const reg = require('./data/regulators-data')
const { paginate } = require('./data/pagination')
const {
  formatDateObj,
  formatDateShortObj,
  validateDateParts,
  parseDateInput,
  defaultPeriod
} = require('./data/dates')

function periodLabel (period) {
  return `${formatDateObj(period.from)} to ${formatDateObj(period.to)}`
}

function mapOrgRows (orgs) {
  return orgs.map((o) => ({
    registered: formatDateShortObj(o.registeredDate),
    id: o.id,
    idShort: o.id.split('-').slice(0, 2).join('-') + '…', // truncate at 2nd hyphen
    apiCodeCount: o.apiCodeCount,
    organisationName: o.organisationName,
    paymentStatus: o.paymentStatus,
    paymentPeriod: o.paymentPeriod || ''
  }))
}

function hasDateFilter (query) {
  return [
    'period-from-day', 'period-from-month', 'period-from-year',
    'period-to-day', 'period-to-month', 'period-to-year'
  ].some((key) => (query[key] || '').trim())
}

const emptyPeriod = {
  values: {
    from: { day: '', month: '', year: '' },
    to: { day: '', month: '', year: '' }
  },
  errors: {}
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

// Same journeys under /v1 and /v2 so versions can diverge independently.
// Views live in app/views/<version>/ — edit v2 only when iterating.
function registerVersionRoutes (version) {
  const base = `/${version}`
  const view = (page) => `${version}/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = version
    next()
  })

  // --- Service metrics -----------------------------------------------------

  // GET: show the form with today's date pre-filled (build brief §4).
  router.get(`${base}/service-metrics`, (req, res) => {
    const today = new Date()
    res.render(view('service-metrics'), {
      dateValues: {
        day: today.getDate(),
        month: today.getMonth() + 1,
        year: today.getFullYear()
      }
    })
  })

  // POST: validate the date (GOV.UK "Dates" pattern), then render the metrics.
  router.post(`${base}/service-metrics`, (req, res) => {
    const dateValues = {
      day: (req.body['metrics-date-day'] || '').trim(),
      month: (req.body['metrics-date-month'] || '').trim(),
      year: (req.body['metrics-date-year'] || '').trim()
    }

    const { error, date } = validateDateParts(dateValues.day, dateValues.month, dateValues.year)

    if (error) {
      return res.render(view('service-metrics'), {
        errors: { date: error },
        errorList: [{ text: error, href: '#metrics-date-day' }],
        dateValues
      })
    }

    res.render(view('service-metrics'), {
      dateValues,
      asAtDate: formatDateObj(date),
      // TODO: value is mocked and static regardless of date (brief §9.3).
      metrics: [
        { name: 'Waste Organisations Registered as Receivers', value: '287' }
      ]
    })
  })

  // --- Regulators reporting ------------------------------------------------

  // Waste organisations registered within the period. Uses GET so the period is
  // in the URL and the results can be bookmarked/shared. No query params = an
  // initial visit (default dates, no results); any params = a submission. No
  // validation.
  router.get(`${base}/regulators`, (req, res) => {
    // Version 2: show the full list first, then filter by registration date.
    if (version === 'v2') {
      const filtered = hasDateFilter(req.query)
      const period = filtered ? lenientPeriod(req.query) : emptyPeriod
      const orgs = filtered
        ? reg.listRegisteredInPeriod(period.from, period.to)
        : reg.listAllOrganisations()
      const allRows = mapOrgRows(orgs)
      const { rows, pagination, total } = paginate(allRows, req.query.page, {
        path: `${base}/regulators`,
        query: req.query,
        itemName: 'organisations'
      })
      return res.render(view('regulators/index'), {
        period,
        rows,
        count: total,
        filtered,
        periodLabel: filtered ? periodLabel(period) : null,
        pagination
      })
    }

    const submitted = Object.prototype.hasOwnProperty.call(req.query, 'period-from-day')
    if (!submitted) {
      const d = defaultPeriod()
      return res.render(view('regulators/index'), { period: { from: d.from, to: d.to, values: d.values, errors: {} } })
    }
    const period = lenientPeriod(req.query)
    const rows = mapOrgRows(reg.listRegisteredInPeriod(period.from, period.to))
    res.render(view('regulators/index'), {
      period,
      rows,
      count: rows.length,
      periodLabel: periodLabel(period)
    })
  })

  // --- Dead links / not-built placeholders (build brief §8) ---------------

  router.get(`${base}/waste-organisations`, (req, res) => {
    res.render(view('placeholder'), {
      heading: 'Waste Organisations',
      activeSection: 'organisations',
      tools: ['Manage service charge']
    })
  })

  // --- PAT Submission Viewer ----------------------------------------------

  // Search by Submission ID. Software Providers only has one feature now, so
  // this lives straight on the section's top-level URL rather than a separate
  // landing page. A match redirects straight to the detail page; no match
  // re-renders this page with a "no results" message.
  router.get(`${base}/software-providers`, (req, res) => {
    const submissionId = (req.query.submissionId || '').trim()
    const testData = patSubmissions.listTestData()

    // Version 2: case list — show all submissions, filter in place.
    // Version 1: lookup — a match redirects to the detail page.
    if (version === 'v2') {
      const all = testData.submissions
      const rows = submissionId
        ? all.filter((s) => s.submissionId.toLowerCase().includes(submissionId.toLowerCase()))
        : all
      const page = paginate(rows, req.query.page, {
        path: `${base}/software-providers`,
        query: req.query,
        itemName: 'submissions'
      })
      return res.render(view('software-providers/pat-viewer'), {
        testData,
        query: submissionId,
        rows: page.rows,
        totalCount: page.total,
        pagination: page.pagination
      })
    }

    if (submissionId) {
      const submission = patSubmissions.getSubmission(submissionId)
      if (submission) {
        return res.redirect(`${base}/software-providers/pat-viewer/submission/${submission.submissionId}`)
      }
      return res.render(view('software-providers/pat-viewer'), { searched: true, query: submissionId, testData })
    }

    res.render(view('software-providers/pat-viewer'), { testData })
  })

  // Submission detail: the WTIDs collected under one Submission ID.
  router.get(`${base}/software-providers/pat-viewer/submission/:id`, (req, res) => {
    const submission = patSubmissions.getSubmission(req.params.id)
    if (!submission) {
      return res.status(404).render(view('placeholder'), {
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

    res.render(view('software-providers/pat-viewer-submission'), {
      submission,
      results,
      counts,
      failedText,
      submittedAtLabel: version === 'v2'
        ? patSubmissions.formatSubmittedAtGds(submission.submittedAt)
        : patSubmissions.formatSubmittedAt(submission.submittedAt),
      testData: patSubmissions.listTestData()
    })
  })
}

registerVersionRoutes('v1')
registerVersionRoutes('v2')

function redirectToV1 (req, res) {
  const qs = new URLSearchParams(req.query).toString()
  res.redirect('/v1' + req.path + (qs ? `?${qs}` : ''))
}

// Unversioned URLs from before version folders — send people to version 1.
router.get('/start', redirectToV1)
router.get('/service-metrics', redirectToV1)
router.post('/service-metrics', (req, res) => res.redirect(307, '/v1/service-metrics'))
router.get('/regulators', redirectToV1)
router.get('/waste-organisations', redirectToV1)
router.get('/software-providers', redirectToV1)
router.get('/software-providers/pat-viewer/submission/:id', redirectToV1)
