//
// Routes for the Waste Tracking Service prototype.
// See: https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const patScenarios = require('./data/pat-scenarios')

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function formatDate (day, month, year) {
  return `${day} ${MONTHS[month - 1]} ${year}`
}

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
  const day = (req.body['metrics-date-day'] || '').trim()
  const month = (req.body['metrics-date-month'] || '').trim()
  const year = (req.body['metrics-date-year'] || '').trim()

  const errors = {}

  const dayNum = Number(day)
  const monthNum = Number(month)
  const yearNum = Number(year)

  if (!day || !month || !year) {
    errors.date = 'Enter a date including a day, month and year'
  } else if (
    !Number.isInteger(dayNum) || !Number.isInteger(monthNum) || !Number.isInteger(yearNum) ||
    monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || year.length !== 4
  ) {
    errors.date = 'Enter a real date'
  } else {
    // Reject dates that do not exist, e.g. 31 February.
    const probe = new Date(yearNum, monthNum - 1, dayNum)
    if (
      probe.getFullYear() !== yearNum ||
      probe.getMonth() !== monthNum - 1 ||
      probe.getDate() !== dayNum
    ) {
      errors.date = 'Enter a real date'
    }
  }

  const dateValues = { day, month, year }

  if (errors.date) {
    return res.render('service-metrics', {
      errors,
      errorList: [{ text: errors.date, href: '#metrics-date-day' }],
      dateValues
    })
  }

  res.render('service-metrics', {
    dateValues,
    asAtDate: formatDate(dayNum, monthNum, yearNum),
    // TODO: value is mocked and static regardless of date. Confirm with the
    // author whether the count should vary by the chosen date (brief §9.3).
    // Built as an array so more metric rows can be added later (brief §4).
    metrics: [
      { name: 'Waste Organisations Registered as Receivers', value: '287' }
    ]
  })
})

// --- Software Providers -----------------------------------------------------

router.get('/software-providers/review-pat', (req, res) => {
  res.render('software-providers/review-pat', { scenarios: patScenarios })
})

// --- Dead links / not-built placeholders (build brief §8) -------------------

router.get('/waste-organisations', (req, res) => {
  res.render('placeholder', {
    heading: 'Waste Organisations',
    activeSection: 'organisations',
    tools: ['Look up waste organisation']
  })
})

router.get('/regulators', (req, res) => {
  res.render('placeholder', {
    heading: 'Regulators',
    activeSection: 'regulators',
    tools: ['Replay data transfer']
  })
})

// Renders inside the Software Providers section (side nav retained), even
// though the feature itself is not built in this prototype.
router.get('/software-providers/manage-credentials', (req, res) => {
  res.render('software-providers/manage-credentials')
})
