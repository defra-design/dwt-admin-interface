//
// Routes for the Waste Tracking Service prototype.
// See: https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const patScenarios = require('./data/pat-scenarios')
const reg = require('./data/regulators-data')
const {
  formatDateObj,
  validateDateParts,
  parsePeriod,
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

// Resolve the from/to period: submitted values on POST, last-12-months default
// on GET. Always returns { from, to, values, errors, errorList, hasErrors }.
function getPeriod (req) {
  if (req.method === 'POST') return parsePeriod(req.body)
  const d = defaultPeriod()
  return { from: d.from, to: d.to, values: d.values, errors: {}, errorList: [], hasErrors: false }
}

function periodLabel (period) {
  return `${formatDateObj(period.from)} to ${formatDateObj(period.to)}`
}

// Key metrics dashboard. Results are only shown after "Show results" (POST).
function regulatorsMetrics (req, res) {
  const period = getPeriod(req)
  if (req.method !== 'POST' || period.hasErrors) {
    return res.render('regulators/index', { period })
  }
  res.render('regulators/index', {
    period,
    metrics: reg.metrics(period.from, period.to),
    periodLabel: periodLabel(period)
  })
}
router.get('/regulators', regulatorsMetrics)
router.post('/regulators', regulatorsMetrics)

// Organisations not reporting. Results only shown after "Show results" (POST).
function regulatorsNotReporting (req, res) {
  const period = getPeriod(req)
  if (req.method !== 'POST' || period.hasErrors) {
    return res.render('regulators/not-reporting', { period })
  }
  const rows = reg.listNotReporting(period.from, period.to).map((o) => ({
    id: o.id,
    name: o.name,
    permitNumber: o.permitNumber,
    registered: formatDateObj(o.registeredDate)
  }))
  res.render('regulators/not-reporting', { period, rows, periodLabel: periodLabel(period) })
}
router.get('/regulators/not-reporting', regulatorsNotReporting)
router.post('/regulators/not-reporting', regulatorsNotReporting)

// Organisations reporting (+ waste-code breakdown). Results only after POST.
function regulatorsReporting (req, res) {
  const period = getPeriod(req)
  if (req.method !== 'POST' || period.hasErrors) {
    return res.render('regulators/reporting', { period })
  }
  const rows = reg.listReporting(period.from, period.to)
  res.render('regulators/reporting', {
    period,
    rows,
    totalMovements: rows.reduce((sum, o) => sum + o.movements, 0),
    wasteRows: reg.wasteCodeBreakdown(period.from, period.to),
    periodLabel: periodLabel(period)
  })
}
router.get('/regulators/reporting', regulatorsReporting)
router.post('/regulators/reporting', regulatorsReporting)

// Find an organisation (search).
router.get('/regulators/organisation', (req, res) => {
  const query = (req.query.q || '').trim()
  const searched = Object.prototype.hasOwnProperty.call(req.query, 'q')
  res.render('regulators/organisation', {
    query,
    searched,
    results: searched ? reg.findOrganisations(query) : []
  })
})

// Organisation detail (movement receipts for a period).
function organisationDetail (req, res) {
  const org = reg.getOrganisation(req.params.id)
  if (!org) {
    return res.status(404).render('placeholder', {
      heading: 'Organisation not found',
      activeSection: 'regulators'
    })
  }

  const period = getPeriod(req)

  const summary = period.hasErrors
    ? []
    : reg.orgWasteCodeSummary(org.id, period.from, period.to)
  const totalMovements = summary.reduce((sum, r) => sum + r.movements, 0)
  const totalTonnes = Math.round(summary.reduce((sum, r) => sum + r.tonnes, 0) * 10) / 10

  res.render('regulators/organisation-detail', {
    org: { ...org, registered: formatDateObj(org.registeredDate) },
    period,
    periodLabel: period.hasErrors ? '—' : periodLabel(period),
    summary,
    totalMovements,
    totalTonnes,
    errorList: period.errorList
  })
}
router.get('/regulators/organisation/:id', organisationDetail)
router.post('/regulators/organisation/:id', organisationDetail)

// --- Dead links / not-built placeholders (build brief §8) -------------------

router.get('/waste-organisations', (req, res) => {
  res.render('placeholder', {
    heading: 'Waste Organisations',
    activeSection: 'organisations',
    tools: ['Look up waste organisation']
  })
})

// Renders inside the Software Providers section (side nav retained), even
// though the feature itself is not built in this prototype.
router.get('/software-providers/manage-credentials', (req, res) => {
  res.render('software-providers/manage-credentials')
})

router.get('/software-providers/review-pat', (req, res) => {
  res.render('software-providers/review-pat', { scenarios: patScenarios })
})
