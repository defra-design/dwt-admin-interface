//
// Routes for the Waste Tracking Service prototype.
// See: https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const patSubmissions = require('./data/pat-submissions')
const reg = require('./data/regulators-data')
const sp = require('./data/software-providers')
const cc = require('./data/client-credentials')
const ccV6 = require('./data/client-credentials-v6')
const ccV7 = require('./data/client-credentials-v7')
const ccFutureSoftwareProviderPage = require('./data/future-software-provider-page-credentials')
const ccV9 = require('./data/client-credentials-v9')
const cf = require('./data/future-case-files')
const { paginate } = require('./data/pagination')
const {
  formatDateObj,
  formatDateShortObj,
  formatDateTimeObj,
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

// --- Version 3 -------------------------------------------------------------
// A partial copy of version 2: the start page and reporting as they were, no
// Service metrics, and a rebuilt Software providers section (list plus an "add"
// form). It has its own function so version 2 stays frozen.
function registerV3Routes () {
  const base = '/v3'
  const view = (page) => `v3/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v3'
    next()
  })

  // Providers are held in session data — no backend. See data/software-providers.js.
  function providerList (req) {
    if (!Array.isArray(req.session.data.softwareProviders)) {
      req.session.data.softwareProviders = []
    }
    return req.session.data.softwareProviders
  }

  function emptyForm () {
    return { companyName: '', emails: [''], notes: '' }
  }

  function renderAdd (res, options) {
    res.render(view('software-providers/add'), Object.assign({
      maxEmails: sp.MAX_EMAILS,
      errors: {},
      errorList: [],
      focus: null
    }, options))
  }

  // --- Reporting (unchanged from version 2) --------------------------------

  router.get(`${base}/regulators`, (req, res) => {
    const filtered = hasDateFilter(req.query)
    const period = filtered ? lenientPeriod(req.query) : emptyPeriod
    const orgs = filtered
      ? reg.listRegisteredInPeriod(period.from, period.to)
      : reg.listAllOrganisations()
    const { rows, pagination, total } = paginate(mapOrgRows(orgs), req.query.page, {
      path: `${base}/regulators`,
      query: req.query,
      itemName: 'organisations'
    })
    res.render(view('regulators/index'), {
      period,
      rows,
      count: total,
      filtered,
      periodLabel: filtered ? periodLabel(period) : null,
      pagination
    })
  })

  // --- Software providers --------------------------------------------------

  function requireProvider (req, res) {
    const provider = sp.findProvider(providerList(req), req.params.id)
    if (!provider) {
      res.redirect(`${base}/software-providers`)
      return null
    }
    return provider
  }

  router.get(`${base}/software-providers`, (req, res) => {
    res.render(view('software-providers/index'), {
      providers: sp.toRows(providerList(req))
    })
  })

  // Filled-state version of the list, for showing the design to delivery teams.
  // Reached only from the prototype index, never from the journey, so the
  // journey still starts on the empty state. Renders the same view as the real
  // page with fixed example data, so the two cannot drift apart.
  router.get(`${base}/software-providers/example`, (req, res) => {
    res.render(view('software-providers/index'), {
      providers: sp.toRows(sp.exampleProviders)
    })
  })

  router.get(`${base}/software-providers/add`, (req, res) => {
    renderAdd(res, { values: emptyForm() })
  })

  // One form, three submit buttons: add an email field, remove one, or save.
  // "Add another" and "Remove" are handled here rather than in the browser so
  // the 5-address maximum produces a real error summary.
  router.post(`${base}/software-providers/add`, (req, res) => {
    const values = {
      companyName: (req.body.companyName || '').trim(),
      emails: sp.toArray(req.body.email),
      notes: req.body.notes || ''
    }
    if (!values.emails.length) values.emails = ['']

    const emailAction = sp.applyEmailActions(values, req.body)
    if (emailAction.action === 'remove' || emailAction.action === 'add') {
      return renderAdd(res, { values, focus: emailAction.focus })
    }
    if (emailAction.action === 'tooMany') {
      return renderAdd(res, {
        values,
        errors: emailAction.errors,
        errorList: sp.errorList(emailAction.errors)
      })
    }

    const errors = sp.validate(values)
    if (Object.keys(errors).length) {
      return renderAdd(res, { values, errors, errorList: sp.errorList(errors) })
    }

    providerList(req).push(sp.newProvider(values))
    res.redirect(`${base}/software-providers`)
  })

  // --- Company detail and change pages -------------------------------------

  router.get(`${base}/software-providers/:id`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    res.render(view('software-providers/detail'), sp.toDetail(provider, 'v3'))
  })

  router.get(`${base}/software-providers/:id/change-name`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    res.render(view('software-providers/change-name'), {
      provider: sp.toDetail(provider, 'v3'),
      values: { companyName: provider.companyName },
      errors: {},
      errorList: []
    })
  })

  router.post(`${base}/software-providers/:id/change-name`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const values = { companyName: (req.body.companyName || '').trim() }
    const errors = sp.validate(values, { fields: ['companyName'] })
    if (Object.keys(errors).length) {
      return res.render(view('software-providers/change-name'), {
        provider: sp.toDetail(provider, 'v3'),
        values,
        errors,
        errorList: sp.errorList(errors)
      })
    }
    sp.updateCompanyName(provider, values.companyName)
    res.redirect(`${base}/software-providers/${provider.id}`)
  })

  function renderChangeEmails (res, provider, options) {
    res.render(view('software-providers/change-emails'), Object.assign({
      provider: sp.toDetail(provider, 'v3'),
      maxEmails: sp.MAX_EMAILS,
      errors: {},
      errorList: [],
      focus: null
    }, options))
  }

  router.get(`${base}/software-providers/:id/change-emails`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    renderChangeEmails(res, provider, {
      values: { emails: (provider.emails || []).slice() }
    })
  })

  router.post(`${base}/software-providers/:id/change-emails`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const values = { emails: sp.toArray(req.body.email) }
    if (!values.emails.length) values.emails = ['']

    const emailAction = sp.applyEmailActions(values, req.body)
    if (emailAction.action === 'remove' || emailAction.action === 'add') {
      return renderChangeEmails(res, provider, { values, focus: emailAction.focus })
    }
    if (emailAction.action === 'tooMany') {
      return renderChangeEmails(res, provider, {
        values,
        errors: emailAction.errors,
        errorList: sp.errorList(emailAction.errors)
      })
    }

    const errors = sp.validate(values, { fields: ['emails'] })
    if (Object.keys(errors).length) {
      return renderChangeEmails(res, provider, {
        values,
        errors,
        errorList: sp.errorList(errors)
      })
    }

    sp.updateEmails(provider, values.emails)
    res.redirect(`${base}/software-providers/${provider.id}`)
  })

  // --- API keys -------------------------------------------------------------
  //
  // One route generates a key and doubles as both "Create" (no key yet) and
  // "Rotate API key" (one already exists) — both actions do the same thing:
  // make a new secret and show it once. A second route is the one-time
  // reveal page itself; a third lets the application name be changed without
  // touching the secret.

  function requireApiKeyEnvironment (req, res, provider) {
    const environment = sp.findEnvironment(req.params.environment)
    if (!environment) {
      res.redirect(`${base}/software-providers/${provider.id}`)
      return null
    }
    return environment
  }

  function renderGenerate (res, provider, environment, options) {
    res.render(view('software-providers/api-key-generate'), Object.assign({
      provider: sp.toDetail(provider, 'v3'),
      environment,
      rotating: sp.hasApiKey(provider, environment.key),
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/software-providers/:id/api-keys/:environment/generate`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    renderGenerate(res, provider, environment, {
      values: { applicationName: sp.apiKeyFor(provider, environment.key).applicationName || '' }
    })
  })

  router.post(`${base}/software-providers/:id/api-keys/:environment/generate`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return

    // Rotating: the page has no application name field (the name is not
    // changing, only the secret), so there is nothing to validate — keep
    // the name already on record and generate a new key straight away.
    if (sp.hasApiKey(provider, environment.key)) {
      const applicationName = sp.apiKeyFor(provider, environment.key).applicationName
      sp.createOrRotateApiKey(provider, environment.key, applicationName)
      return res.redirect(`${base}/software-providers/${provider.id}/api-keys/${environment.key}`)
    }

    const values = { applicationName: (req.body.applicationName || '').trim() }
    const errors = sp.validateApplicationName(values)
    if (Object.keys(errors).length) {
      return renderGenerate(res, provider, environment, {
        values,
        errors,
        errorList: [{ text: errors.applicationName, href: '#applicationName' }]
      })
    }

    sp.createOrRotateApiKey(provider, environment.key, values.applicationName)
    res.redirect(`${base}/software-providers/${provider.id}/api-keys/${environment.key}`)
  })

  // The one-time reveal. If there is nothing unrevealed to show — no key yet,
  // or this key has already been closed once — there is nothing for this
  // page to do, so it sends the user back to the record rather than erroring.
  router.get(`${base}/software-providers/:id/api-keys/:environment`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    const record = sp.apiKeyFor(provider, environment.key)
    if (!record.apiKey || record.revealed) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }
    res.render(view('software-providers/api-key-reveal'), {
      provider: sp.toDetail(provider, 'v3'),
      environment,
      apiKey: record.apiKey,
      errors: {},
      errorList: []
    })
  })

  // "Close": only proceeds once the checkbox confirms the key has been
  // copied or saved, per the GOV.UK/WCAG pattern for a one-time secret.
  router.post(`${base}/software-providers/:id/api-keys/:environment`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    const record = sp.apiKeyFor(provider, environment.key)
    if (!record.apiKey || record.revealed) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }

    if (!sp.isCheckboxTicked(req.body.confirmSaved)) {
      const message = 'Select the checkbox to confirm you have copied or saved this API key'
      return res.render(view('software-providers/api-key-reveal'), {
        provider: sp.toDetail(provider, 'v3'),
        environment,
        apiKey: record.apiKey,
        errors: { confirmSaved: message },
        errorList: [{ text: message, href: '#confirmSaved' }]
      })
    }

    sp.revealApiKey(provider, environment.key)
    res.redirect(`${base}/software-providers/${provider.id}`)
  })

  function renderChangeApplicationName (res, provider, environment, options) {
    res.render(view('software-providers/api-key-change-application-name'), Object.assign({
      provider: sp.toDetail(provider, 'v3'),
      environment,
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/software-providers/:id/api-keys/:environment/change-application-name`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    if (!sp.hasApiKey(provider, environment.key)) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }
    renderChangeApplicationName(res, provider, environment, {
      values: { applicationName: sp.apiKeyFor(provider, environment.key).applicationName }
    })
  })

  router.post(`${base}/software-providers/:id/api-keys/:environment/change-application-name`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    if (!sp.hasApiKey(provider, environment.key)) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }

    const values = { applicationName: (req.body.applicationName || '').trim() }
    const errors = sp.validateApplicationName(values)
    if (Object.keys(errors).length) {
      return renderChangeApplicationName(res, provider, environment, {
        values,
        errors,
        errorList: [{ text: errors.applicationName, href: '#applicationName' }]
      })
    }

    sp.updateApiKeyApplicationName(provider, environment.key, values.applicationName)
    res.redirect(`${base}/software-providers/${provider.id}`)
  })

  // A confirmation step, not an immediate action from the table: deleting is
  // destructive (any application using the key stops working, and there is
  // no undo) and a stray click should not be able to trigger it.
  router.get(`${base}/software-providers/:id/api-keys/:environment/delete`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    if (!sp.hasApiKey(provider, environment.key)) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }
    res.render(view('software-providers/api-key-delete'), {
      provider: sp.toDetail(provider, 'v3'),
      environment
    })
  })

  router.post(`${base}/software-providers/:id/api-keys/:environment/delete`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    if (sp.hasApiKey(provider, environment.key)) {
      sp.deleteApiKey(provider, environment.key)
    }
    res.redirect(`${base}/software-providers/${provider.id}`)
  })
}

registerV3Routes()

// --- Version 4 -------------------------------------------------------------
// An identical copy of version 3, as the starting point for the next round of
// changes. It has its own function, and its own session data key for
// software providers, so version 3 stays frozen while version 4 is edited.
function registerV4Routes () {
  const base = '/v4'
  const view = (page) => `v4/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v4'
    next()
  })

  // Providers are held in session data — no backend. See data/software-providers.js.
  function providerList (req) {
    if (!Array.isArray(req.session.data.softwareProvidersV4)) {
      req.session.data.softwareProvidersV4 = []
    }
    return req.session.data.softwareProvidersV4
  }

  // Client credentials created in this session (newest last). Shown above the
  // fixed dummy rows. See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsV4)) {
      req.session.data.clientCredentialsV4 = []
    }
    return req.session.data.clientCredentialsV4
  }

  function emptyForm () {
    return { companyName: '', emails: [''], notes: '' }
  }

  function renderAdd (res, options) {
    res.render(view('software-providers/add'), Object.assign({
      maxEmails: sp.MAX_EMAILS,
      errors: {},
      errorList: [],
      focus: null
    }, options))
  }

  // --- Reporting (unchanged from version 2) --------------------------------

  router.get(`${base}/regulators`, (req, res) => {
    const filtered = hasDateFilter(req.query)
    const period = filtered ? lenientPeriod(req.query) : emptyPeriod
    const orgs = filtered
      ? reg.listRegisteredInPeriod(period.from, period.to)
      : reg.listAllOrganisations()
    const { rows, pagination, total } = paginate(mapOrgRows(orgs), req.query.page, {
      path: `${base}/regulators`,
      query: req.query,
      itemName: 'organisations'
    })
    res.render(view('regulators/index'), {
      period,
      rows,
      count: total,
      filtered,
      periodLabel: filtered ? periodLabel(period) : null,
      pagination
    })
  })

  // --- Software providers --------------------------------------------------

  function requireProvider (req, res) {
    const provider = sp.findProvider(providerList(req), req.params.id)
    if (!provider) {
      res.redirect(`${base}/software-providers`)
      return null
    }
    return provider
  }

  // The list is a single table of client credentials: any created in this
  // session, then the fixed dummy rows (data/client-credentials.js).
  router.get(`${base}/software-providers`, (req, res) => {
    res.render(view('software-providers/index'), {
      credentials: cc.allCredentials(credentialList(req))
    })
  })

  // Kept so old links still work. The list always shows example data now, so
  // this renders exactly the same page as the real list.
  router.get(`${base}/software-providers/example`, (req, res) => {
    res.render(view('software-providers/index'), {
      credentials: cc.allCredentials(credentialList(req))
    })
  })

  // --- Client credentials ---------------------------------------------------
  //
  // "Create new credentials": one form, then a page that shows the generated
  // client secret once. The credential is saved when the form is submitted;
  // the secret is only kept until the user closes the second page. These sit
  // before the `/software-providers/:id` routes below.

  function renderCreateCredentials (res, options) {
    res.render(view('client-credentials/create'), Object.assign({
      environments: cc.ENVIRONMENTS,
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/client-credentials/create`, (req, res) => {
    renderCreateCredentials(res, {
      values: { softwareProvider: '', clientName: '', environment: '' }
    })
  })

  router.post(`${base}/client-credentials/create`, (req, res) => {
    const values = {
      softwareProvider: (req.body.softwareProvider || '').trim(),
      clientName: (req.body.clientName || '').trim(),
      environment: req.body.environment || ''
    }
    const errors = cc.validate(values, credentialList(req))
    if (Object.keys(errors).length) {
      return renderCreateCredentials(res, { values, errors, errorList: cc.errorList(errors) })
    }

    const credential = cc.newCredential(values)
    credentialList(req).push(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // The one-time reveal. Once closed there is nothing left to show, so this
  // sends the user back to the table rather than showing the secret again.
  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.findCredential(credentialList(req), req.params.id)
    if (!credential || !credential.pendingSecret) {
      return res.redirect(`${base}/software-providers`)
    }
    res.render(view('client-credentials/created'), { credential })
  })

  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.findCredential(credentialList(req), req.params.id)
    if (credential) delete credential.pendingSecret
    res.redirect(`${base}/software-providers`)
  })

  // Not designed yet — goes to the placeholder page.
  router.get(`${base}/client-credentials/:id/rotate`, (req, res) => {
    res.render(view('placeholder'), {
      heading: 'Rotate client secret',
      activeSection: 'providers'
    })
  })

  router.get(`${base}/software-providers/add`, (req, res) => {
    renderAdd(res, { values: emptyForm() })
  })

  // One form, three submit buttons: add an email field, remove one, or save.
  // "Add another" and "Remove" are handled here rather than in the browser so
  // the 5-address maximum produces a real error summary.
  router.post(`${base}/software-providers/add`, (req, res) => {
    const values = {
      companyName: (req.body.companyName || '').trim(),
      emails: sp.toArray(req.body.email),
      notes: req.body.notes || ''
    }
    if (!values.emails.length) values.emails = ['']

    const emailAction = sp.applyEmailActions(values, req.body)
    if (emailAction.action === 'remove' || emailAction.action === 'add') {
      return renderAdd(res, { values, focus: emailAction.focus })
    }
    if (emailAction.action === 'tooMany') {
      return renderAdd(res, {
        values,
        errors: emailAction.errors,
        errorList: sp.errorList(emailAction.errors)
      })
    }

    const errors = sp.validate(values)
    if (Object.keys(errors).length) {
      return renderAdd(res, { values, errors, errorList: sp.errorList(errors) })
    }

    providerList(req).push(sp.newProvider(values))
    res.redirect(`${base}/software-providers`)
  })

  // --- Company detail and change pages -------------------------------------

  router.get(`${base}/software-providers/:id`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    res.render(view('software-providers/detail'), sp.toDetail(provider, 'v4'))
  })

  router.get(`${base}/software-providers/:id/change-name`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    res.render(view('software-providers/change-name'), {
      provider: sp.toDetail(provider, 'v4'),
      values: { companyName: provider.companyName },
      errors: {},
      errorList: []
    })
  })

  router.post(`${base}/software-providers/:id/change-name`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const values = { companyName: (req.body.companyName || '').trim() }
    const errors = sp.validate(values, { fields: ['companyName'] })
    if (Object.keys(errors).length) {
      return res.render(view('software-providers/change-name'), {
        provider: sp.toDetail(provider, 'v4'),
        values,
        errors,
        errorList: sp.errorList(errors)
      })
    }
    sp.updateCompanyName(provider, values.companyName)
    res.redirect(`${base}/software-providers/${provider.id}`)
  })

  function renderChangeEmails (res, provider, options) {
    res.render(view('software-providers/change-emails'), Object.assign({
      provider: sp.toDetail(provider, 'v4'),
      maxEmails: sp.MAX_EMAILS,
      errors: {},
      errorList: [],
      focus: null
    }, options))
  }

  router.get(`${base}/software-providers/:id/change-emails`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    renderChangeEmails(res, provider, {
      values: { emails: (provider.emails || []).slice() }
    })
  })

  router.post(`${base}/software-providers/:id/change-emails`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const values = { emails: sp.toArray(req.body.email) }
    if (!values.emails.length) values.emails = ['']

    const emailAction = sp.applyEmailActions(values, req.body)
    if (emailAction.action === 'remove' || emailAction.action === 'add') {
      return renderChangeEmails(res, provider, { values, focus: emailAction.focus })
    }
    if (emailAction.action === 'tooMany') {
      return renderChangeEmails(res, provider, {
        values,
        errors: emailAction.errors,
        errorList: sp.errorList(emailAction.errors)
      })
    }

    const errors = sp.validate(values, { fields: ['emails'] })
    if (Object.keys(errors).length) {
      return renderChangeEmails(res, provider, {
        values,
        errors,
        errorList: sp.errorList(errors)
      })
    }

    sp.updateEmails(provider, values.emails)
    res.redirect(`${base}/software-providers/${provider.id}`)
  })

  // --- API keys -------------------------------------------------------------
  //
  // One route generates a key and doubles as both "Create" (no key yet) and
  // "Rotate API key" (one already exists) — both actions do the same thing:
  // make a new secret and show it once. A second route is the one-time
  // reveal page itself; a third lets the application name be changed without
  // touching the secret.

  function requireApiKeyEnvironment (req, res, provider) {
    const environment = sp.findEnvironment(req.params.environment)
    if (!environment) {
      res.redirect(`${base}/software-providers/${provider.id}`)
      return null
    }
    return environment
  }

  function renderGenerate (res, provider, environment, options) {
    res.render(view('software-providers/api-key-generate'), Object.assign({
      provider: sp.toDetail(provider, 'v4'),
      environment,
      rotating: sp.hasApiKey(provider, environment.key),
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/software-providers/:id/api-keys/:environment/generate`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    renderGenerate(res, provider, environment, {
      values: { applicationName: sp.apiKeyFor(provider, environment.key).applicationName || '' }
    })
  })

  router.post(`${base}/software-providers/:id/api-keys/:environment/generate`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return

    // Rotating: the page has no application name field (the name is not
    // changing, only the secret), so there is nothing to validate — keep
    // the name already on record and generate a new key straight away.
    if (sp.hasApiKey(provider, environment.key)) {
      const applicationName = sp.apiKeyFor(provider, environment.key).applicationName
      sp.createOrRotateApiKey(provider, environment.key, applicationName)
      return res.redirect(`${base}/software-providers/${provider.id}/api-keys/${environment.key}`)
    }

    const values = { applicationName: (req.body.applicationName || '').trim() }
    const errors = sp.validateApplicationName(values)
    if (Object.keys(errors).length) {
      return renderGenerate(res, provider, environment, {
        values,
        errors,
        errorList: [{ text: errors.applicationName, href: '#applicationName' }]
      })
    }

    sp.createOrRotateApiKey(provider, environment.key, values.applicationName)
    res.redirect(`${base}/software-providers/${provider.id}/api-keys/${environment.key}`)
  })

  // The one-time reveal. If there is nothing unrevealed to show — no key yet,
  // or this key has already been closed once — there is nothing for this
  // page to do, so it sends the user back to the record rather than erroring.
  router.get(`${base}/software-providers/:id/api-keys/:environment`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    const record = sp.apiKeyFor(provider, environment.key)
    if (!record.apiKey || record.revealed) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }
    res.render(view('software-providers/api-key-reveal'), {
      provider: sp.toDetail(provider, 'v4'),
      environment,
      apiKey: record.apiKey,
      errors: {},
      errorList: []
    })
  })

  // "Close": only proceeds once the checkbox confirms the key has been
  // copied or saved, per the GOV.UK/WCAG pattern for a one-time secret.
  router.post(`${base}/software-providers/:id/api-keys/:environment`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    const record = sp.apiKeyFor(provider, environment.key)
    if (!record.apiKey || record.revealed) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }

    if (!sp.isCheckboxTicked(req.body.confirmSaved)) {
      const message = 'Select the checkbox to confirm you have copied or saved this API key'
      return res.render(view('software-providers/api-key-reveal'), {
        provider: sp.toDetail(provider, 'v4'),
        environment,
        apiKey: record.apiKey,
        errors: { confirmSaved: message },
        errorList: [{ text: message, href: '#confirmSaved' }]
      })
    }

    sp.revealApiKey(provider, environment.key)
    res.redirect(`${base}/software-providers/${provider.id}`)
  })

  function renderChangeApplicationName (res, provider, environment, options) {
    res.render(view('software-providers/api-key-change-application-name'), Object.assign({
      provider: sp.toDetail(provider, 'v4'),
      environment,
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/software-providers/:id/api-keys/:environment/change-application-name`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    if (!sp.hasApiKey(provider, environment.key)) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }
    renderChangeApplicationName(res, provider, environment, {
      values: { applicationName: sp.apiKeyFor(provider, environment.key).applicationName }
    })
  })

  router.post(`${base}/software-providers/:id/api-keys/:environment/change-application-name`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    if (!sp.hasApiKey(provider, environment.key)) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }

    const values = { applicationName: (req.body.applicationName || '').trim() }
    const errors = sp.validateApplicationName(values)
    if (Object.keys(errors).length) {
      return renderChangeApplicationName(res, provider, environment, {
        values,
        errors,
        errorList: [{ text: errors.applicationName, href: '#applicationName' }]
      })
    }

    sp.updateApiKeyApplicationName(provider, environment.key, values.applicationName)
    res.redirect(`${base}/software-providers/${provider.id}`)
  })

  // A confirmation step, not an immediate action from the table: deleting is
  // destructive (any application using the key stops working, and there is
  // no undo) and a stray click should not be able to trigger it.
  router.get(`${base}/software-providers/:id/api-keys/:environment/delete`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    if (!sp.hasApiKey(provider, environment.key)) {
      return res.redirect(`${base}/software-providers/${provider.id}`)
    }
    res.render(view('software-providers/api-key-delete'), {
      provider: sp.toDetail(provider, 'v4'),
      environment
    })
  })

  router.post(`${base}/software-providers/:id/api-keys/:environment/delete`, (req, res) => {
    const provider = requireProvider(req, res)
    if (!provider) return
    const environment = requireApiKeyEnvironment(req, res, provider)
    if (!environment) return
    if (sp.hasApiKey(provider, environment.key)) {
      sp.deleteApiKey(provider, environment.key)
    }
    res.redirect(`${base}/software-providers/${provider.id}`)
  })
}

registerV4Routes()

// --- Version 4.1 -----------------------------------------------------------
// A sub-version of version 4. Test and Production credentials are on separate
// pages, and "Create new credentials" starts from the page the user is on, so
// the create form does not ask for the environment. It has its own function
// and its own session data key, so version 4 stays frozen while this is edited.
// Only the pages a user can reach are included (no add, detail or API key pages).
function registerV41Routes () {
  const base = '/v4-1'
  const view = (page) => `v4-1/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v4-1'
    next()
  })

  // Credentials created in this session (newest last). See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsV41)) {
      req.session.data.clientCredentialsV41 = []
    }
    return req.session.data.clientCredentialsV41
  }

  // The environment comes from the URL: /test or /production.
  function environmentFor (key) {
    const match = cc.ENVIRONMENTS.find((e) => e.value.toLowerCase() === key)
    return match ? { key: match.value.toLowerCase(), label: match.value } : null
  }

  // --- Reporting (same as version 4) -----------------------------------------

  router.get(`${base}/regulators`, (req, res) => {
    const filtered = hasDateFilter(req.query)
    const period = filtered ? lenientPeriod(req.query) : emptyPeriod
    const orgs = filtered
      ? reg.listRegisteredInPeriod(period.from, period.to)
      : reg.listAllOrganisations()
    const { rows, pagination, total } = paginate(mapOrgRows(orgs), req.query.page, {
      path: `${base}/regulators`,
      query: req.query,
      itemName: 'organisations'
    })
    res.render(view('regulators/index'), {
      period,
      rows,
      count: total,
      filtered,
      periodLabel: filtered ? periodLabel(period) : null,
      pagination
    })
  })

  // --- Software providers --------------------------------------------------

  // The navigation links here, so it goes to the Test page.
  router.get(`${base}/software-providers`, (req, res) => {
    res.redirect(`${base}/software-providers/test`)
  })

  router.get(`${base}/software-providers/:environment`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    res.render(view('software-providers/index'), {
      environment,
      credentials: cc.allCredentials(credentialList(req))
        .filter((c) => c.environment === environment.label)
    })
  })

  // --- Client credentials ---------------------------------------------------

  function renderCreateCredentials (res, environment, options) {
    res.render(view('client-credentials/create'), Object.assign({
      environment,
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    renderCreateCredentials(res, environment, {
      values: { softwareProvider: '', clientName: '' }
    })
  })

  router.post(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    const values = {
      softwareProvider: (req.body.softwareProvider || '').trim(),
      clientName: (req.body.clientName || '').trim()
    }
    // The environment is set from the page the user started on, not the form.
    const errors = cc.validate(Object.assign({ environment: environment.label }, values), credentialList(req))
    if (Object.keys(errors).length) {
      return renderCreateCredentials(res, environment, { values, errors, errorList: cc.errorList(errors) })
    }

    const credential = cc.newCredential(Object.assign({ environment: environment.label }, values))
    credentialList(req).push(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // The one-time reveal. Once closed there is nothing left to show, so this
  // sends the user back to the list rather than showing the secret again.
  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.findCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    if (!credential.pendingSecret) {
      return res.redirect(`${base}/software-providers/${credential.environment.toLowerCase()}`)
    }
    res.render(view('client-credentials/created'), { credential })
  })

  // Closing returns to the page for the environment the credentials were created in.
  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.findCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    delete credential.pendingSecret
    res.redirect(`${base}/software-providers/${credential.environment.toLowerCase()}`)
  })

  // Not designed yet — goes to the placeholder page.
  router.get(`${base}/client-credentials/:id/rotate`, (req, res) => {
    res.render(view('placeholder'), {
      heading: 'Rotate client secret',
      activeSection: 'providers'
    })
  })
}

registerV41Routes()

// --- Version 4.2 -----------------------------------------------------------
// A sub-version of version 4.1. The software provider is no longer recorded:
// the client name now holds the software provider and software name. The table
// shows when each credential was last changed, and the client name can be
// edited. "Rotate" gives a new secret on a page like "Credentials created".
// It has its own function and its own session data key, so version 4.1 stays
// frozen while this is edited.
function registerV42Routes () {
  const base = '/v4-2'
  const view = (page) => `v4-2/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v4-2'
    next()
  })

  // Credentials created or changed in this session. See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsV42)) {
      req.session.data.clientCredentialsV42 = []
    }
    return req.session.data.clientCredentialsV42
  }

  // The environment comes from the URL: /test or /production.
  function environmentFor (key) {
    const match = cc.ENVIRONMENTS.find((e) => e.value.toLowerCase() === key)
    return match ? { key: match.value.toLowerCase(), label: match.value } : null
  }

  function tablePath (environmentLabel) {
    return `${base}/software-providers/${environmentLabel.toLowerCase()}`
  }

  // --- Reporting (same as version 4.1) -----------------------------------------

  router.get(`${base}/regulators`, (req, res) => {
    const filtered = hasDateFilter(req.query)
    const period = filtered ? lenientPeriod(req.query) : emptyPeriod
    const orgs = filtered
      ? reg.listRegisteredInPeriod(period.from, period.to)
      : reg.listAllOrganisations()
    const { rows, pagination, total } = paginate(mapOrgRows(orgs), req.query.page, {
      path: `${base}/regulators`,
      query: req.query,
      itemName: 'organisations'
    })
    res.render(view('regulators/index'), {
      period,
      rows,
      count: total,
      filtered,
      periodLabel: filtered ? periodLabel(period) : null,
      pagination
    })
  })

  // --- Software providers --------------------------------------------------

  // The navigation links here, so it goes to the Test page.
  router.get(`${base}/software-providers`, (req, res) => {
    res.redirect(`${base}/software-providers/test`)
  })

  router.get(`${base}/software-providers/:environment`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    const credentials = cc.listCredentials(credentialList(req))
      .filter((c) => c.environment === environment.label)
      .map((c) => Object.assign({}, c, {
        lastChangedLabel: formatDateTimeObj(new Date(c.lastChanged))
      }))
    res.render(view('software-providers/index'), { environment, credentials })
  })

  // --- Client credentials ---------------------------------------------------

  // The create and edit pages share one form. Only the client name is asked for.
  function renderClientNameForm (res, options) {
    res.render(view('client-credentials/create'), Object.assign({
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    renderClientNameForm(res, {
      environment,
      mode: 'create',
      values: { clientName: '' }
    })
  })

  router.post(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    const values = { clientName: (req.body.clientName || '').trim() }
    const errors = cc.validateClientName(values.clientName, credentialList(req))
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        errors,
        errorList: cc.clientNameErrorList(errors)
      })
    }

    // The environment is set from the page the user started on, not the form.
    const credential = cc.createCredential({
      clientName: values.clientName,
      environment: environment.label
    })
    credentialList(req).push(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // The edit page is the create page with the current client name filled in.
  router.get(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    renderClientNameForm(res, {
      environment: environmentFor(credential.environment.toLowerCase()),
      mode: 'edit',
      credential,
      values: { clientName: credential.clientName }
    })
  })

  router.post(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    const values = { clientName: (req.body.clientName || '').trim() }
    // The credential's own name does not count as "already exists".
    const errors = cc.validateClientName(values.clientName, credentialList(req), credential.id)
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        errors,
        errorList: cc.clientNameErrorList(errors)
      })
    }

    // Only a real change counts as a change, so "Last changed" stays put if
    // the user saves without editing.
    if (values.clientName !== credential.clientName) {
      const toChange = cc.credentialToChange(credentialList(req), credential.id)
      toChange.clientName = values.clientName
      toChange.lastChanged = new Date().toISOString()
    }
    res.redirect(tablePath(credential.environment))
  })

  // The one-time reveal, for new credentials and for a rotated secret. Once
  // closed there is nothing left to show, so this sends the user back to the
  // table rather than showing the secret again.
  function renderReveal (res, credential) {
    const environment = credential.environment.toLowerCase()
    const rotated = credential.pendingAction === 'rotated'
    res.render(view('client-credentials/created'), {
      credential,
      caption: rotated ? `Rotate ${environment} client secret` : `Generate ${environment} credentials`
    })
  }

  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    if (!credential.pendingSecret) return res.redirect(tablePath(credential.environment))
    renderReveal(res, credential)
  })

  // Closing returns to the page for the environment the credentials belong to.
  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    delete credential.pendingSecret
    delete credential.pendingAction
    res.redirect(tablePath(credential.environment))
  })

  // Rotating gives a new secret straight away. A refresh keeps the same new
  // secret, because it is only replaced once the user has closed the page.
  router.get(`${base}/client-credentials/:id/rotate`, (req, res) => {
    if (!cc.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers/test`)
    }
    const credential = cc.credentialToChange(credentialList(req), req.params.id)
    if (credential.pendingAction !== 'rotated') cc.rotateSecret(credential)
    renderReveal(res, credential)
  })
}

registerV42Routes()

// --- Version 4.3 -----------------------------------------------------------
// A copy of version 4.2. The software provider is no longer recorded:
// the client name now holds the software provider and software name. The table
// shows when each credential was last changed, and the client name can be
// edited. "Rotate" gives a new secret on a page like "Credentials created".
// It has its own function and its own session data key, so version 4.2 stays
// frozen while this is edited.
function registerV43Routes () {
  const base = '/v4-3'
  const view = (page) => `v4-3/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v4-3'
    next()
  })

  // Credentials created or changed in this session. See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsV43)) {
      req.session.data.clientCredentialsV43 = []
    }
    return req.session.data.clientCredentialsV43
  }

  // The environment comes from the URL: /test or /production.
  function environmentFor (key) {
    const match = cc.ENVIRONMENTS.find((e) => e.value.toLowerCase() === key)
    return match ? { key: match.value.toLowerCase(), label: match.value } : null
  }

  function tablePath (environmentLabel) {
    return `${base}/software-providers/${environmentLabel.toLowerCase()}`
  }

  // --- Reporting (same as version 4.1) -----------------------------------------

  router.get(`${base}/regulators`, (req, res) => {
    const filtered = hasDateFilter(req.query)
    const period = filtered ? lenientPeriod(req.query) : emptyPeriod
    const orgs = filtered
      ? reg.listRegisteredInPeriod(period.from, period.to)
      : reg.listAllOrganisations()
    const { rows, pagination, total } = paginate(mapOrgRows(orgs), req.query.page, {
      path: `${base}/regulators`,
      query: req.query,
      itemName: 'organisations'
    })
    res.render(view('regulators/index'), {
      period,
      rows,
      count: total,
      filtered,
      periodLabel: filtered ? periodLabel(period) : null,
      pagination
    })
  })

  // --- Software providers --------------------------------------------------

  // The navigation links here, so it goes to the Test page.
  router.get(`${base}/software-providers`, (req, res) => {
    res.redirect(`${base}/software-providers/test`)
  })

  router.get(`${base}/software-providers/:environment`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    const credentials = cc.listCredentials(credentialList(req))
      .filter((c) => c.environment === environment.label)
      .map((c) => Object.assign({}, c, {
        lastChangedLabel: formatDateTimeObj(new Date(c.lastChanged))
      }))
    res.render(view('software-providers/index'), { environment, credentials })
  })

  // --- Client credentials ---------------------------------------------------

  // The create and edit pages share one form. Only the client name is asked for.
  function renderClientNameForm (res, options) {
    res.render(view('client-credentials/create'), Object.assign({
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    renderClientNameForm(res, {
      environment,
      mode: 'create',
      values: { clientName: '' }
    })
  })

  router.post(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    const values = { clientName: (req.body.clientName || '').trim() }
    const errors = cc.validateClientName(values.clientName, credentialList(req))
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        errors,
        errorList: cc.clientNameErrorList(errors)
      })
    }

    // The environment is set from the page the user started on, not the form.
    const credential = cc.createCredential({
      clientName: values.clientName,
      environment: environment.label
    })
    credentialList(req).push(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // The edit page is the create page with the current client name filled in.
  router.get(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    renderClientNameForm(res, {
      environment: environmentFor(credential.environment.toLowerCase()),
      mode: 'edit',
      credential,
      values: { clientName: credential.clientName }
    })
  })

  router.post(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    const values = { clientName: (req.body.clientName || '').trim() }
    // The credential's own name does not count as "already exists".
    const errors = cc.validateClientName(values.clientName, credentialList(req), credential.id)
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        errors,
        errorList: cc.clientNameErrorList(errors)
      })
    }

    // Only a real change counts as a change, so "Last changed" stays put if
    // the user saves without editing.
    if (values.clientName !== credential.clientName) {
      const toChange = cc.credentialToChange(credentialList(req), credential.id)
      toChange.clientName = values.clientName
      toChange.lastChanged = new Date().toISOString()
    }
    res.redirect(tablePath(credential.environment))
  })

  // The one-time reveal, for new credentials and for a rotated secret. Once
  // closed there is nothing left to show, so this sends the user back to the
  // table rather than showing the secret again.
  function renderReveal (res, credential) {
    res.render(view('client-credentials/created'), {
      credential,
      rotated: credential.pendingAction === 'rotated',
      caption: `${credential.environment} credentials`
    })
  }

  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    if (!credential.pendingSecret) return res.redirect(tablePath(credential.environment))
    renderReveal(res, credential)
  })

  // Closing returns to the page for the environment the credentials belong to.
  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    delete credential.pendingSecret
    delete credential.pendingAction
    res.redirect(tablePath(credential.environment))
  })

  // Rotating asks the user to confirm first. Only the POST gives a new secret.
  // A refresh of the reveal page keeps the same new secret, because it is only
  // replaced once the user has closed the page.
  router.get(`${base}/client-credentials/:id/rotate`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    res.render(view('client-credentials/rotate'), {
      credential,
      caption: `${credential.environment} credentials`
    })
  })

  router.post(`${base}/client-credentials/:id/rotate`, (req, res) => {
    if (!cc.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers/test`)
    }
    const credential = cc.credentialToChange(credentialList(req), req.params.id)
    if (credential.pendingAction !== 'rotated') cc.rotateSecret(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })
}

registerV43Routes()

// --- Version 4.4 -----------------------------------------------------------
// A copy of version 4.3, with no changes yet. It has its own function and its
// own session data key, so version 4.3 stays frozen while this is edited.
function registerV44Routes () {
  const base = '/v4-4'
  const view = (page) => `v4-4/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v4-4'
    next()
  })

  // Credentials created or changed in this session. See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsV44)) {
      req.session.data.clientCredentialsV44 = []
    }
    return req.session.data.clientCredentialsV44
  }

  // The environment comes from the URL: /test or /production.
  function environmentFor (key) {
    const match = cc.ENVIRONMENTS.find((e) => e.value.toLowerCase() === key)
    return match ? { key: match.value.toLowerCase(), label: match.value } : null
  }

  function tablePath (environmentLabel) {
    return `${base}/software-providers/${environmentLabel.toLowerCase()}`
  }

  // --- Reporting (same as version 4.1) -----------------------------------------

  router.get(`${base}/regulators`, (req, res) => {
    const filtered = hasDateFilter(req.query)
    const period = filtered ? lenientPeriod(req.query) : emptyPeriod
    const orgs = filtered
      ? reg.listRegisteredInPeriod(period.from, period.to)
      : reg.listAllOrganisations()
    const { rows, pagination, total } = paginate(mapOrgRows(orgs), req.query.page, {
      path: `${base}/regulators`,
      query: req.query,
      itemName: 'organisations'
    })
    res.render(view('regulators/index'), {
      period,
      rows,
      count: total,
      filtered,
      periodLabel: filtered ? periodLabel(period) : null,
      pagination
    })
  })

  // --- Software providers --------------------------------------------------

  // The navigation links here, so it goes to the Test page.
  router.get(`${base}/software-providers`, (req, res) => {
    res.redirect(`${base}/software-providers/test`)
  })

  router.get(`${base}/software-providers/:environment`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    const credentials = cc.listCredentials(credentialList(req))
      .filter((c) => c.environment === environment.label)
      .map((c) => Object.assign({}, c, {
        lastChangedLabel: formatDateTimeObj(new Date(c.lastChanged))
      }))
    res.render(view('software-providers/index'), { environment, credentials })
  })

  // --- Client credentials ---------------------------------------------------

  // The create and edit pages share one form. Only the client name is asked for.
  function renderClientNameForm (res, options) {
    res.render(view('client-credentials/create'), Object.assign({
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    renderClientNameForm(res, {
      environment,
      mode: 'create',
      values: { clientName: '' }
    })
  })

  router.post(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers/test`)
    const values = { clientName: (req.body.clientName || '').trim() }
    const errors = cc.validateClientName(values.clientName, credentialList(req))
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        errors,
        errorList: cc.clientNameErrorList(errors)
      })
    }

    // The environment is set from the page the user started on, not the form.
    const credential = cc.createCredential({
      clientName: values.clientName,
      environment: environment.label
    })
    credentialList(req).push(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // The edit page is the create page with the current client name filled in.
  router.get(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    renderClientNameForm(res, {
      environment: environmentFor(credential.environment.toLowerCase()),
      mode: 'edit',
      credential,
      values: { clientName: credential.clientName }
    })
  })

  router.post(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    const values = { clientName: (req.body.clientName || '').trim() }
    // The credential's own name does not count as "already exists".
    const errors = cc.validateClientName(values.clientName, credentialList(req), credential.id)
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        errors,
        errorList: cc.clientNameErrorList(errors)
      })
    }

    // Only a real change counts as a change, so "Last changed" stays put if
    // the user saves without editing.
    if (values.clientName !== credential.clientName) {
      const toChange = cc.credentialToChange(credentialList(req), credential.id)
      toChange.clientName = values.clientName
      toChange.lastChanged = new Date().toISOString()
    }
    res.redirect(tablePath(credential.environment))
  })

  // The one-time reveal, for new credentials and for a rotated secret. Once
  // closed there is nothing left to show, so this sends the user back to the
  // table rather than showing the secret again.
  function renderReveal (res, credential) {
    res.render(view('client-credentials/created'), {
      credential,
      rotated: credential.pendingAction === 'rotated',
      caption: `${credential.environment} credentials`
    })
  }

  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    if (!credential.pendingSecret) return res.redirect(tablePath(credential.environment))
    renderReveal(res, credential)
  })

  // Closing returns to the page for the environment the credentials belong to.
  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    delete credential.pendingSecret
    delete credential.pendingAction
    res.redirect(tablePath(credential.environment))
  })

  // Rotating asks the user to confirm first. Only the POST gives a new secret.
  // A refresh of the reveal page keeps the same new secret, because it is only
  // replaced once the user has closed the page.
  router.get(`${base}/client-credentials/:id/rotate`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers/test`)
    res.render(view('client-credentials/rotate'), {
      credential,
      caption: `${credential.environment} credentials`
    })
  })

  router.post(`${base}/client-credentials/:id/rotate`, (req, res) => {
    if (!cc.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers/test`)
    }
    const credential = cc.credentialToChange(credentialList(req), req.params.id)
    if (credential.pendingAction !== 'rotated') cc.rotateSecret(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })
}

registerV44Routes()

// --- Version 5 -----------------------------------------------------------
// A copy of version 4.4, with no changes yet. It has its own function and its
// own session data key, so version 4.4 stays frozen while this is edited.
function registerV5Routes () {
  const base = '/v5'
  const view = (page) => `v5/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v5'
    next()
  })

  // Credentials created or changed in this session. See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsV5)) {
      req.session.data.clientCredentialsV5 = []
    }
    return req.session.data.clientCredentialsV5
  }

  // The environment comes from the URL: /test or /production.
  function environmentFor (key) {
    const match = cc.ENVIRONMENTS.find((e) => e.value.toLowerCase() === key)
    return match ? { key: match.value.toLowerCase(), label: match.value } : null
  }

  function tablePath (environmentLabel) {
    return `${base}/software-providers`
  }

  // --- Reporting (same as version 4.1) -----------------------------------------

  router.get(`${base}/regulators`, (req, res) => {
    const filtered = hasDateFilter(req.query)
    const period = filtered ? lenientPeriod(req.query) : emptyPeriod
    const orgs = filtered
      ? reg.listRegisteredInPeriod(period.from, period.to)
      : reg.listAllOrganisations()
    const { rows, pagination, total } = paginate(mapOrgRows(orgs), req.query.page, {
      path: `${base}/regulators`,
      query: req.query,
      itemName: 'organisations'
    })
    res.render(view('regulators/index'), {
      period,
      rows,
      count: total,
      filtered,
      periodLabel: filtered ? periodLabel(period) : null,
      pagination
    })
  })

  // --- Software providers --------------------------------------------------

  // One table for all credentials, Test and Production.
  router.get(`${base}/software-providers`, (req, res) => {
    // Client name, A to Z. The page marks "Client name" as sorted.
    // Production credentials are hidden and Test is shown as "External test".
    // Only the label changes here, so the shared data stays as it is.
    const credentials = cc.listCredentials(credentialList(req))
      .filter((c) => c.environment !== 'Production')
      .map((c) => Object.assign({}, c, { environment: 'External test' }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
    res.render(view('software-providers/index'), { credentials })
  })

  // Old per-environment URLs go to the one table.
  router.get(`${base}/software-providers/:environment`, (req, res) => {
    res.redirect(`${base}/software-providers`)
  })

  // --- Client credentials ---------------------------------------------------

  // The create and edit pages share one form. Only the client name is asked for.
  function renderClientNameForm (res, options) {
    res.render(view('client-credentials/create'), Object.assign({
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers`)
    renderClientNameForm(res, {
      environment,
      mode: 'create',
      values: { clientName: '' }
    })
  })

  router.post(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers`)
    const values = { clientName: (req.body.clientName || '').trim() }
    const errors = cc.validateClientName(values.clientName, credentialList(req))
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        errors,
        errorList: cc.clientNameErrorList(errors)
      })
    }

    // The environment is set from the page the user started on, not the form.
    const credential = cc.createCredential({
      clientName: values.clientName,
      environment: environment.label
    })
    credentialList(req).push(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // The edit page is the create page with the current client name filled in.
  router.get(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    renderClientNameForm(res, {
      environment: environmentFor(credential.environment.toLowerCase()),
      mode: 'edit',
      credential,
      values: { clientName: credential.clientName }
    })
  })

  router.post(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const values = { clientName: (req.body.clientName || '').trim() }
    // The credential's own name does not count as "already exists".
    const errors = cc.validateClientName(values.clientName, credentialList(req), credential.id)
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        errors,
        errorList: cc.clientNameErrorList(errors)
      })
    }

    // Only a real change counts as a change, so "Last changed" stays put if
    // the user saves without editing.
    if (values.clientName !== credential.clientName) {
      const toChange = cc.credentialToChange(credentialList(req), credential.id)
      toChange.clientName = values.clientName
      toChange.lastChanged = new Date().toISOString()
    }
    res.redirect(tablePath(credential.environment))
  })

  // The one-time reveal, for new credentials and for a rotated secret. Once
  // closed there is nothing left to show, so this sends the user back to the
  // table rather than showing the secret again.
  // When each secret was generated, newest first, as text for the page.
  function secretLabels (credential) {
    return cc.secretDates(credential)
      .slice()
      .sort((a, b) => new Date(b) - new Date(a))
      .map((d) => formatDateTimeObj(new Date(d)))
  }

  function renderReveal (res, credential) {
    res.render(view('client-credentials/created'), {
      credential,
      generatedOn: formatDateTimeObj(new Date(credential.lastChanged)),
      // When a second secret is added, the older one is shown redacted below the new one.
      otherSecrets: credential.pendingAction === 'added' ? secretLabels(credential).slice(1) : [],
      added: credential.pendingAction === 'added',
      rotated: credential.pendingAction === 'rotated',
      caption: `${credential.environment} credentials`
    })
  }

  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    if (!credential.pendingSecret) return res.redirect(tablePath(credential.environment))
    renderReveal(res, credential)
  })

  // Closing returns to the page for the environment the credentials belong to.
  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    delete credential.pendingSecret
    delete credential.pendingAction
    res.redirect(tablePath(credential.environment))
  })

  // Rotating asks the user to confirm first. Only the POST gives a new secret.
  // A refresh of the reveal page keeps the same new secret, because it is only
  // replaced once the user has closed the page.
  router.get(`${base}/client-credentials/:id/rotate`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/rotate'), {
      credential,
      secretLabels: secretLabels(credential),
      canAddSecret: cc.secretDates(credential).length < cc.MAX_SECRETS,
      caption: `${credential.environment} credentials`
    })
  })

  router.post(`${base}/client-credentials/:id/rotate`, (req, res) => {
    if (!cc.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = cc.credentialToChange(credentialList(req), req.params.id)
    if (credential.pendingAction !== 'rotated') {
      cc.rotateSecret(credential)
      // Replacing leaves one secret, generated now.
      delete credential.secrets
    }
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // Adding a secret changes data, so it is a POST. Two secrets at most. Goes
  // straight to the page where the new secret is shown once.
  router.post(`${base}/client-credentials/:id/add-secret`, (req, res) => {
    if (!cc.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = cc.credentialToChange(credentialList(req), req.params.id)
    if (cc.secretDates(credential).length < cc.MAX_SECRETS && credential.pendingAction !== 'added') {
      cc.addSecret(credential)
    }
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // Removing the older of two secrets asks the user to confirm first. The most
  // recent secret stays. Only the POST removes it, then the user goes back to
  // the manage page, which now shows one secret.
  router.get(`${base}/client-credentials/:id/remove`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const labels = secretLabels(credential)
    if (labels.length < 2) return res.redirect(`${base}/client-credentials/${credential.id}/rotate`)
    res.render(view('client-credentials/remove'), { credential, olderSecretDate: labels[1] })
  })

  router.post(`${base}/client-credentials/:id/remove`, (req, res) => {
    if (!cc.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = cc.credentialToChange(credentialList(req), req.params.id)
    const dates = cc.secretDates(credential)
    if (dates.length > 1) credential.secrets = dates.slice(-1)
    res.redirect(`${base}/client-credentials/${credential.id}/rotate`)
  })

  // Replacing the secret asks the user to confirm first. The form on this page
  // posts to the rotate route above, which is what replaces the secret.
  router.get(`${base}/client-credentials/:id/replace`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/replace'), { credential })
  })
}

registerV5Routes()

// --- Version 6 -----------------------------------------------------------
// A copy of version 5, with no changes yet. It has its own function and its
// own session data key, so version 5 stays frozen while this is edited.
function registerV6Routes () {
  const base = '/v6'
  const view = (page) => `v6/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v6'
    next()
  })

  // Credentials created or changed in this session. See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsV6)) {
      req.session.data.clientCredentialsV6 = []
    }
    return req.session.data.clientCredentialsV6
  }

  // The environment comes from the URL: /test or /production.
  function environmentFor (key) {
    const match = ccV6.ENVIRONMENTS.find((e) => e.value.toLowerCase() === key)
    return match ? { key: match.value.toLowerCase(), label: match.value } : null
  }

  function tablePath (environmentLabel) {
    return `${base}/software-providers`
  }

  // --- Reporting (same as version 4.1) -----------------------------------------

  router.get(`${base}/regulators`, (req, res) => {
    const filtered = hasDateFilter(req.query)
    const period = filtered ? lenientPeriod(req.query) : emptyPeriod
    const orgs = filtered
      ? reg.listRegisteredInPeriod(period.from, period.to)
      : reg.listAllOrganisations()
    const { rows, pagination, total } = paginate(mapOrgRows(orgs), req.query.page, {
      path: `${base}/regulators`,
      query: req.query,
      itemName: 'organisations'
    })
    res.render(view('regulators/index'), {
      period,
      rows,
      count: total,
      filtered,
      periodLabel: filtered ? periodLabel(period) : null,
      pagination
    })
  })

  // --- Software providers --------------------------------------------------

  // One table for all credentials, Test and Production.
  router.get(`${base}/software-providers`, (req, res) => {
    // Client name, A to Z. The page marks "Client name" as sorted.
    // Production credentials are hidden and Test is shown as "External test".
    // Only the label changes here, so the shared data stays as it is.
    const credentials = ccV6.listCredentials(credentialList(req))
      .filter((c) => c.environment !== 'Production')
      .map((c) => Object.assign({}, c, { environment: 'External test' }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
    res.render(view('software-providers/index'), { credentials })
  })

  // Old per-environment URLs go to the one table.
  router.get(`${base}/software-providers/:environment`, (req, res) => {
    res.redirect(`${base}/software-providers`)
  })

  // --- Client credentials ---------------------------------------------------

  // The create and edit pages share one form. Only the client name is asked for.
  function renderClientNameForm (res, options) {
    res.render(view('client-credentials/create'), Object.assign({
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers`)
    renderClientNameForm(res, {
      environment,
      mode: 'create',
      values: { clientName: '' }
    })
  })

  router.post(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers`)
    const values = { clientName: (req.body.clientName || '').trim() }
    const errors = ccV6.validateClientName(values.clientName, credentialList(req))
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        errors,
        errorList: ccV6.clientNameErrorList(errors)
      })
    }

    // The environment is set from the page the user started on, not the form.
    const credential = ccV6.createCredential({
      clientName: values.clientName,
      environment: environment.label
    })
    credentialList(req).push(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // The edit page is the create page with the current client name filled in.
  router.get(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = ccV6.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    renderClientNameForm(res, {
      environment: environmentFor(credential.environment.toLowerCase()),
      mode: 'edit',
      credential,
      values: { clientName: credential.clientName }
    })
  })

  router.post(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = ccV6.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const values = { clientName: (req.body.clientName || '').trim() }
    // The credential's own name does not count as "already exists".
    const errors = ccV6.validateClientName(values.clientName, credentialList(req), credential.id)
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        errors,
        errorList: ccV6.clientNameErrorList(errors)
      })
    }

    // Only a real change counts as a change, so "Last changed" stays put if
    // the user saves without editing.
    if (values.clientName !== credential.clientName) {
      const toChange = ccV6.credentialToChange(credentialList(req), credential.id)
      toChange.clientName = values.clientName
      toChange.lastChanged = new Date().toISOString()
    }
    res.redirect(tablePath(credential.environment))
  })

  // The one-time reveal, for new credentials and for a rotated secret. Once
  // closed there is nothing left to show, so this sends the user back to the
  // table rather than showing the secret again.
  // When each secret was generated, newest first, as text for the page.
  function secretLabels (credential) {
    return ccV6.secretDates(credential)
      .slice()
      .sort((a, b) => new Date(b) - new Date(a))
      .map((d) => formatDateTimeObj(new Date(d)))
  }

  function renderReveal (res, credential) {
    res.render(view('client-credentials/created'), {
      credential,
      generatedOn: formatDateTimeObj(new Date(credential.lastChanged)),
      added: credential.pendingAction === 'added',
      rotated: credential.pendingAction === 'rotated',
      caption: `${credential.environment} credentials`
    })
  }

  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = ccV6.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    if (!credential.pendingSecret) return res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
    renderReveal(res, credential)
  })

  // Orphan screen: the earlier panel design of the copy page (not linked from the journey, only
  // from the prototype index). Fixed synthetic data, so it opens without a session.
  router.get(`${base}/client-credentials/created-panel`, (req, res) => {
    const credential = {
      id: 'client-1',
      clientName: 'Kerbside_Collect_Test',
      clientId: '7b4ll1di9l73m4lpb9iu0b4k2i',
      pendingSecret: 'k3x9v0m2qz7c1ndw84pbh5ty6fa0ge2ujr9l7s4o1i3x8wc5bn6d'
    }
    res.render(view('client-credentials/created-panel'), {
      credential,
      generatedOn: formatDateTimeObj(new Date('2026-10-21T08:14:00'))
    })
  })

  // Orphan screen: the copy page with GOV.UK warning text.
  router.get(`${base}/client-credentials/created-warning`, (req, res) => {
    const credential = {
      id: 'client-1',
      clientName: 'Kerbside_Collect_Test',
      clientId: '7b4ll1di9l73m4lpb9iu0b4k2i',
      pendingSecret: 'k3x9v0m2qz7c1ndw84pbh5ty6fa0ge2ujr9l7s4o1i3x8wc5bn6d'
    }
    res.render(view('client-credentials/created-warning'), {
      credential,
      generatedOn: formatDateTimeObj(new Date('2026-10-21T08:14:00'))
    })
  })

  // Closing goes to the software provider page, which confirms what was created.
  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = ccV6.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    delete credential.pendingSecret
    delete credential.pendingAction
    // Tells the detail page to tag the new secret, once.
    credential.showNewTag = true
    res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
  })

  // Rotating asks the user to confirm first. Only the POST gives a new secret.
  // A refresh of the reveal page keeps the same new secret, because it is only
  // replaced once the user has closed the page.
  router.get(`${base}/client-credentials/:id/software-provider-detail`, (req, res) => {
    const credential = ccV6.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const showNew = Boolean(credential.showNewTag)
    delete credential.showNewTag
    res.render(view('client-credentials/software-provider-detail'), {
      credential,
      showNew,
      secretLabels: secretLabels(credential),
      canAddSecret: ccV6.secretDates(credential).length < ccV6.MAX_SECRETS,
      caption: `${credential.environment} credentials`
    })
  })

  router.post(`${base}/client-credentials/:id/rotate`, (req, res) => {
    if (!ccV6.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = ccV6.credentialToChange(credentialList(req), req.params.id)
    if (credential.pendingAction !== 'rotated') {
      ccV6.rotateSecret(credential)
      // Replacing leaves one secret, generated now.
      delete credential.secrets
    }
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // Adding a secret changes data, so it is a POST. Two secrets at most. Goes
  // straight to the page where the new secret is shown once.
  router.post(`${base}/client-credentials/:id/add-secret`, (req, res) => {
    if (!ccV6.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = ccV6.credentialToChange(credentialList(req), req.params.id)
    if (ccV6.secretDates(credential).length < ccV6.MAX_SECRETS && credential.pendingAction !== 'added') {
      ccV6.addSecret(credential)
    }
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // Removing the older of two secrets asks the user to confirm first. The most
  // recent secret stays. Only the POST removes it, then the user goes back to
  // the manage page, which now shows one secret.
  router.get(`${base}/client-credentials/:id/remove`, (req, res) => {
    const credential = ccV6.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const labels = secretLabels(credential)
    if (labels.length < 2) return res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
    res.render(view('client-credentials/remove'), { credential, olderSecretDate: labels[1] })
  })

  router.post(`${base}/client-credentials/:id/remove`, (req, res) => {
    if (!ccV6.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = ccV6.credentialToChange(credentialList(req), req.params.id)
    const dates = ccV6.secretDates(credential)
    if (dates.length > 1) credential.secrets = dates.slice(-1)
    res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
  })

  // Replacing the secret asks the user to confirm first. The form on this page
  // posts to the rotate route above, which is what replaces the secret.
  router.get(`${base}/client-credentials/:id/replace`, (req, res) => {
    const credential = ccV6.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/replace'), { credential })
  })
}

registerV6Routes()

// --- Version 7 -----------------------------------------------------------
// A copy of version 6, with no changes yet. It has its own function and its
// own session data key, so version 6 stays frozen while this is edited.
function registerV7Routes () {
  const base = '/v7'
  const view = (page) => `v7/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v7'
    next()
  })

  // Credentials created or changed in this session. See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsV7)) {
      req.session.data.clientCredentialsV7 = []
    }
    return req.session.data.clientCredentialsV7
  }

  // The environment comes from the URL: /test or /production.
  function environmentFor (key) {
    const match = ccV7.ENVIRONMENTS.find((e) => e.value.toLowerCase() === key)
    return match ? { key: match.value.toLowerCase(), label: match.value } : null
  }

  function tablePath (environmentLabel) {
    return `${base}/software-providers`
  }

  // --- Reporting (same as version 4.1) -----------------------------------------

  // Waste organisations report. Rows carry the values the MoJ sortable table
  // needs: dates and periods sort on a number, not on the text shown.
  // The payment year ending is shown as "Sep 2025" (the cycle always ends in September).
  function orgRows (orgs) {
    const byId = new Map(orgs.map((o) => [o.id, o]))
    return mapOrgRows(orgs).map((row) => {
      const match = /(\d{2})$/.exec(row.paymentPeriod)
      return Object.assign({}, row, {
        registeredSort: byId.get(row.id).registeredDate.getTime(),
        paymentPeriod: match ? `Sep 20${match[1]}` : '',
        paymentPeriodSort: match ? Number(match[1]) : 0
      })
    })
  }

  // Checks one date (day, month, year) from the filter. Messages are the ones
  // agreed in the Jira ticket. `parts` lists the inputs to highlight: only the
  // missing or wrong ones, as the GOV.UK dates pattern asks.
  // Returns { error, href, parts, date }.
  function checkReportDate (query, key, label, today) {
    const prefix = `period-${key}`
    const part = (name) => (query[`${prefix}-${name}`] || '').trim()
    const values = { day: part('day'), month: part('month'), year: part('year') }
    const all = ['day', 'month', 'year']
    const missing = all.filter((name) => !values[name])
    const fail = (error, parts) => ({ error, parts, href: `#${prefix}-${parts[0]}` })
    const name = `‘${label}’ date`

    if (missing.length === 3) {
      return fail(`Enter or select a ${name}`, all)
    }
    if (missing.length === 2) {
      return fail(`${name} must include a day, month and year`, all)
    }
    if (missing.length === 1) {
      return fail(`${name} must include a ${missing[0]}`, missing)
    }
    // Letters or other characters, or a year that is not 4 numbers (for example 26).
    const wrong = all.filter((n) => !/^\d+$/.test(values[n]) || (n === 'year' && values[n].length !== 4))
    if (wrong.length) {
      return fail(`Enter the ${name} in the correct format`, wrong)
    }
    const checked = validateDateParts(values.day, values.month, values.year)
    if (checked.error) {
      return fail(`${name} must be a real date`, all)
    }
    if (checked.date > today) {
      return fail(`${name} must be today or in the past`, all)
    }
    return { date: checked.date }
  }

  // The filter is shown first. Results only appear once both dates are valid.
  // Nothing is filled in or swapped for the user.
  function checkReportPeriod (query) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const raw = (key) => ({
      day: (query[`period-${key}-day`] || '').trim(),
      month: (query[`period-${key}-month`] || '').trim(),
      year: (query[`period-${key}-year`] || '').trim()
    })
    const period = {
      values: { from: raw('from'), to: raw('to') },
      errors: {},
      errorParts: { from: [], to: [] },
      errorList: []
    }
    const from = checkReportDate(query, 'from', 'From', today)
    const to = checkReportDate(query, 'to', 'To', today)
    // The 'To' date error names the 'From' date the user entered.
    if (!to.error && from.date && from.date > to.date) {
      Object.assign(to, {
        error: `‘To’ date must be the same as or after ${formatDateObj(from.date)}`,
        parts: ['day', 'month', 'year'],
        href: '#period-to-day'
      })
    }
    for (const [key, result] of [['from', from], ['to', to]]) {
      if (result.error) {
        period.errors[key] = result.error
        period.errorParts[key] = result.parts
        period.errorList.push({ text: result.error, href: result.href })
      }
    }
    if (!period.errorList.length) {
      period.from = from.date
      period.to = to.date
    }
    return period
  }

  router.get(`${base}/regulators`, (req, res) => {
    const submitted = [
      'period-from-day', 'period-from-month', 'period-from-year',
      'period-to-day', 'period-to-month', 'period-to-year'
    ].some((key) => key in req.query)
    const period = submitted ? checkReportPeriod(req.query) : emptyPeriod
    // Every row is shown on one page, so sorting reorders all of them.
    const searched = submitted && !period.errorList.length
    const rows = searched ? orgRows(reg.listRegisteredInPeriod(period.from, period.to)) : []
    res.render(view('regulators/index'), {
      period,
      rows,
      count: rows.length,
      // All registered organisations, shown beside the count for the period.
      totalCount: reg.listAllOrganisations().length,
      filtered: submitted,
      searched,
      periodLabel: searched ? periodLabel(period) : null
    })
  })

  // Download CSV is not built yet — goes to the placeholder page.
  router.get(`${base}/regulators/download`, (req, res) => {
    res.render(view('placeholder'), {
      heading: 'Download CSV',
      activeSection: 'regulators',
      backHref: `${base}/regulators`
    })
  })

  // --- Software providers --------------------------------------------------

  // One table for all credentials, Test and Production.
  router.get(`${base}/software-providers`, (req, res) => {
    // Client name, A to Z. The page marks "Client name" as sorted.
    // Production credentials are hidden and Test is shown as "External test".
    // Only the label changes here, so the shared data stays as it is.
    const credentials = ccV7.listCredentials(credentialList(req))
      .filter((c) => c.environment !== 'Production')
      .filter((c) => !deletedIds(req).includes(c.id))
      .map((c) => Object.assign({}, c, { environment: 'External test' }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
    // The "deleted" message shows once, then is cleared.
    const deletedName = req.session.data.deletedClientNameV7
    delete req.session.data.deletedClientNameV7
    res.render(view('software-providers/index'), { credentials, deletedName })
  })

  // Deleted software providers. The fixed example rows cannot be removed from
  // the shared data, so deleted ids are kept in the session and hidden.
  function deletedIds (req) {
    if (!Array.isArray(req.session.data.deletedCredentialsV7)) {
      req.session.data.deletedCredentialsV7 = []
    }
    return req.session.data.deletedCredentialsV7
  }

  router.get(`${base}/client-credentials/:id/delete`, (req, res) => {
    const credential = ccV7.getCredential(credentialList(req), req.params.id)
    if (!credential || deletedIds(req).includes(credential.id)) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/delete'), { credential })
  })

  router.post(`${base}/client-credentials/:id/delete`, (req, res) => {
    const credential = ccV7.getCredential(credentialList(req), req.params.id)
    // Demo failure: the provider is not deleted, for names starting "Error_".
    if (credential && isDemoError(credential.clientName)) {
      return renderDetail(res, credential, { serviceError: 'Try again. We have not deleted the software provider.' })
    }
    if (credential && !deletedIds(req).includes(credential.id)) {
      deletedIds(req).push(credential.id)
      req.session.data.deletedClientNameV7 = credential.clientName
    }
    res.redirect(`${base}/software-providers`)
  })

  // Old per-environment URLs go to the one table.
  router.get(`${base}/software-providers/:environment`, (req, res) => {
    res.redirect(`${base}/software-providers`)
  })

  // --- Client credentials ---------------------------------------------------

  // The create and edit pages share one form. Only the client name is asked for.
  function renderClientNameForm (res, options) {
    res.render(view('client-credentials/create'), Object.assign({
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers`)
    renderClientNameForm(res, {
      environment,
      mode: 'create',
      values: { clientName: '' }
    })
  })

  router.post(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers`)
    const values = { clientName: (req.body.clientName || '').trim() }
    const errors = ccV7.validateClientName(values.clientName, credentialList(req))
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        errors,
        errorList: ccV7.clientNameErrorList(errors)
      })
    }

    // Demo failure: a client name that starts with "Error_" is not created. The
    // form is shown again with the alert.
    if (isDemoError(values.clientName)) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        serviceError: 'Try again. We have not created client credentials.'
      })
    }

    // The environment is set from the page the user started on, not the form.
    const credential = ccV7.createCredential({
      clientName: values.clientName,
      environment: environment.label
    })
    credentialList(req).push(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // The edit page is the create page with the current client name filled in.
  router.get(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = ccV7.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    renderClientNameForm(res, {
      environment: environmentFor(credential.environment.toLowerCase()),
      mode: 'edit',
      credential,
      values: { clientName: credential.clientName }
    })
  })

  router.post(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = ccV7.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const values = { clientName: (req.body.clientName || '').trim() }
    // The credential's own name does not count as "already exists".
    const errors = ccV7.validateClientName(values.clientName, credentialList(req), credential.id)
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        errors,
        errorList: ccV7.clientNameErrorList(errors)
      })
    }

    // Only a real change counts as a change, so "Last changed" stays put if
    // the user saves without editing.
    if (isDemoError(credential.clientName)) {
      // Demo failure: the name is not saved, for providers starting "Error_".
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        serviceError: 'Try again. We have not changed the client name.'
      })
    }
    if (values.clientName !== credential.clientName) {
      const toChange = ccV7.credentialToChange(credentialList(req), credential.id)
      toChange.clientName = values.clientName
      // lastChanged is not updated: with one secret it is also the date that secret was
      // generated, which a rename must not change.
    }
    // Back to the software provider page, where the user started the edit.
    res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
  })

  // The one-time reveal, for new credentials and for a rotated secret. Once
  // closed there is nothing left to show, so this sends the user back to the
  // table rather than showing the secret again.
  // When each secret was generated, newest first, as text for the page.
  function secretLabels (credential) {
    return ccV7.secretDates(credential)
      .slice()
      .sort((a, b) => new Date(b) - new Date(a))
      .map((d) => formatDateTimeObj(new Date(d)))
  }

  function renderReveal (res, credential) {
    res.render(view('client-credentials/created'), {
      credential,
      generatedOn: formatDateTimeObj(new Date(credential.lastChanged)),
      added: credential.pendingAction === 'added',
      rotated: credential.pendingAction === 'rotated',
      caption: `${credential.environment} credentials`
    })
  }

  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = ccV7.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    if (!credential.pendingSecret) return res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
    renderReveal(res, credential)
  })

  // Orphan screen: the earlier panel design of the copy page (not linked from the journey, only
  // from the prototype index). Fixed synthetic data, so it opens without a session.
  router.get(`${base}/client-credentials/created-panel`, (req, res) => {
    const credential = {
      id: 'client-1',
      clientName: 'Kerbside_Collect_Test',
      clientId: '7b4ll1di9l73m4lpb9iu0b4k2i',
      pendingSecret: 'k3x9v0m2qz7c1ndw84pbh5ty6fa0ge2ujr9l7s4o1i3x8wc5bn6d'
    }
    res.render(view('client-credentials/created-panel'), {
      credential,
      generatedOn: formatDateTimeObj(new Date('2026-10-21T08:14:00'))
    })
  })

  // Orphan screen: the copy page with GOV.UK warning text.
  router.get(`${base}/client-credentials/created-warning`, (req, res) => {
    const credential = {
      id: 'client-1',
      clientName: 'Kerbside_Collect_Test',
      clientId: '7b4ll1di9l73m4lpb9iu0b4k2i',
      pendingSecret: 'k3x9v0m2qz7c1ndw84pbh5ty6fa0ge2ujr9l7s4o1i3x8wc5bn6d'
    }
    res.render(view('client-credentials/created-warning'), {
      credential,
      generatedOn: formatDateTimeObj(new Date('2026-10-21T08:14:00'))
    })
  })

  // Closing goes to the software provider page, which confirms what was created.
  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = ccV7.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    delete credential.pendingSecret
    delete credential.pendingAction
    // Tells the detail page to tag the new secret, once.
    credential.showNewTag = true
    res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
  })

  // Rotating asks the user to confirm first. Only the POST gives a new secret.
  // A refresh of the reveal page keeps the same new secret, because it is only
  // replaced once the user has closed the page.
  router.get(`${base}/client-credentials/:id/software-provider-detail`, (req, res) => {
    const credential = ccV7.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const showNew = Boolean(credential.showNewTag)
    delete credential.showNewTag
    renderDetail(res, credential, { showNew })
  })

  // Names that start with "Error_" always fail, so the service error alert can
  // be shown in research. The example provider Error_Demo_Test is one of them.
  function isDemoError (clientName) {
    return /^error_/i.test(clientName || '')
  }

  function renderDetail (res, credential, extras) {
    res.render(view('client-credentials/software-provider-detail'), Object.assign({
      credential,
      showNew: false,
      secretLabels: secretLabels(credential),
      canAddSecret: ccV7.secretDates(credential).length < ccV7.MAX_SECRETS,
      caption: `${credential.environment} credentials`
    }, extras))
  }

  router.post(`${base}/client-credentials/:id/rotate`, (req, res) => {
    if (!ccV7.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    // Demo failure: the secret is not replaced for a provider whose name starts
    // with "Error_". The user goes back to the software provider page, which
    // shows the alert.
    const target = ccV7.getCredential(credentialList(req), req.params.id)
    if (isDemoError(target.clientName)) {
      return renderDetail(res, target, { serviceError: 'Try again. We have not replaced the secret.' })
    }
    const credential = ccV7.credentialToChange(credentialList(req), req.params.id)
    if (credential.pendingAction !== 'rotated') {
      ccV7.rotateSecret(credential)
      // Replacing leaves one secret, generated now.
      delete credential.secrets
    }
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // Adding a secret changes data, so it is a POST. Two secrets at most. Goes
  // straight to the page where the new secret is shown once.
  router.post(`${base}/client-credentials/:id/add-secret`, (req, res) => {
    if (!ccV7.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    // Demo failure: no secret is added for a provider whose name starts with
    // "Error_". The page is shown again with the alert.
    const target = ccV7.getCredential(credentialList(req), req.params.id)
    if (isDemoError(target.clientName)) {
      return renderDetail(res, target, { serviceError: 'Try again. We have not added a secret.' })
    }
    const credential = ccV7.credentialToChange(credentialList(req), req.params.id)
    if (ccV7.secretDates(credential).length < ccV7.MAX_SECRETS && credential.pendingAction !== 'added') {
      ccV7.addSecret(credential)
    }
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // Removing the older of two secrets asks the user to confirm first. The most
  // recent secret stays. Only the POST removes it, then the user goes back to
  // the manage page, which now shows one secret.
  router.get(`${base}/client-credentials/:id/remove`, (req, res) => {
    const credential = ccV7.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const labels = secretLabels(credential)
    if (labels.length < 2) return res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
    res.render(view('client-credentials/remove'), { credential, olderSecretDate: labels[1] })
  })

  router.post(`${base}/client-credentials/:id/remove`, (req, res) => {
    if (!ccV7.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    // Demo failure: the secret is not removed, for names starting "Error_".
    const target = ccV7.getCredential(credentialList(req), req.params.id)
    if (isDemoError(target.clientName)) {
      return renderDetail(res, target, { serviceError: 'Try again. We have not removed the secret.' })
    }
    const credential = ccV7.credentialToChange(credentialList(req), req.params.id)
    const dates = ccV7.secretDates(credential)
    if (dates.length > 1) credential.secrets = dates.slice(-1)
    res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
  })

  // Replacing the secret asks the user to confirm first. The form on this page
  // posts to the rotate route above, which is what replaces the secret.
  router.get(`${base}/client-credentials/:id/replace`, (req, res) => {
    const credential = ccV7.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/replace'), { credential })
  })
}

registerV7Routes()

// --- Future state: software provider page concept -----------------------------------------------------------
// A copy of version 7, with no changes yet. It has its own function and its
// own session data key, so version 7 stays frozen while this is edited.
function registerFutureSoftwareProviderPageRoutes () {
  const base = '/future/software-provider-page'
  const view = (page) => `future/software-provider-page/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'future/software-provider-page'
    next()
  })

  // Credentials created or changed in this session. See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsFutureSoftwareProviderPage)) {
      req.session.data.clientCredentialsFutureSoftwareProviderPage = []
    }
    return req.session.data.clientCredentialsFutureSoftwareProviderPage
  }

  // The environment comes from the URL: /test or /production.
  function environmentFor (key) {
    const match = ccFutureSoftwareProviderPage.ENVIRONMENTS.find((e) => e.value.toLowerCase() === key)
    return match ? { key: match.value.toLowerCase(), label: match.value } : null
  }

  function tablePath (environmentLabel) {
    return `${base}/software-providers`
  }

  // --- Reporting (same as version 4.1) -----------------------------------------

  // Waste organisations report. Rows carry the values the MoJ sortable table
  // needs: dates and periods sort on a number, not on the text shown.
  // The payment year ending is shown as "Sep 2025" (the cycle always ends in September).
  function orgRows (orgs) {
    const byId = new Map(orgs.map((o) => [o.id, o]))
    return mapOrgRows(orgs).map((row) => {
      const match = /(\d{2})$/.exec(row.paymentPeriod)
      return Object.assign({}, row, {
        registeredSort: byId.get(row.id).registeredDate.getTime(),
        paymentPeriod: match ? `Sep 20${match[1]}` : '',
        paymentPeriodSort: match ? Number(match[1]) : 0
      })
    })
  }

  // Checks one date (day, month, year) from the filter. Messages are the ones
  // agreed in the Jira ticket. `parts` lists the inputs to highlight: only the
  // missing or wrong ones, as the GOV.UK dates pattern asks.
  // Returns { error, href, parts, date }.
  function checkReportDate (query, key, label, today) {
    const prefix = `period-${key}`
    const part = (name) => (query[`${prefix}-${name}`] || '').trim()
    const values = { day: part('day'), month: part('month'), year: part('year') }
    const all = ['day', 'month', 'year']
    const missing = all.filter((name) => !values[name])
    const fail = (error, parts) => ({ error, parts, href: `#${prefix}-${parts[0]}` })
    const name = `‘${label}’ date`

    if (missing.length === 3) {
      return fail(`Enter or select a ${name}`, all)
    }
    if (missing.length === 2) {
      return fail(`${name} must include a day, month and year`, all)
    }
    if (missing.length === 1) {
      return fail(`${name} must include a ${missing[0]}`, missing)
    }
    // Letters or other characters, or a year that is not 4 numbers (for example 26).
    const wrong = all.filter((n) => !/^\d+$/.test(values[n]) || (n === 'year' && values[n].length !== 4))
    if (wrong.length) {
      return fail(`Enter the ${name} in the correct format`, wrong)
    }
    const checked = validateDateParts(values.day, values.month, values.year)
    if (checked.error) {
      return fail(`${name} must be a real date`, all)
    }
    if (checked.date > today) {
      return fail(`${name} must be today or in the past`, all)
    }
    return { date: checked.date }
  }

  // The filter is shown first. Results only appear once both dates are valid.
  // Nothing is filled in or swapped for the user.
  function checkReportPeriod (query) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const raw = (key) => ({
      day: (query[`period-${key}-day`] || '').trim(),
      month: (query[`period-${key}-month`] || '').trim(),
      year: (query[`period-${key}-year`] || '').trim()
    })
    const period = {
      values: { from: raw('from'), to: raw('to') },
      errors: {},
      errorParts: { from: [], to: [] },
      errorList: []
    }
    const from = checkReportDate(query, 'from', 'From', today)
    const to = checkReportDate(query, 'to', 'To', today)
    // The 'To' date error names the 'From' date the user entered.
    if (!to.error && from.date && from.date > to.date) {
      Object.assign(to, {
        error: `‘To’ date must be the same as or after ${formatDateObj(from.date)}`,
        parts: ['day', 'month', 'year'],
        href: '#period-to-day'
      })
    }
    for (const [key, result] of [['from', from], ['to', to]]) {
      if (result.error) {
        period.errors[key] = result.error
        period.errorParts[key] = result.parts
        period.errorList.push({ text: result.error, href: result.href })
      }
    }
    if (!period.errorList.length) {
      period.from = from.date
      period.to = to.date
    }
    return period
  }

  router.get(`${base}/regulators`, (req, res) => {
    const submitted = [
      'period-from-day', 'period-from-month', 'period-from-year',
      'period-to-day', 'period-to-month', 'period-to-year'
    ].some((key) => key in req.query)
    const period = submitted ? checkReportPeriod(req.query) : emptyPeriod
    // Every row is shown on one page, so sorting reorders all of them.
    const searched = submitted && !period.errorList.length
    const rows = searched ? orgRows(reg.listRegisteredInPeriod(period.from, period.to)) : []
    res.render(view('regulators/index'), {
      period,
      rows,
      count: rows.length,
      // All registered organisations, shown beside the count for the period.
      totalCount: reg.listAllOrganisations().length,
      filtered: submitted,
      searched,
      periodLabel: searched ? periodLabel(period) : null
    })
  })

  // Download CSV is not built yet — goes to the placeholder page.
  router.get(`${base}/regulators/download`, (req, res) => {
    res.render(view('placeholder'), {
      heading: 'Download CSV',
      activeSection: 'regulators',
      backHref: `${base}/regulators`
    })
  })

  // --- Software providers --------------------------------------------------

  // One table for all credentials, Test and Production.
  router.get(`${base}/software-providers`, (req, res) => {
    // Client name, A to Z. The page marks "Client name" as sorted.
    // Production credentials are hidden and Test is shown as "External test".
    // Only the label changes here, so the shared data stays as it is.
    const credentials = ccFutureSoftwareProviderPage.listCredentials(credentialList(req))
      .filter((c) => c.environment !== 'Production')
      .map((c) => Object.assign({}, c, { environment: 'External test' }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
    res.render(view('software-providers/index'), { credentials })
  })

  // Old per-environment URLs go to the one table.
  router.get(`${base}/software-providers/:environment`, (req, res) => {
    res.redirect(`${base}/software-providers`)
  })

  // --- Client credentials ---------------------------------------------------

  // The create and edit pages share one form. Only the client name is asked for.
  function renderClientNameForm (res, options) {
    res.render(view('client-credentials/create'), Object.assign({
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers`)
    renderClientNameForm(res, {
      environment,
      mode: 'create',
      values: { clientName: '' }
    })
  })

  router.post(`${base}/client-credentials/:environment/create`, (req, res) => {
    const environment = environmentFor(req.params.environment)
    if (!environment) return res.redirect(`${base}/software-providers`)
    const values = { clientName: (req.body.clientName || '').trim() }
    const errors = ccFutureSoftwareProviderPage.validateClientName(values.clientName, credentialList(req))
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        errors,
        errorList: ccFutureSoftwareProviderPage.clientNameErrorList(errors)
      })
    }

    // The environment is set from the page the user started on, not the form.
    const credential = ccFutureSoftwareProviderPage.createCredential({
      clientName: values.clientName,
      environment: environment.label
    })
    credentialList(req).push(credential)
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // The edit page is the create page with the current client name filled in.
  router.get(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    renderClientNameForm(res, {
      environment: environmentFor(credential.environment.toLowerCase()),
      mode: 'edit',
      credential,
      values: { clientName: credential.clientName }
    })
  })

  router.post(`${base}/client-credentials/:id/edit`, (req, res) => {
    const credential = ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const values = { clientName: (req.body.clientName || '').trim() }
    // The credential's own name does not count as "already exists".
    const errors = ccFutureSoftwareProviderPage.validateClientName(values.clientName, credentialList(req), credential.id)
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        errors,
        errorList: ccFutureSoftwareProviderPage.clientNameErrorList(errors)
      })
    }

    // Only a real change counts as a change, so "Last changed" stays put if
    // the user saves without editing.
    if (values.clientName !== credential.clientName) {
      const toChange = ccFutureSoftwareProviderPage.credentialToChange(credentialList(req), credential.id)
      toChange.clientName = values.clientName
      toChange.lastChanged = new Date().toISOString()
    }
    res.redirect(tablePath(credential.environment))
  })

  // The one-time reveal, for new credentials and for a rotated secret. Once
  // closed there is nothing left to show, so this sends the user back to the
  // table rather than showing the secret again.
  // When each secret was generated, newest first, as text for the page.
  function secretLabels (credential) {
    return ccFutureSoftwareProviderPage.secretDates(credential)
      .slice()
      .sort((a, b) => new Date(b) - new Date(a))
      .map((d) => formatDateTimeObj(new Date(d)))
  }

  function renderReveal (res, credential) {
    res.render(view('client-credentials/created'), {
      credential,
      generatedOn: formatDateTimeObj(new Date(credential.lastChanged)),
      added: credential.pendingAction === 'added',
      rotated: credential.pendingAction === 'rotated',
      caption: `${credential.environment} credentials`
    })
  }

  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    if (!credential.pendingSecret) return res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
    renderReveal(res, credential)
  })

  // Orphan screen: the earlier panel design of the copy page (not linked from the journey, only
  // from the prototype index). Fixed synthetic data, so it opens without a session.
  router.get(`${base}/client-credentials/created-panel`, (req, res) => {
    const credential = {
      id: 'client-1',
      clientName: 'Kerbside_Collect_Test',
      clientId: '7b4ll1di9l73m4lpb9iu0b4k2i',
      pendingSecret: 'k3x9v0m2qz7c1ndw84pbh5ty6fa0ge2ujr9l7s4o1i3x8wc5bn6d'
    }
    res.render(view('client-credentials/created-panel'), {
      credential,
      generatedOn: formatDateTimeObj(new Date('2026-10-21T08:14:00'))
    })
  })

  // Orphan screen: the copy page with GOV.UK warning text.
  router.get(`${base}/client-credentials/created-warning`, (req, res) => {
    const credential = {
      id: 'client-1',
      clientName: 'Kerbside_Collect_Test',
      clientId: '7b4ll1di9l73m4lpb9iu0b4k2i',
      pendingSecret: 'k3x9v0m2qz7c1ndw84pbh5ty6fa0ge2ujr9l7s4o1i3x8wc5bn6d'
    }
    res.render(view('client-credentials/created-warning'), {
      credential,
      generatedOn: formatDateTimeObj(new Date('2026-10-21T08:14:00'))
    })
  })

  // Closing goes to the software provider page, which confirms what was created.
  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    delete credential.pendingSecret
    delete credential.pendingAction
    // Tells the detail page to tag the new secret, once.
    credential.showNewTag = true
    res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
  })

  // Rotating asks the user to confirm first. Only the POST gives a new secret.
  // A refresh of the reveal page keeps the same new secret, because it is only
  // replaced once the user has closed the page.
  // Concept page for a technical discussion. It shows four sets of client
  // secrets: receipt of waste software and collection of waste software, each
  // with a test and a production environment. Each environment has its own
  // client ID and two secrets. The data is mocked and fixed: the first client
  // ID is the credential's own, the others are made from it so they stay the
  // same on every visit. Replace, Remove and Add are not built (placeholder).
  const ID_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789'
  function clientIdVariant (clientId, shift) {
    return clientId.split('').map((c) => ID_CHARACTERS[(ID_CHARACTERS.indexOf(c) + shift) % ID_CHARACTERS.length]).join('')
  }

  // Each environment has its own client name and client ID. The names follow
  // the pattern Provider_Software_Environment (letters and underscores only).
  function detailGroups (credential) {
    const secrets = (newer, older) => [newer, older].map((d) => formatDateTimeObj(new Date(d)))
    const environments = (software, shift, dates) => [
      { name: 'Test environment', hasCredentials: true, clientName: `Kerbside_${software}_Test`, clientId: clientIdVariant(credential.clientId, shift), secrets: secrets(dates[0], dates[1]) },
      { name: 'Production environment', hasCredentials: software !== 'Trackmate', clientName: `Kerbside_${software}_Production`, clientId: clientIdVariant(credential.clientId, shift + 7), secrets: secrets(dates[2], dates[3]) }
    ]
    return [
      { id: 'receipt', heading: 'Trackmate software', environments: environments('Trackmate', 0, ['2026-10-21T08:14:00', '2026-09-14T09:32:00', '2026-10-05T10:15:00', '2026-08-18T13:40:00']) },
      { id: 'collection', heading: 'Skipwaste software', environments: environments('Skipwaste', 11, ['2026-10-12T15:02:00', '2026-09-02T11:20:00', '2026-09-29T14:05:00', '2026-07-30T09:05:00']) }
    ]
  }

  // Fixed example notes, newest first, as text for the page. Synthetic, and
  // not added to or changed in this concept (notes cannot be edited once saved).
  function detailNotes () {
    return [
      ['2026-10-21T08:20:00', 'Replaced the receipt of waste test secret after a routine rotation. Sent the new secret to the software provider by secure message.'],
      ['2026-10-20T16:45:00', 'Received an email from the software provider asking for the receipt of waste test secret to be rotated, as part of their routine security checks.'],
      ['2026-10-12T15:05:00', 'Credentials for the collection of waste software sent to the software provider. They confirmed they received them.'],
      ['2026-09-29T14:10:00', 'Production credentials for the receipt of waste software created after the software provider passed their approval test.']
    ].map(([added, text]) => ({ addedLabel: formatDateTimeObj(new Date(added)), text }))
  }

  // Fixed example overview for the concept. Synthetic email addresses, one primary.
  function detailOverview () {
    return {
      // One status for each type of software.
      statuses: [
        { software: 'Trackmate software', status: 'In production', classes: 'govuk-tag--green' },
        { software: 'Skipwaste software', status: 'In test', classes: '' }
      ],
      emails: [
        { address: 'priya.nair@kerbside-solutions.example.com', primary: true },
        { address: 'support@kerbside-solutions.example.com', primary: false },
        { address: 'tom.baker@kerbside-solutions.example.com', primary: false }
      ]
    }
  }

  router.get(`${base}/client-credentials/:id/software-provider-detail`, (req, res) => {
    const credential = ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/software-provider-detail'), {
      credential,
      // Fixed example name for the concept. The page is for the provider, not one client.
      providerName: 'Kerbside Software Solutions',
      groups: detailGroups(credential),
      overview: detailOverview(),
      notes: detailNotes()
    })
  })

  // Changing secrets is not designed in this concept, so these links come here.
  router.get(`${base}/client-credentials/:id/not-built`, (req, res) => {
    res.render(view('placeholder'), {
      heading: 'Change client secrets',
      backHref: `${base}/client-credentials/${req.params.id}/software-provider-detail`
    })
  })

  router.post(`${base}/client-credentials/:id/rotate`, (req, res) => {
    if (!ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = ccFutureSoftwareProviderPage.credentialToChange(credentialList(req), req.params.id)
    if (credential.pendingAction !== 'rotated') {
      ccFutureSoftwareProviderPage.rotateSecret(credential)
      // Replacing leaves one secret, generated now.
      delete credential.secrets
    }
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // Adding a secret changes data, so it is a POST. Two secrets at most. Goes
  // straight to the page where the new secret is shown once.
  router.post(`${base}/client-credentials/:id/add-secret`, (req, res) => {
    if (!ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = ccFutureSoftwareProviderPage.credentialToChange(credentialList(req), req.params.id)
    if (ccFutureSoftwareProviderPage.secretDates(credential).length < ccFutureSoftwareProviderPage.MAX_SECRETS && credential.pendingAction !== 'added') {
      ccFutureSoftwareProviderPage.addSecret(credential)
    }
    res.redirect(`${base}/client-credentials/${credential.id}/created`)
  })

  // Removing the older of two secrets asks the user to confirm first. The most
  // recent secret stays. Only the POST removes it, then the user goes back to
  // the manage page, which now shows one secret.
  router.get(`${base}/client-credentials/:id/remove`, (req, res) => {
    const credential = ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const labels = secretLabels(credential)
    if (labels.length < 2) return res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
    res.render(view('client-credentials/remove'), { credential, olderSecretDate: labels[1] })
  })

  router.post(`${base}/client-credentials/:id/remove`, (req, res) => {
    if (!ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = ccFutureSoftwareProviderPage.credentialToChange(credentialList(req), req.params.id)
    const dates = ccFutureSoftwareProviderPage.secretDates(credential)
    if (dates.length > 1) credential.secrets = dates.slice(-1)
    res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
  })

  // Replacing the secret asks the user to confirm first. The form on this page
  // posts to the rotate route above, which is what replaces the secret.
  router.get(`${base}/client-credentials/:id/replace`, (req, res) => {
    const credential = ccFutureSoftwareProviderPage.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/replace'), { credential })
  })
}

registerFutureSoftwareProviderPageRoutes()

// --- Version 9 -----------------------------------------------------------
// A copy of version 7, with no changes yet. It has its own function and its
// own session data key, so version 7 stays frozen while this is edited.
function registerV9Routes () {
  const base = '/v9'
  const view = (page) => `v9/${page}`

  router.use(base, (req, res, next) => {
    res.locals.version = 'v9'
    // Environment banner concept: off unless switched on. The list pages set the
    // environment; every other page keeps showing the last one chosen.
    // A second concept puts the environment in the header. Only one is on at a time.
    res.locals.environmentBanner = req.session.data.environmentConceptV9 === 'banner'
    // 'header-page-link' is the header idea with no link in the header: the link is a
    // paragraph above the Create button on the list instead.
    const concept = req.session.data.environmentConceptV9
    // 'header-heading' is the same, with a "Change environment" heading below the Create button.
    res.locals.environmentHeader = ['header', 'header-page-link', 'header-heading'].includes(concept)
    res.locals.environmentHeaderLink = concept === 'header'
    res.locals.environmentPageLink = concept === 'header-page-link'
    res.locals.environmentHeadingLink = concept === 'header-heading'
    // Software provider pages show the environment they belong to. Only the
    // Production list is built for Production, so every other software provider
    // page (detail, create, replace and so on) is External test.
    if (req.path === '/software-providers/production' || req.path.startsWith('/software-providers/production/')) {
      req.session.data.environmentV9 = 'production'
    } else if (req.path.startsWith('/software-providers')) {
      req.session.data.environmentV9 = 'test'
    }
    res.locals.currentEnvironment = req.session.data.environmentV9 || 'test'
    next()
  })

  function setEnvironment (req, res, key) {
    req.session.data.environmentV9 = key
    res.locals.currentEnvironment = key
  }

  // Demo switch for the banner concept. Goes back to the list to show the result.
  router.get(`${base}/environment-:concept/:state`, (req, res) => {
    const concept = req.params.concept
    if (!['banner', 'header', 'header-page-link', 'header-heading'].includes(concept)) return res.redirect(`${base}/software-providers`)
    req.session.data.environmentConceptV9 = req.params.state === 'on' ? concept : null
    res.redirect(`${base}/software-providers`)
  })

  // Credentials created or changed in this session. See data/client-credentials.js.
  function credentialList (req) {
    if (!Array.isArray(req.session.data.clientCredentialsV9) ) {
      req.session.data.clientCredentialsV9 = []
    }
    return req.session.data.clientCredentialsV9
  }

  // The environment comes from the URL: /test or /production.
  function environmentFor (key) {
    const match = ccV9.ENVIRONMENTS.find((e) => e.value.toLowerCase() === key)
    return match ? { key: match.value.toLowerCase(), label: match.value } : null
  }

  function tablePath (environmentLabel) {
    return `${base}/software-providers`
  }

  // --- Sign in with Microsoft Entra ID (ideas only, not enforced) -----------------
  // Nothing else in version 9 asks for sign in, so the existing journeys still
  // work. Three ideas, kept separate: A is minimal (one generic error page), B
  // gives more context on the landing page and a specific error for each cause,
  // C is the landing page every user sees until they have signed in (with B's errors).
  // The landing page the user last saw decides which error page they get.
  // The Microsoft page is a mock: the real one is hosted by Microsoft, so we
  // only design the page before it and the pages it sends the user back to.

  // Only return to pages inside this version, so the link can't send anyone elsewhere.
  function safeReturnTo (value) {
    return typeof value === 'string' && /^\/v9\/[A-Za-z0-9/_\-?=&.]*$/.test(value) ? value : `${base}/start`
  }

  function signInLanding (variant) {
    return (req, res) => {
      req.session.data.signInVariantV9 = variant
      if (req.query.returnTo) req.session.data.signInReturnToV9 = safeReturnTo(req.query.returnTo)
      res.render(view(`sign-in/landing-${variant}`), { hideNavigation: true })
    }
  }
  router.get(`${base}/sign-in`, signInLanding('a'))
  router.get(`${base}/sign-in/b`, signInLanding('b'))
  router.get(`${base}/sign-in/c`, signInLanding('c'))

  // Demo: the user opens a page (default: Software providers) without being signed in.
  router.get(`${base}/sign-in/try`, (req, res) => {
    req.session.data.signedInV9 = false
    req.session.data.signInReturnToV9 = safeReturnTo(req.query.page || `${base}/software-providers`)
    const suffix = ['b', 'c'].includes(req.query.variant) ? `/${req.query.variant}` : ''
    res.redirect(`${base}/sign-in${suffix}`)
  })

  // Idea C has its own mock Microsoft pages: pick an account, then enter a
  // password. Any password signs in. The outcome links on the password page are
  // for the prototype only, to see each error.
  router.get(`${base}/sign-in/c/account`, (req, res) => {
    req.session.data.signInVariantV9 = 'c'
    res.render(view('sign-in/microsoft-c-account'))
  })
  router.get(`${base}/sign-in/c/password`, (req, res) => {
    res.render(view('sign-in/microsoft-c-password'))
  })
  router.post(`${base}/sign-in/c/password`, (req, res) => {
    req.session.data.signedInV9 = true
    // Idea C uses the environment idea "Tag in the header, link under a Change
    // environment heading". It is switched on here, not on the sign in pages,
    // because the landing page heading already names the environment.
    req.session.data.environmentConceptV9 = 'header-heading'
    // Idea C always lands on the home page, not the page the user was on.
    res.redirect(`${base}/start`)
  })
  // Placeholder error page for idea C, until the error content is designed.
  router.get(`${base}/sign-in/c/error`, (req, res) => {
    res.render(view('sign-in/error-c-placeholder'), { hideNavigation: true })
  })

  router.get(`${base}/sign-in/microsoft`, (req, res) => {
    res.render(view('sign-in/microsoft'), { hideNavigation: true })
  })

  router.post(`${base}/sign-in/microsoft`, (req, res) => {
    const outcome = req.body.outcome
    const variant = ['b', 'c'].includes(req.session.data.signInVariantV9) ? req.session.data.signInVariantV9 : 'a'
    if (outcome === 'success') {
      req.session.data.signedInV9 = true
      return res.redirect(safeReturnTo(req.session.data.signInReturnToV9))
    }
    const reason = ['cancelled', 'no-access'].includes(outcome) ? outcome : 'problem'
    // Idea C has one placeholder error page.
    if (variant === 'c') return res.redirect(`${base}/sign-in/c/error`)
    res.redirect(`${base}/sign-in/error-${variant}?reason=${reason}`)
  })

  router.get(`${base}/sign-in/error-:variant(a|b)`, (req, res) => {
    const reason = ['cancelled', 'no-access'].includes(req.query.reason) ? req.query.reason : 'problem'
    res.render(view(`sign-in/error-${req.params.variant}`), { hideNavigation: true, reason })
  })

  // --- Reporting (same as version 4.1) -----------------------------------------

  // Waste organisations report. Rows carry the values the MoJ sortable table
  // needs: dates and periods sort on a number, not on the text shown.
  // The payment year ending is shown as "Sep 2025" (the cycle always ends in September).
  function orgRows (orgs) {
    const byId = new Map(orgs.map((o) => [o.id, o]))
    return mapOrgRows(orgs).map((row) => {
      const match = /(\d{2})$/.exec(row.paymentPeriod)
      return Object.assign({}, row, {
        registeredSort: byId.get(row.id).registeredDate.getTime(),
        paymentPeriod: match ? `Sep 20${match[1]}` : '',
        paymentPeriodSort: match ? Number(match[1]) : 0
      })
    })
  }

  // Checks one date (day, month, year) from the filter. Messages are the ones
  // agreed in the Jira ticket. `parts` lists the inputs to highlight: only the
  // missing or wrong ones, as the GOV.UK dates pattern asks.
  // Returns { error, href, parts, date }.
  function checkReportDate (query, key, label, today) {
    const prefix = `period-${key}`
    const part = (name) => (query[`${prefix}-${name}`] || '').trim()
    const values = { day: part('day'), month: part('month'), year: part('year') }
    const all = ['day', 'month', 'year']
    const missing = all.filter((name) => !values[name])
    const fail = (error, parts) => ({ error, parts, href: `#${prefix}-${parts[0]}` })
    const name = `‘${label}’ date`

    if (missing.length === 3) {
      return fail(`Enter or select a ${name}`, all)
    }
    if (missing.length === 2) {
      return fail(`${name} must include a day, month and year`, all)
    }
    if (missing.length === 1) {
      return fail(`${name} must include a ${missing[0]}`, missing)
    }
    // Letters or other characters, or a year that is not 4 numbers (for example 26).
    const wrong = all.filter((n) => !/^\d+$/.test(values[n]) || (n === 'year' && values[n].length !== 4))
    if (wrong.length) {
      return fail(`Enter the ${name} in the correct format`, wrong)
    }
    const checked = validateDateParts(values.day, values.month, values.year)
    if (checked.error) {
      return fail(`${name} must be a real date`, all)
    }
    if (checked.date > today) {
      return fail(`${name} must be today or in the past`, all)
    }
    return { date: checked.date }
  }

  // The filter is shown first. Results only appear once both dates are valid.
  // Nothing is filled in or swapped for the user.
  function checkReportPeriod (query) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const raw = (key) => ({
      day: (query[`period-${key}-day`] || '').trim(),
      month: (query[`period-${key}-month`] || '').trim(),
      year: (query[`period-${key}-year`] || '').trim()
    })
    const period = {
      values: { from: raw('from'), to: raw('to') },
      errors: {},
      errorParts: { from: [], to: [] },
      errorList: []
    }
    const from = checkReportDate(query, 'from', 'From', today)
    const to = checkReportDate(query, 'to', 'To', today)
    // The 'To' date error names the 'From' date the user entered.
    if (!to.error && from.date && from.date > to.date) {
      Object.assign(to, {
        error: `‘To’ date must be the same as or after ${formatDateObj(from.date)}`,
        parts: ['day', 'month', 'year'],
        href: '#period-to-day'
      })
    }
    for (const [key, result] of [['from', from], ['to', to]]) {
      if (result.error) {
        period.errors[key] = result.error
        period.errorParts[key] = result.parts
        period.errorList.push({ text: result.error, href: result.href })
      }
    }
    if (!period.errorList.length) {
      period.from = from.date
      period.to = to.date
    }
    return period
  }

  router.get(`${base}/regulators`, (req, res) => {
    const submitted = [
      'period-from-day', 'period-from-month', 'period-from-year',
      'period-to-day', 'period-to-month', 'period-to-year'
    ].some((key) => key in req.query)
    const period = submitted ? checkReportPeriod(req.query) : emptyPeriod
    // Every row is shown on one page, so sorting reorders all of them.
    const searched = submitted && !period.errorList.length
    const rows = searched ? orgRows(reg.listRegisteredInPeriod(period.from, period.to)) : []
    res.render(view('regulators/index'), {
      period,
      rows,
      count: rows.length,
      // All registered organisations, shown beside the count for the period.
      totalCount: reg.listAllOrganisations().length,
      filtered: submitted,
      searched,
      periodLabel: searched ? periodLabel(period) : null
    })
  })

  // Download CSV is not built yet — goes to the placeholder page.
  router.get(`${base}/regulators/download`, (req, res) => {
    res.render(view('placeholder'), {
      heading: 'Download CSV',
      activeSection: 'regulators',
      backHref: `${base}/regulators`
    })
  })

  // --- Software providers --------------------------------------------------

  // One table for all credentials, Test and Production.
  router.get(`${base}/software-providers`, (req, res) => {
    // Client name, A to Z. The page marks "Client name" as sorted.
    // Production credentials are hidden and Test is shown as "External test".
    // Only the label changes here, so the shared data stays as it is.
    const credentials = ccV9.listCredentials(credentialList(req))
      .filter((c) => c.environment !== 'Production')
      .filter((c) => !deletedIds(req).includes(c.id))
      .map((c) => Object.assign({}, c, { environment: 'External test' }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
    // The "deleted" message shows once, then is cleared.
    const deletedName = req.session.data.deletedClientNameV9
    delete req.session.data.deletedClientNameV9
    setEnvironment(req, res, 'test')
    res.render(view('software-providers/index'), {
      credentials,
      deletedName,
      environmentLabel: 'External test',
      environmentTagClass: 'govuk-tag--blue',
      showEnvironmentLink: true,
      otherEnvironmentLabel: 'Production',
      otherEnvironmentHref: `${base}/software-providers/production`
    })
  })

  // Mock of the same page for the Production environment. Production detail and
  // create pages are not designed, so those links go to the placeholder page.
  // Must stay above the `:id` routes, or "production" would be read as an id.
  router.get(`${base}/software-providers/production`, (req, res) => {
    const credentials = ccV9.listCredentials(credentialList(req))
      .filter((c) => c.environment === 'Production')
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
    const notBuilt = `${base}/software-providers/production/not-built`
    setEnvironment(req, res, 'production')
    res.render(view('software-providers/index'), {
      credentials,
      environmentLabel: 'Production',
      environmentTagClass: 'govuk-tag--purple',
      showEnvironmentLink: true,
      otherEnvironmentLabel: 'External test',
      otherEnvironmentHref: `${base}/software-providers`,
      createHref: notBuilt,
      detailHref: notBuilt
    })
  })

  router.get(`${base}/software-providers/production/not-built`, (req, res) => {
    res.render(view('placeholder'), {
      heading: 'Production credentials',
      activeSection: 'providers',
      backHref: `${base}/software-providers/production`
    })
  })

  // Deleted software providers. The fixed example rows cannot be removed from
  // the shared data, so deleted ids are kept in the session and hidden.
  function deletedIds (req) {
    if (!Array.isArray(req.session.data.deletedCredentialsV9)) {
      req.session.data.deletedCredentialsV9 = []
    }
    return req.session.data.deletedCredentialsV9
  }

  router.get(`${base}/software-providers/:id/delete`, (req, res) => {
    const credential = ccV9.getCredential(credentialList(req), req.params.id)
    if (!credential || deletedIds(req).includes(credential.id)) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/delete'), { credential })
  })

  router.post(`${base}/software-providers/:id/delete`, (req, res) => {
    const credential = ccV9.getCredential(credentialList(req), req.params.id)
    // Demo failure: the provider is not deleted, for names starting "Error_".
    if (credential && isDemoError(credential.clientName)) {
      return renderDetail(res, credential, { serviceError: 'Try again. We have not deleted the software provider.' })
    }
    if (credential && !deletedIds(req).includes(credential.id)) {
      deletedIds(req).push(credential.id)
      req.session.data.deletedClientNameV9 = credential.clientName
    }
    res.redirect(`${base}/software-providers`)
  })

  // --- Client credentials ---------------------------------------------------

  // The create and edit pages share one form. Only the client name is asked for.
  function renderClientNameForm (res, options) {
    res.render(view('client-credentials/create'), Object.assign({
      errors: {},
      errorList: []
    }, options))
  }

  router.get(`${base}/software-providers/create`, (req, res) => {
    const environment = environmentFor('test')
    renderClientNameForm(res, {
      environment,
      mode: 'create',
      values: { clientName: '' }
    })
  })

  router.post(`${base}/software-providers/create`, (req, res) => {
    const environment = environmentFor('test')
    const values = { clientName: (req.body.clientName || '').trim() }
    const errors = ccV9.validateClientName(values.clientName, credentialList(req))
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        errors,
        errorList: ccV9.clientNameErrorList(errors)
      })
    }

    // Demo failure: a client name that starts with "Error_" is not created. The
    // form is shown again with the alert.
    if (isDemoError(values.clientName)) {
      return renderClientNameForm(res, {
        environment,
        mode: 'create',
        values,
        serviceError: 'Try again. We have not created client credentials.'
      })
    }

    // The environment is set from the page the user started on, not the form.
    const credential = ccV9.createCredential({
      clientName: values.clientName,
      environment: environment.label
    })
    credentialList(req).push(credential)
    res.redirect(`${base}/software-providers/${credential.id}/created`)
  })

  // The edit page is the create page with the current client name filled in.
  router.get(`${base}/software-providers/:id/edit`, (req, res) => {
    const credential = ccV9.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    renderClientNameForm(res, {
      environment: environmentFor(credential.environment.toLowerCase()),
      mode: 'edit',
      credential,
      values: { clientName: credential.clientName }
    })
  })

  router.post(`${base}/software-providers/:id/edit`, (req, res) => {
    const credential = ccV9.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const values = { clientName: (req.body.clientName || '').trim() }
    // The credential's own name does not count as "already exists".
    const errors = ccV9.validateClientName(values.clientName, credentialList(req), credential.id)
    if (Object.keys(errors).length) {
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        errors,
        errorList: ccV9.clientNameErrorList(errors)
      })
    }

    // Only a real change counts as a change, so "Last changed" stays put if
    // the user saves without editing.
    if (isDemoError(credential.clientName)) {
      // Demo failure: the name is not saved, for providers starting "Error_".
      return renderClientNameForm(res, {
        environment: environmentFor(credential.environment.toLowerCase()),
        mode: 'edit',
        credential,
        values,
        serviceError: 'Try again. We have not changed the client name.'
      })
    }
    if (values.clientName !== credential.clientName) {
      const toChange = ccV9.credentialToChange(credentialList(req), credential.id)
      toChange.clientName = values.clientName
      // lastChanged is not updated: with one secret it is also the date that secret was
      // generated, which a rename must not change.
    }
    // Back to the software provider page, where the user started the edit.
    res.redirect(`${base}/software-providers/${credential.id}`)
  })

  // The one-time reveal, for new credentials and for a rotated secret. Once
  // closed there is nothing left to show, so this sends the user back to the
  // table rather than showing the secret again.
  // When each secret was generated, newest first, as text for the page.
  function secretLabels (credential) {
    return ccV9.secretDates(credential)
      .slice()
      .sort((a, b) => new Date(b) - new Date(a))
      .map((d) => formatDateTimeObj(new Date(d)))
  }

  function renderReveal (res, credential) {
    res.render(view('client-credentials/created'), {
      credential,
      generatedOn: formatDateTimeObj(new Date(credential.lastChanged)),
      added: credential.pendingAction === 'added',
      rotated: credential.pendingAction === 'rotated',
      caption: `${credential.environment} credentials`
    })
  }

  router.get(`${base}/software-providers/:id/created`, (req, res) => {
    const credential = ccV9.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    if (!credential.pendingSecret) return res.redirect(`${base}/software-providers/${credential.id}`)
    renderReveal(res, credential)
  })

  // Orphan screen: the earlier panel design of the copy page (not linked from the journey, only
  // from the prototype index). Fixed synthetic data, so it opens without a session.
  router.get(`${base}/software-providers/example/created-panel`, (req, res) => {
    const credential = {
      id: '7b4ll1di9l73m4lpb9iu0b4k2i',
      clientName: 'Kerbside_Collect_Test',
      clientId: '7b4ll1di9l73m4lpb9iu0b4k2i',
      pendingSecret: 'k3x9v0m2qz7c1ndw84pbh5ty6fa0ge2ujr9l7s4o1i3x8wc5bn6d'
    }
    res.render(view('client-credentials/created-panel'), {
      credential,
      generatedOn: formatDateTimeObj(new Date('2026-10-21T08:14:00'))
    })
  })

  // Orphan screen: the copy page with GOV.UK warning text.
  router.get(`${base}/software-providers/example/created-warning`, (req, res) => {
    const credential = {
      id: '7b4ll1di9l73m4lpb9iu0b4k2i',
      clientName: 'Kerbside_Collect_Test',
      clientId: '7b4ll1di9l73m4lpb9iu0b4k2i',
      pendingSecret: 'k3x9v0m2qz7c1ndw84pbh5ty6fa0ge2ujr9l7s4o1i3x8wc5bn6d'
    }
    res.render(view('client-credentials/created-warning'), {
      credential,
      generatedOn: formatDateTimeObj(new Date('2026-10-21T08:14:00'))
    })
  })

  // Closing goes to the software provider page, which confirms what was created.
  router.post(`${base}/software-providers/:id/created`, (req, res) => {
    const credential = ccV9.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    delete credential.pendingSecret
    delete credential.pendingAction
    // Tells the detail page to tag the new secret, once.
    credential.showNewTag = true
    res.redirect(`${base}/software-providers/${credential.id}`)
  })

  // Rotating asks the user to confirm first. Only the POST gives a new secret.
  // A refresh of the reveal page keeps the same new secret, because it is only
  // replaced once the user has closed the page.
  router.get(`${base}/software-providers/:id`, (req, res) => {
    const credential = ccV9.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const showNew = Boolean(credential.showNewTag)
    delete credential.showNewTag
    renderDetail(res, credential, { showNew })
  })

  // Names that start with "Error_" always fail, so the service error alert can
  // be shown in research. The example provider Error_Demo_Test is one of them.
  function isDemoError (clientName) {
    return /^error_/i.test(clientName || '')
  }

  function renderDetail (res, credential, extras) {
    res.render(view('client-credentials/software-provider-detail'), Object.assign({
      credential,
      showNew: false,
      secretLabels: secretLabels(credential),
      canAddSecret: ccV9.secretDates(credential).length < ccV9.MAX_SECRETS,
      caption: `${credential.environment} credentials`
    }, extras))
  }

  router.post(`${base}/software-providers/:id/rotate`, (req, res) => {
    if (!ccV9.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    // Demo failure: the secret is not replaced for a provider whose name starts
    // with "Error_". The user goes back to the software provider page, which
    // shows the alert.
    const target = ccV9.getCredential(credentialList(req), req.params.id)
    if (isDemoError(target.clientName)) {
      return renderDetail(res, target, { serviceError: 'Try again. We have not replaced the secret.' })
    }
    const credential = ccV9.credentialToChange(credentialList(req), req.params.id)
    if (credential.pendingAction !== 'rotated') {
      ccV9.rotateSecret(credential)
      // Replacing leaves one secret, generated now.
      delete credential.secrets
    }
    res.redirect(`${base}/software-providers/${credential.id}/created`)
  })

  // Adding a secret changes data, so it is a POST. Two secrets at most. Goes
  // straight to the page where the new secret is shown once.
  router.post(`${base}/software-providers/:id/add-secret`, (req, res) => {
    if (!ccV9.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    // Demo failure: no secret is added for a provider whose name starts with
    // "Error_". The page is shown again with the alert.
    const target = ccV9.getCredential(credentialList(req), req.params.id)
    if (isDemoError(target.clientName)) {
      return renderDetail(res, target, { serviceError: 'Try again. We have not added a secret.' })
    }
    const credential = ccV9.credentialToChange(credentialList(req), req.params.id)
    if (ccV9.secretDates(credential).length < ccV9.MAX_SECRETS && credential.pendingAction !== 'added') {
      ccV9.addSecret(credential)
    }
    res.redirect(`${base}/software-providers/${credential.id}/created`)
  })

  // Removing the older of two secrets asks the user to confirm first. The most
  // recent secret stays. Only the POST removes it, then the user goes back to
  // the manage page, which now shows one secret.
  router.get(`${base}/software-providers/:id/remove`, (req, res) => {
    const credential = ccV9.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const labels = secretLabels(credential)
    if (labels.length < 2) return res.redirect(`${base}/software-providers/${credential.id}`)
    res.render(view('client-credentials/remove'), { credential, olderSecretDate: labels[1] })
  })

  router.post(`${base}/software-providers/:id/remove`, (req, res) => {
    if (!ccV9.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    // Demo failure: the secret is not removed, for names starting "Error_".
    const target = ccV9.getCredential(credentialList(req), req.params.id)
    if (isDemoError(target.clientName)) {
      return renderDetail(res, target, { serviceError: 'Try again. We have not removed the secret.' })
    }
    const credential = ccV9.credentialToChange(credentialList(req), req.params.id)
    const dates = ccV9.secretDates(credential)
    if (dates.length > 1) credential.secrets = dates.slice(-1)
    res.redirect(`${base}/software-providers/${credential.id}`)
  })

  // Replacing the secret asks the user to confirm first. The form on this page
  // posts to the rotate route above, which is what replaces the secret.
  router.get(`${base}/software-providers/:id/replace`, (req, res) => {
    const credential = ccV9.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/replace'), { credential })
  })
}

registerV9Routes()

// --- Future state: case file concept ----------------------------------------------------------
// A future-state concept, built around the October 2026 task flows: one case
// file for each software provider. It has its own function, its own data file
// (data/future-case-files.js) and its own session data keys, so version 9 stays
// frozen. Allocation is out of scope.
function registerFutureCaseFilesRoutes () {
  const base = '/future/case-files'
  const view = (page) => `future/case-files/${page}`

  // Data in session, with its own keys for this version — no backend. Each
  // session starts with a copy of the example case files.
  // The audits refer to actions on the case files, so the three lists are
  // always set up together.
  function caseFiles (req) {
    const data = req.session.data
    if (!Array.isArray(data.caseFilesFutureCaseFiles) || !Array.isArray(data.systemActionsFutureCaseFiles) || !data.auditsFutureCaseFiles) {
      data.caseFilesFutureCaseFiles = cf.exampleCaseFiles()
      data.systemActionsFutureCaseFiles = cf.exampleSystemActions()
      data.auditsFutureCaseFiles = cf.exampleAudits()
    }
    return data.caseFilesFutureCaseFiles
  }
  // Messages sent to a group of software providers (Contact providers).
  const systemActions = (req) => caseFiles(req) && req.session.data.systemActionsFutureCaseFiles
  // The audit under way, if there is one, and the completed audits.
  const audits = (req) => caseFiles(req) && req.session.data.auditsFutureCaseFiles

  // Mock sign-in with two roles (see USERS in the data file). Anyone who opens
  // a page without signing in is the case worker, so links from the prototype
  // index still work.
  function currentUser (req) {
    return cf.USERS[req.session.data.userFutureCaseFiles] || cf.USERS.caseworker
  }

  // Who did an action, for the history.
  const by = (req) => ({ by: currentUser(req).name })

  // A message shown once, on the next page the user sees. For example "Case file created".
  function flash (req, title, text) {
    req.session.data.flashFutureCaseFiles = { title, text }
  }

  // The pages an auditor can open under Software providers: the list, and a
  // case file's Overview, Contacts, History and software package pages. Every
  // other page there changes something, so only a case worker can use it.
  const VIEW_ONLY = /^\/software-providers(\/(?!create$)[^/]+(\/(contacts|history|packages\/[^/]+))?)?$/

  router.use(base, (req, res, next) => {
    const user = currentUser(req)
    const path = req.path.replace(/\/$/, '')
    res.locals.version = 'future/case-files'
    res.locals.user = user
    res.locals.signedIn = path !== '/sign-in'
    // Pages hide their action links and buttons when this is false.
    res.locals.canEdit = user.key === 'caseworker'
    if (req.method === 'GET') {
      res.locals.flash = req.session.data.flashFutureCaseFiles
      delete req.session.data.flashFutureCaseFiles
    }
    const blocked = user.key === 'auditor'
      ? (path.startsWith('/software-providers') && !VIEW_ONLY.test(path)) || path.startsWith('/contact-providers')
      : path.startsWith('/audit')
    if (blocked) {
      return res.status(403).render(view('no-permission'), {
        activeSection: path.startsWith('/audit') ? 'audit' : (path.startsWith('/contact-providers') ? 'contact' : 'providers')
      })
    }
    next()
  })

  // --- Sign in and home ------------------------------------------------------

  router.get(`${base}/sign-in`, (req, res) => {
    res.render(view('sign-in'), { errors: {}, errorList: [] })
  })

  router.post(`${base}/sign-in`, (req, res) => {
    if (!cf.USERS[req.body.signInAs]) {
      const text = 'Select who you want to sign in as'
      return res.render(view('sign-in'), {
        errors: { signInAs: text },
        errorList: [{ text, href: '#signInAs' }]
      })
    }
    req.session.data.userFutureCaseFiles = req.body.signInAs
    res.redirect(`${base}/start`)
  })

  router.get(`${base}/sign-out`, (req, res) => {
    delete req.session.data.userFutureCaseFiles
    res.redirect(`${base}/sign-in`)
  })

  // The home page has a search and a link to each status, so common lists are
  // one click away and do not need the filter.
  router.get(`${base}/start`, (req, res) => {
    res.render(view('start'), { statusCounts: cf.statusCounts(caseFiles(req)) })
  })

  // --- Reporting (copied from version 9, unchanged) -------------------------

  // Waste organisations report. Rows carry the values the MoJ sortable table
  // needs: dates and periods sort on a number, not on the text shown.
  // The payment year ending is shown as "Sep 2025" (the cycle always ends in September).
  function orgRows (orgs) {
    const byId = new Map(orgs.map((o) => [o.id, o]))
    return mapOrgRows(orgs).map((row) => {
      const match = /(\d{2})$/.exec(row.paymentPeriod)
      return Object.assign({}, row, {
        registeredSort: byId.get(row.id).registeredDate.getTime(),
        paymentPeriod: match ? `Sep 20${match[1]}` : '',
        paymentPeriodSort: match ? Number(match[1]) : 0
      })
    })
  }

  // Checks one date (day, month, year) from the filter. Messages are the ones
  // agreed in the Jira ticket. `parts` lists the inputs to highlight: only the
  // missing or wrong ones, as the GOV.UK dates pattern asks.
  // Returns { error, href, parts, date }.
  function checkReportDate (query, key, label, today) {
    const prefix = `period-${key}`
    const part = (name) => (query[`${prefix}-${name}`] || '').trim()
    const values = { day: part('day'), month: part('month'), year: part('year') }
    const all = ['day', 'month', 'year']
    const missing = all.filter((name) => !values[name])
    const fail = (error, parts) => ({ error, parts, href: `#${prefix}-${parts[0]}` })
    const name = `‘${label}’ date`

    if (missing.length === 3) {
      return fail(`Enter or select a ${name}`, all)
    }
    if (missing.length === 2) {
      return fail(`${name} must include a day, month and year`, all)
    }
    if (missing.length === 1) {
      return fail(`${name} must include a ${missing[0]}`, missing)
    }
    // Letters or other characters, or a year that is not 4 numbers (for example 26).
    const wrong = all.filter((n) => !/^\d+$/.test(values[n]) || (n === 'year' && values[n].length !== 4))
    if (wrong.length) {
      return fail(`Enter the ${name} in the correct format`, wrong)
    }
    const checked = validateDateParts(values.day, values.month, values.year)
    if (checked.error) {
      return fail(`${name} must be a real date`, all)
    }
    if (checked.date > today) {
      return fail(`${name} must be today or in the past`, all)
    }
    return { date: checked.date }
  }

  // The filter is shown first. Results only appear once both dates are valid.
  // Nothing is filled in or swapped for the user.
  function checkReportPeriod (query) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const raw = (key) => ({
      day: (query[`period-${key}-day`] || '').trim(),
      month: (query[`period-${key}-month`] || '').trim(),
      year: (query[`period-${key}-year`] || '').trim()
    })
    const period = {
      values: { from: raw('from'), to: raw('to') },
      errors: {},
      errorParts: { from: [], to: [] },
      errorList: []
    }
    const from = checkReportDate(query, 'from', 'From', today)
    const to = checkReportDate(query, 'to', 'To', today)
    // The 'To' date error names the 'From' date the user entered.
    if (!to.error && from.date && from.date > to.date) {
      Object.assign(to, {
        error: `‘To’ date must be the same as or after ${formatDateObj(from.date)}`,
        parts: ['day', 'month', 'year'],
        href: '#period-to-day'
      })
    }
    for (const [key, result] of [['from', from], ['to', to]]) {
      if (result.error) {
        period.errors[key] = result.error
        period.errorParts[key] = result.parts
        period.errorList.push({ text: result.error, href: result.href })
      }
    }
    if (!period.errorList.length) {
      period.from = from.date
      period.to = to.date
    }
    return period
  }

  router.get(`${base}/regulators`, (req, res) => {
    const submitted = [
      'period-from-day', 'period-from-month', 'period-from-year',
      'period-to-day', 'period-to-month', 'period-to-year'
    ].some((key) => key in req.query)
    const period = submitted ? checkReportPeriod(req.query) : emptyPeriod
    // Every row is shown on one page, so sorting reorders all of them.
    const searched = submitted && !period.errorList.length
    const rows = searched ? orgRows(reg.listRegisteredInPeriod(period.from, period.to)) : []
    res.render(view('regulators/index'), {
      period,
      rows,
      count: rows.length,
      // All registered organisations, shown beside the count for the period.
      totalCount: reg.listAllOrganisations().length,
      filtered: submitted,
      searched,
      periodLabel: searched ? periodLabel(period) : null
    })
  })

  // Download CSV is not built yet — goes to the placeholder page.
  router.get(`${base}/regulators/download`, (req, res) => {
    res.render(view('placeholder'), {
      heading: 'Download CSV',
      activeSection: 'regulators',
      backHref: `${base}/regulators`
    })
  })

  // --- Software providers: find a case file -----------------------------------

  // "Closed" is not a status of a software package, but it can be filtered on.
  const FILTER_STATUSES = cf.STATUSES.concat({ key: 'closed', text: 'Closed' })

  router.get(`${base}/software-providers`, (req, res) => {
    const search = (req.query.search || '').trim()
    const statuses = [].concat(req.query.status || [])
      .filter((key) => FILTER_STATUSES.some((s) => s.key === key))
    // The address of the list with these filters, for the links that remove one filter.
    const listHref = (searchText, statusKeys) => {
      const params = new URLSearchParams()
      if (searchText) params.set('search', searchText)
      statusKeys.forEach((key) => params.append('status', key))
      const query = params.toString()
      return `${base}/software-providers${query ? `?${query}` : ''}`
    }
    res.render(view('software-providers/index'), {
      rows: cf.listRows(caseFiles(req), { search, statuses }),
      search,
      filtered: Boolean(search || statuses.length),
      statusItems: FILTER_STATUSES.map((s) => ({ value: s.key, text: s.text, checked: statuses.includes(s.key) })),
      selectedSearch: search ? [{ text: search, href: listHref('', statuses) }] : [],
      selectedStatuses: statuses.map((key) => ({
        text: FILTER_STATUSES.find((s) => s.key === key).text,
        href: listHref(search, statuses.filter((other) => other !== key))
      }))
    })
  })

  // --- Shared form helpers -----------------------------------------------------

  // Shows a form page. `values`, `errors` and `errorList` are always given, so
  // the pages do not have to check that they exist.
  function form (res, page, options) {
    res.render(view(page), Object.assign({ values: {}, errors: {}, errorList: [] }, options))
  }

  // One answer from a form, with spaces at the start and end removed.
  const answer = (req, name) => String(req.body[name] || '').trim()

  const failed = (errors) => Object.keys(errors).length > 0

  // Reads the shared reason question (_reason.html) and adds any problem to `errors`.
  function readReason (req, reasons, errors) {
    const result = cf.checkReason(req.body, reasons)
    Object.assign(errors, result.errors)
    return result
  }
  const REASON_FIELDS = [['reason', '#reason'], ['reasonDetails', '#reasonDetails']]

  // Organisation details: three questions, asked when creating a case file and
  // when changing it (_organisation-details.html).
  const DETAIL_QUESTIONS = [
    { name: 'providerType', options: cf.PROVIDER_TYPES, error: 'Select the provider type' },
    { name: 'developerType', options: cf.DEVELOPER_TYPES, error: 'Select the developer type' },
    { name: 'size', options: cf.SIZES, error: 'Select the size of the organisation' }
  ]
  const DETAIL_FIELDS = DETAIL_QUESTIONS.map((question) => [question.name, `#${question.name}`])
  const detailOptions = { providerTypes: cf.PROVIDER_TYPES, developerTypes: cf.DEVELOPER_TYPES, sizes: cf.SIZES }

  function readDetails (req, errors) {
    const values = {}
    DETAIL_QUESTIONS.forEach((question) => {
      values[question.name] = answer(req, question.name)
      if (!question.options.includes(values[question.name])) errors[question.name] = question.error
    })
    return values
  }

  // A contact's details (_contact-fields.html).
  const CONTACT_FIELDS = [['name', '#name'], ['email', '#email']]

  function readContact (req, errors) {
    const values = {
      name: answer(req, 'name'),
      jobTitle: answer(req, 'jobTitle'),
      email: answer(req, 'email'),
      phone: answer(req, 'phone')
    }
    Object.assign(errors, cf.validateContact(values))
    return values
  }

  // "I have not checked yet", on the page that asks if a contact can act for the organisation.
  const NOT_CHECKED = 'not-checked'

  // --- Software providers: create a case file ----------------------------------

  // Organisation name, possible matches, organisation details, key contact,
  // can they act for the organisation, then check answers. The answers are kept
  // in the session until the case file is created. Once the user has seen
  // "Check your answers", a changed step goes straight back there.
  // These routes must stay above the `/software-providers/:id` routes.
  function draft (req) {
    if (!req.session.data.newCaseFileFutureCaseFiles) req.session.data.newCaseFileFutureCaseFiles = {}
    return req.session.data.newCaseFileFutureCaseFiles
  }
  const createHref = (step) => `${base}/software-providers/create${step ? `/${step}` : ''}`
  const afterStep = (req, step) => createHref(draft(req).checked ? 'check' : step)

  // The first step that has no answer yet, or null if they all have one.
  function missingStep (answers) {
    if (!answers.name) return ''
    if (!answers.details) return 'details'
    if (!answers.contact) return 'contact'
    if (answers.verifyMethod === undefined) return 'authority'
    return null
  }

  router.get(createHref(), (req, res) => {
    // "Create a case file" on the list adds ?new=yes, to start with empty answers.
    if (req.query.new) {
      delete req.session.data.newCaseFileFutureCaseFiles
      return res.redirect(createHref())
    }
    form(res, 'software-providers/create/name', { values: { name: draft(req).name || '' } })
  })

  router.post(createHref(), (req, res) => {
    const name = answer(req, 'name')
    if (!name) {
      const errors = { name: 'Enter the name of the organisation' }
      return form(res, 'software-providers/create/name', {
        values: { name },
        errors,
        errorList: cf.errorList(errors, [['name', '#name']])
      })
    }
    // A new or changed name is checked against the case files we already have.
    const answers = draft(req)
    if (answers.name !== name) delete answers.notDuplicate
    answers.name = name
    if (!answers.notDuplicate && cf.similarProviders(caseFiles(req), name).length) {
      return res.redirect(createHref('matches'))
    }
    res.redirect(afterStep(req, 'details'))
  })

  function renderMatches (req, res, options) {
    form(res, 'software-providers/create/matches', Object.assign({
      name: draft(req).name,
      matches: cf.similarProviders(caseFiles(req), draft(req).name).map((p) => cf.toProviderView(p))
    }, options))
  }

  router.get(createHref('matches'), (req, res) => {
    if (!draft(req).name) return res.redirect(createHref())
    renderMatches(req, res)
  })

  router.post(createHref('matches'), (req, res) => {
    const answers = draft(req)
    if (!answers.name) return res.redirect(createHref())
    const choice = answer(req, 'match')
    if (choice === 'none') {
      answers.notDuplicate = true
      return res.redirect(afterStep(req, 'details'))
    }
    const match = cf.similarProviders(caseFiles(req), answers.name).find((p) => p.id === choice)
    if (!match) {
      const errors = { match: `Select if ${answers.name} is one of these organisations` }
      return renderMatches(req, res, { errors, errorList: cf.errorList(errors, [['match', '#match']]) })
    }
    // The organisation already has a case file, so a new one is not needed.
    delete req.session.data.newCaseFileFutureCaseFiles
    res.redirect(`${base}/software-providers/${match.id}`)
  })

  router.get(createHref('details'), (req, res) => {
    const answers = draft(req)
    if (!answers.name) return res.redirect(createHref())
    form(res, 'software-providers/create/details', Object.assign({
      name: answers.name,
      values: Object.assign({}, answers.details, answers.reason && answers.reason.values),
      reasons: cf.REASONS.createCaseFile
    }, detailOptions))
  })

  router.post(createHref('details'), (req, res) => {
    const answers = draft(req)
    if (!answers.name) return res.redirect(createHref())
    const errors = {}
    const details = readDetails(req, errors)
    const reason = readReason(req, cf.REASONS.createCaseFile, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/create/details', Object.assign({
        name: answers.name,
        values: Object.assign({}, details, reason.values),
        errors,
        errorList: cf.errorList(errors, DETAIL_FIELDS.concat(REASON_FIELDS)),
        reasons: cf.REASONS.createCaseFile
      }, detailOptions))
    }
    answers.details = details
    answers.reason = { values: reason.values, text: reason.text }
    res.redirect(afterStep(req, 'contact'))
  })

  router.get(createHref('contact'), (req, res) => {
    const answers = draft(req)
    if (!answers.details) return res.redirect(createHref(missingStep(answers)))
    form(res, 'software-providers/create/contact', { name: answers.name, values: answers.contact || {} })
  })

  router.post(createHref('contact'), (req, res) => {
    const answers = draft(req)
    if (!answers.details) return res.redirect(createHref(missingStep(answers)))
    const errors = {}
    const values = readContact(req, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/create/contact', {
        name: answers.name,
        values,
        errors,
        errorList: cf.errorList(errors, CONTACT_FIELDS)
      })
    }
    answers.contact = values
    res.redirect(afterStep(req, 'authority'))
  })

  // The same page is used later to check a contact on a case file (see below).
  function renderAuthority (req, res, options) {
    const answers = draft(req)
    form(res, 'software-providers/verify-contact', Object.assign({
      contactName: answers.contact.name,
      organisationName: answers.name,
      methods: cf.VERIFY_METHODS,
      allowNotChecked: true,
      action: createHref('authority'),
      backHref: createHref('contact'),
      cancelHref: `${base}/software-providers`,
      buttonText: 'Continue',
      values: { method: answers.verifyMethod === null ? NOT_CHECKED : answers.verifyMethod }
    }, options))
  }

  router.get(createHref('authority'), (req, res) => {
    const answers = draft(req)
    if (!answers.contact) return res.redirect(createHref(missingStep(answers)))
    renderAuthority(req, res)
  })

  router.post(createHref('authority'), (req, res) => {
    const answers = draft(req)
    if (!answers.contact) return res.redirect(createHref(missingStep(answers)))
    const method = answer(req, 'method')
    if (method !== NOT_CHECKED && !cf.VERIFY_METHODS.includes(method)) {
      const errors = { method: `Select how you checked that ${answers.contact.name} can act for ${answers.name}, or select ‘I have not checked yet’` }
      return renderAuthority(req, res, { values: { method }, errors, errorList: cf.errorList(errors, [['method', '#method']]) })
    }
    answers.verifyMethod = method === NOT_CHECKED ? null : method
    res.redirect(createHref('check'))
  })

  router.get(createHref('check'), (req, res) => {
    const answers = draft(req)
    const missing = missingStep(answers)
    if (missing !== null) return res.redirect(createHref(missing))
    answers.checked = true
    res.render(view('software-providers/create/check'), { answers })
  })

  router.post(createHref('check'), (req, res) => {
    const answers = draft(req)
    const missing = missingStep(answers)
    if (missing !== null) return res.redirect(createHref(missing))
    const provider = cf.createProvider(caseFiles(req), Object.assign({
      name: answers.name,
      contact: answers.contact,
      verifyMethod: answers.verifyMethod,
      reason: answers.reason.text
    }, answers.details), by(req))
    delete req.session.data.newCaseFileFutureCaseFiles
    flash(req, 'Case file created', `The reference for ${provider.name} is ${provider.reference}. Add a software package so you can create credentials.`)
    res.redirect(`${base}/software-providers/${provider.id}`)
  })

  // --- Software providers: view a case file -----------------------------------

  // Finds the case file named in the URL and hands it to the page's route. If
  // there is no such case file, the user goes back to the list.
  const withProvider = (handler) => (req, res) => {
    const provider = cf.findProvider(caseFiles(req), req.params.id)
    if (!provider) return res.redirect(`${base}/software-providers`)
    res.locals.provider = cf.toProviderView(provider)
    // A closed case file cannot be changed.
    res.locals.canEdit = res.locals.canEdit && !provider.closed
    handler(req, res, provider)
  }

  // The same, for a page about one software package.
  const withPackage = (handler) => withProvider((req, res, provider) => {
    const pkg = cf.findPackage(provider, req.params.packageId)
    if (!pkg) return res.redirect(`${base}/software-providers/${provider.id}`)
    res.locals.pkg = cf.toPackageView(provider, pkg)
    handler(req, res, provider, pkg)
  })

  // Must stay below any `/software-providers/create` routes, or "create" would be read as an id.
  router.get(`${base}/software-providers/:id`, withProvider((req, res, provider) => {
    res.render(view('software-providers/overview'), {
      recentHistory: cf.toHistoryView(provider.history).slice(0, 3)
    })
  }))

  router.get(`${base}/software-providers/:id/contacts`, withProvider((req, res) => {
    res.render(view('software-providers/contacts'))
  }))

  // History can be narrowed to one type of action, one software package, or both.
  router.get(`${base}/software-providers/:id/history`, withProvider((req, res, provider) => {
    const all = cf.toHistoryView(provider.history)
    const categories = [...new Set(all.map((entry) => entry.category))].sort()
    const category = categories.includes(req.query.category) ? req.query.category : ''
    const pkg = cf.findPackage(provider, req.query.package)
    res.render(view('software-providers/history'), {
      entries: all.filter((entry) =>
        (!category || entry.category === category) && (!pkg || entry.packageId === pkg.id)),
      total: all.length,
      categoryItems: [{ value: '', text: 'All types of action' }]
        .concat(categories.map((c) => ({ value: c, text: c })))
        .map((item) => Object.assign(item, { selected: item.value === category })),
      packageItems: [{ value: '', text: 'All software packages' }]
        .concat(provider.packages.map((p) => ({ value: p.id, text: p.name })))
        .map((item) => Object.assign(item, { selected: item.value === (pkg ? pkg.id : '') })),
      filtered: Boolean(category || pkg)
    })
  }))

  router.get(`${base}/software-providers/:id/packages/:packageId`, withPackage((req, res) => {
    res.render(view('software-providers/package'))
  }))

  // --- Software providers: change a case file ---------------------------------

  const overviewHref = (provider) => `${base}/software-providers/${provider.id}`

  // A page that changes a case file. A closed case file cannot be changed, so
  // the user goes back to its overview.
  const changeProvider = (handler) => withProvider((req, res, provider) => {
    if (provider.closed) return res.redirect(overviewHref(provider))
    handler(req, res, provider)
  })

  // The same, for a page about one contact.
  const changeContact = (handler) => changeProvider((req, res, provider) => {
    const contact = cf.findContact(provider, req.params.contactId)
    if (!contact) return res.redirect(`${overviewHref(provider)}/contacts`)
    res.locals.contact = cf.toContactView(contact)
    handler(req, res, provider, contact)
  })

  // An answer that is waiting for the user to confirm it on the next page.
  function setPending (req, action, provider, values) {
    req.session.data.pendingFutureCaseFiles = Object.assign({ action, providerId: provider.id }, values)
  }
  function getPending (req, action, provider) {
    const pending = req.session.data.pendingFutureCaseFiles
    return pending && pending.action === action && pending.providerId === provider.id ? pending : null
  }

  router.get(`${base}/software-providers/:id/add-package`, changeProvider((req, res) => {
    form(res, 'software-providers/add-package', { reasons: cf.REASONS.addPackage })
  }))

  router.post(`${base}/software-providers/:id/add-package`, changeProvider((req, res, provider) => {
    const errors = {}
    const name = answer(req, 'name')
    if (!name) {
      errors.name = 'Enter the name of the software package'
    } else if (provider.packages.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      errors.name = `${provider.name} already has a software package with this name. Enter a different name`
    }
    const reason = readReason(req, cf.REASONS.addPackage, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/add-package', {
        values: Object.assign({ name }, reason.values),
        errors,
        errorList: cf.errorList(errors, [['name', '#name']].concat(REASON_FIELDS)),
        reasons: cf.REASONS.addPackage
      })
    }
    const pkg = cf.addPackage(provider, name, reason.text, by(req))
    flash(req, 'Software package added', `Create external test credentials when ${provider.name} is ready to test ${name}.`)
    res.redirect(`${overviewHref(provider)}/packages/${pkg.id}`)
  }))

  router.get(`${base}/software-providers/:id/change-name`, changeProvider((req, res, provider) => {
    form(res, 'software-providers/change-name', { values: { name: provider.name }, reasons: cf.REASONS.changeName })
  }))

  router.post(`${base}/software-providers/:id/change-name`, changeProvider((req, res, provider) => {
    const errors = {}
    const name = answer(req, 'name')
    if (!name) errors.name = 'Enter the name of the organisation'
    // Saving without a change goes back to the overview, and nothing is recorded.
    if (name === provider.name) return res.redirect(overviewHref(provider))
    const reason = readReason(req, cf.REASONS.changeName, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/change-name', {
        values: Object.assign({ name }, reason.values),
        errors,
        errorList: cf.errorList(errors, [['name', '#name']].concat(REASON_FIELDS)),
        reasons: cf.REASONS.changeName
      })
    }
    cf.updateName(provider, name, reason.text, by(req))
    flash(req, 'Organisation name changed', `The organisation name is now ${name}.`)
    res.redirect(overviewHref(provider))
  }))

  router.get(`${base}/software-providers/:id/change-details`, changeProvider((req, res, provider) => {
    form(res, 'software-providers/change-details', Object.assign({
      values: { providerType: provider.providerType, developerType: provider.developerType, size: provider.size },
      reasons: cf.REASONS.changeDetails
    }, detailOptions))
  }))

  router.post(`${base}/software-providers/:id/change-details`, changeProvider((req, res, provider) => {
    const errors = {}
    const details = readDetails(req, errors)
    const reason = readReason(req, cf.REASONS.changeDetails, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/change-details', Object.assign({
        values: Object.assign({}, details, reason.values),
        errors,
        errorList: cf.errorList(errors, DETAIL_FIELDS.concat(REASON_FIELDS)),
        reasons: cf.REASONS.changeDetails
      }, detailOptions))
    }
    if (cf.updateDetails(provider, details, reason.text, by(req))) {
      flash(req, 'Organisation details changed')
    }
    res.redirect(overviewHref(provider))
  }))

  // --- Software providers: contacts ---------------------------------------------

  // Adding and changing a contact share one page (contact-form.html).
  router.get(`${base}/software-providers/:id/contacts/add`, changeProvider((req, res) => {
    form(res, 'software-providers/contact-form', { mode: 'add', reasons: cf.REASONS.addContact })
  }))

  router.post(`${base}/software-providers/:id/contacts/add`, changeProvider((req, res, provider) => {
    const errors = {}
    const values = readContact(req, errors)
    values.keyContact = Boolean(req.body.keyContact)
    const reason = readReason(req, cf.REASONS.addContact, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/contact-form', {
        mode: 'add',
        values: Object.assign(values, reason.values),
        errors,
        errorList: cf.errorList(errors, CONTACT_FIELDS.concat(REASON_FIELDS)),
        reasons: cf.REASONS.addContact
      })
    }
    const contact = cf.addContact(provider, values, reason.text, by(req))
    flash(req, 'Contact added', `Check that ${contact.name} can act for ${provider.name} before you send them credentials.`)
    res.redirect(`${overviewHref(provider)}/contacts`)
  }))

  router.get(`${base}/software-providers/:id/contacts/:contactId/change`, changeContact((req, res, provider, contact) => {
    form(res, 'software-providers/contact-form', { mode: 'change', values: contact, reasons: cf.REASONS.changeContact })
  }))

  router.post(`${base}/software-providers/:id/contacts/:contactId/change`, changeContact((req, res, provider, contact) => {
    const errors = {}
    const values = readContact(req, errors)
    values.keyContact = contact.keyContact || Boolean(req.body.keyContact)
    const reason = readReason(req, cf.REASONS.changeContact, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/contact-form', {
        mode: 'change',
        values: Object.assign(values, reason.values),
        errors,
        errorList: cf.errorList(errors, CONTACT_FIELDS.concat(REASON_FIELDS)),
        reasons: cf.REASONS.changeContact
      })
    }
    const emailChanged = contact.email !== values.email
    cf.updateContact(provider, contact, values, reason.text, by(req))
    flash(req, 'Contact changed', emailChanged
      ? `The email address changed, so check again that ${contact.name} can act for ${provider.name}.`
      : undefined)
    res.redirect(`${overviewHref(provider)}/contacts`)
  }))

  // Checking a contact: the method is the reason, so no other reason is asked for.
  function renderVerify (res, provider, contact, options) {
    form(res, 'software-providers/verify-contact', Object.assign({
      contactName: contact.name,
      organisationName: provider.name,
      methods: cf.VERIFY_METHODS,
      action: `${overviewHref(provider)}/contacts/${contact.id}/verify`,
      backHref: `${overviewHref(provider)}/contacts`,
      cancelHref: `${overviewHref(provider)}/contacts`,
      buttonText: 'Save'
    }, options))
  }

  router.get(`${base}/software-providers/:id/contacts/:contactId/verify`, changeContact((req, res, provider, contact) => {
    renderVerify(res, provider, contact)
  }))

  router.post(`${base}/software-providers/:id/contacts/:contactId/verify`, changeContact((req, res, provider, contact) => {
    const method = answer(req, 'method')
    if (!cf.VERIFY_METHODS.includes(method)) {
      const errors = { method: `Select how you checked that ${contact.name} can act for ${provider.name}` }
      return renderVerify(res, provider, contact, { errors, errorList: cf.errorList(errors, [['method', '#method']]) })
    }
    cf.verifyContact(provider, contact, method, by(req))
    flash(req, 'Contact checked', `${contact.name} can act for ${provider.name}. You can send them credentials.`)
    res.redirect(`${overviewHref(provider)}/contacts`)
  }))

  // The key contact cannot be removed. Another contact has to be made the key contact first.
  router.get(`${base}/software-providers/:id/contacts/:contactId/remove`, changeContact((req, res, provider, contact) => {
    if (contact.keyContact) return res.redirect(`${overviewHref(provider)}/contacts`)
    form(res, 'software-providers/contact-remove', { reasons: cf.REASONS.removeContact })
  }))

  router.post(`${base}/software-providers/:id/contacts/:contactId/remove`, changeContact((req, res, provider, contact) => {
    if (contact.keyContact) return res.redirect(`${overviewHref(provider)}/contacts`)
    const errors = {}
    const reason = readReason(req, cf.REASONS.removeContact, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/contact-remove', {
        values: reason.values,
        errors,
        errorList: cf.errorList(errors, REASON_FIELDS),
        reasons: cf.REASONS.removeContact
      })
    }
    cf.removeContact(provider, contact, reason.text, by(req))
    flash(req, 'Contact removed', `${contact.name} has been removed from the case file.`)
    res.redirect(`${overviewHref(provider)}/contacts`)
  }))

  // --- Software providers: record a contact with the provider --------------------

  router.get(`${base}/software-providers/:id/record-contact`, changeProvider((req, res) => {
    form(res, 'software-providers/record-contact', { reasons: cf.REASONS.recordContact, channels: cf.CHANNELS })
  }))

  router.post(`${base}/software-providers/:id/record-contact`, changeProvider((req, res, provider) => {
    const errors = {}
    const values = {
      who: answer(req, 'who'),
      otherName: answer(req, 'otherName'),
      channel: answer(req, 'channel'),
      summary: answer(req, 'summary')
    }
    const contact = cf.findContact(provider, values.who)
    if (!contact && values.who !== 'other') {
      errors.who = 'Select who you were in contact with'
    } else if (values.who === 'other' && !values.otherName) {
      errors.otherName = 'Enter the name of the person you were in contact with'
    }
    if (!cf.CHANNELS.includes(values.channel)) errors.channel = 'Select how you were in contact'
    const reason = readReason(req, cf.REASONS.recordContact, errors)
    if (!values.summary) errors.summary = 'Enter a summary of the contact'
    if (failed(errors)) {
      return form(res, 'software-providers/record-contact', {
        values: Object.assign(values, reason.values),
        errors,
        errorList: cf.errorList(errors, [['who', '#who'], ['otherName', '#otherName'], ['channel', '#channel']]
          .concat(REASON_FIELDS, [['summary', '#summary']])),
        reasons: cf.REASONS.recordContact,
        channels: cf.CHANNELS
      })
    }
    cf.recordContact(provider, {
      who: contact ? contact.name : values.otherName,
      verified: Boolean(contact && contact.verified),
      channel: values.channel,
      reason: reason.text,
      summary: values.summary
    }, by(req))
    flash(req, 'Contact recorded', 'It has been added to the history of this case file.')
    res.redirect(overviewHref(provider))
  }))

  // --- Software providers: remove a software provider ------------------------------

  // Two steps: the reason, then "Are you sure?". Only the second POST removes it.
  router.get(`${base}/software-providers/:id/remove`, changeProvider((req, res) => {
    form(res, 'software-providers/remove', { reasons: cf.REASONS.removeProvider })
  }))

  router.post(`${base}/software-providers/:id/remove`, changeProvider((req, res, provider) => {
    const errors = {}
    const reason = readReason(req, cf.REASONS.removeProvider, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/remove', {
        values: reason.values,
        errors,
        errorList: cf.errorList(errors, REASON_FIELDS),
        reasons: cf.REASONS.removeProvider
      })
    }
    setPending(req, 'remove-provider', provider, { reason: reason.text })
    res.redirect(`${overviewHref(provider)}/remove/confirm`)
  }))

  router.get(`${base}/software-providers/:id/remove/confirm`, changeProvider((req, res, provider) => {
    const pending = getPending(req, 'remove-provider', provider)
    if (!pending) return res.redirect(`${overviewHref(provider)}/remove`)
    res.render(view('software-providers/remove-confirm'), { pending })
  }))

  router.post(`${base}/software-providers/:id/remove/confirm`, changeProvider((req, res, provider) => {
    const pending = getPending(req, 'remove-provider', provider)
    if (!pending) return res.redirect(`${overviewHref(provider)}/remove`)
    cf.closeProvider(provider, pending.reason, by(req))
    delete req.session.data.pendingFutureCaseFiles
    flash(req, 'Software provider removed', `The credentials for ${provider.name} have been deleted and its case file is closed.`)
    res.redirect(`${base}/software-providers`)
  }))

  // --- Software packages: credentials ------------------------------------------

  // The user never sees a client secret. They choose a contact who has been
  // checked as able to act for the organisation, and the system sends the
  // secret to them. Each journey is a question page, then a check page, and
  // only the POST from the check page does anything.

  const packageHref = (provider, pkg) => `${overviewHref(provider)}/packages/${pkg.id}`

  // A page that changes one software package.
  const changePackage = (handler) => withPackage((req, res, provider, pkg) => {
    if (provider.closed) return res.redirect(overviewHref(provider))
    handler(req, res, provider, pkg)
  })

  // The same, for one environment of the package (`test` or `production` in the URL).
  const changeCredential = (handler) => changePackage((req, res, provider, pkg) => {
    const environment = res.locals.pkg.environments.find((e) => e.key === req.params.env)
    if (!environment) return res.redirect(packageHref(provider, pkg))
    res.locals.environment = environment
    handler(req, res, provider, pkg, environment)
  })

  // An answer waiting to be confirmed, for this package and environment only.
  function getPendingCredential (req, action, provider, pkg, environment) {
    const pending = getPending(req, action, provider)
    return pending && pending.packageId === pkg.id && pending.env === environment.key ? pending : null
  }

  // Reads "Who should we send it to?" (_send-to.html). Only a checked contact can be chosen.
  function readSendTo (req, provider, errors, what) {
    const contact = cf.findContact(provider, answer(req, 'contact'))
    if (!contact || !contact.verified) {
      errors.contact = `Select who we should send the ${what} to`
      return null
    }
    return contact
  }

  const credentialHref = (provider, pkg, environment, page) =>
    `${packageHref(provider, pkg)}/credentials/${environment.key}/${page}`

  // Create credentials
  router.get(`${base}/software-providers/:id/packages/:packageId/credentials/:env/create`, changeCredential((req, res, provider, pkg, environment) => {
    if (!environment.canCreate) return res.redirect(packageHref(provider, pkg))
    const pending = getPendingCredential(req, 'create-credentials', provider, pkg, environment)
    form(res, 'software-providers/credentials/create', { values: { contact: pending ? pending.contactId : '' } })
  }))

  router.post(`${base}/software-providers/:id/packages/:packageId/credentials/:env/create`, changeCredential((req, res, provider, pkg, environment) => {
    if (!environment.canCreate) return res.redirect(packageHref(provider, pkg))
    const errors = {}
    const contact = readSendTo(req, provider, errors, 'client secret')
    if (failed(errors)) {
      return form(res, 'software-providers/credentials/create', {
        errors,
        errorList: cf.errorList(errors, [['contact', '#contact']])
      })
    }
    setPending(req, 'create-credentials', provider, { packageId: pkg.id, env: environment.key, contactId: contact.id })
    res.redirect(credentialHref(provider, pkg, environment, 'create/check'))
  }))

  router.get(`${base}/software-providers/:id/packages/:packageId/credentials/:env/create/check`, changeCredential((req, res, provider, pkg, environment) => {
    const pending = getPendingCredential(req, 'create-credentials', provider, pkg, environment)
    const contact = pending && cf.findContact(provider, pending.contactId)
    if (!environment.canCreate || !contact) return res.redirect(credentialHref(provider, pkg, environment, 'create'))
    res.render(view('software-providers/credentials/create-check'), {
      sendTo: contact,
      clientName: cf.clientNameFor(provider, pkg, environment)
    })
  }))

  router.post(`${base}/software-providers/:id/packages/:packageId/credentials/:env/create/check`, changeCredential((req, res, provider, pkg, environment) => {
    const pending = getPendingCredential(req, 'create-credentials', provider, pkg, environment)
    const contact = pending && cf.findContact(provider, pending.contactId)
    if (!environment.canCreate || !contact || !contact.verified) return res.redirect(credentialHref(provider, pkg, environment, 'create'))
    cf.createCredentials(provider, pkg, environment.key, contact, by(req))
    delete req.session.data.pendingFutureCaseFiles
    flash(req, `${environment.text} credentials created`, `We have sent the client ID and a one-time link to the client secret to ${contact.name} (${contact.email}).`)
    res.redirect(packageHref(provider, pkg))
  }))

  // Replace a secret: routine, or after a security breach
  const REPLACE_TYPES = ['routine', 'breach']
  const canReplace = (pkgView, environment) => pkgView.active && Boolean(environment.credential)

  router.get(`${base}/software-providers/:id/packages/:packageId/credentials/:env/replace`, changeCredential((req, res, provider, pkg, environment) => {
    if (!canReplace(res.locals.pkg, environment)) return res.redirect(packageHref(provider, pkg))
    const pending = getPendingCredential(req, 'replace-secret', provider, pkg, environment)
    form(res, 'software-providers/credentials/replace', {
      values: pending ? { type: pending.type, details: pending.details, contact: pending.contactId } : {}
    })
  }))

  router.post(`${base}/software-providers/:id/packages/:packageId/credentials/:env/replace`, changeCredential((req, res, provider, pkg, environment) => {
    if (!canReplace(res.locals.pkg, environment)) return res.redirect(packageHref(provider, pkg))
    const errors = {}
    const values = { type: answer(req, 'type'), details: answer(req, 'details'), contact: answer(req, 'contact') }
    if (!REPLACE_TYPES.includes(values.type)) {
      errors.type = 'Select why you are replacing the secret'
    } else if (values.type === 'routine' && environment.credential.oldSecretWaiting) {
      // Only two secrets can work at once.
      errors.type = 'Remove the old secret before you start another routine replacement'
    } else if (values.type === 'breach' && !values.details) {
      errors.details = 'Enter what happened'
    }
    const contact = readSendTo(req, provider, errors, 'new secret')
    if (failed(errors)) {
      return form(res, 'software-providers/credentials/replace', {
        values,
        errors,
        errorList: cf.errorList(errors, [['type', '#type'], ['details', '#details'], ['contact', '#contact']])
      })
    }
    setPending(req, 'replace-secret', provider, {
      packageId: pkg.id,
      env: environment.key,
      type: values.type,
      details: values.type === 'breach' ? values.details : '',
      contactId: contact.id
    })
    res.redirect(credentialHref(provider, pkg, environment, 'replace/check'))
  }))

  router.get(`${base}/software-providers/:id/packages/:packageId/credentials/:env/replace/check`, changeCredential((req, res, provider, pkg, environment) => {
    const pending = getPendingCredential(req, 'replace-secret', provider, pkg, environment)
    const contact = pending && cf.findContact(provider, pending.contactId)
    if (!canReplace(res.locals.pkg, environment) || !contact) return res.redirect(credentialHref(provider, pkg, environment, 'replace'))
    res.render(view('software-providers/credentials/replace-check'), { pending, sendTo: contact, breach: pending.type === 'breach' })
  }))

  router.post(`${base}/software-providers/:id/packages/:packageId/credentials/:env/replace/check`, changeCredential((req, res, provider, pkg, environment) => {
    const pending = getPendingCredential(req, 'replace-secret', provider, pkg, environment)
    const contact = pending && cf.findContact(provider, pending.contactId)
    if (!canReplace(res.locals.pkg, environment) || !contact || !contact.verified) return res.redirect(credentialHref(provider, pkg, environment, 'replace'))
    const breach = pending.type === 'breach'
    cf.replaceSecret(provider, pkg, environment.key, contact, { breach, details: pending.details }, by(req))
    delete req.session.data.pendingFutureCaseFiles
    flash(req, `${environment.text} secret replaced`, breach
      ? `The earlier secret has stopped working. We have sent a one-time link to the new secret to ${contact.name} (${contact.email}).`
      : `We have sent a one-time link to the new secret to ${contact.name} (${contact.email}). Remove the old secret when they have changed over.`)
    res.redirect(packageHref(provider, pkg))
  }))

  // Remove the old secret, to finish a routine replacement
  const canRemoveSecret = (pkgView, environment) =>
    pkgView.active && Boolean(environment.credential) && environment.credential.oldSecretWaiting

  router.get(`${base}/software-providers/:id/packages/:packageId/credentials/:env/remove-secret`, changeCredential((req, res, provider, pkg, environment) => {
    if (!canRemoveSecret(res.locals.pkg, environment)) return res.redirect(packageHref(provider, pkg))
    form(res, 'software-providers/credentials/remove-secret', { reasons: cf.REASONS.removeSecret })
  }))

  router.post(`${base}/software-providers/:id/packages/:packageId/credentials/:env/remove-secret`, changeCredential((req, res, provider, pkg, environment) => {
    if (!canRemoveSecret(res.locals.pkg, environment)) return res.redirect(packageHref(provider, pkg))
    const errors = {}
    const reason = readReason(req, cf.REASONS.removeSecret, errors)
    if (failed(errors)) {
      return form(res, 'software-providers/credentials/remove-secret', {
        values: reason.values,
        errors,
        errorList: cf.errorList(errors, REASON_FIELDS),
        reasons: cf.REASONS.removeSecret
      })
    }
    cf.removeOldSecret(provider, pkg, environment.key, reason.text, by(req))
    flash(req, `Old ${environment.lower} secret removed`, 'The old secret no longer works.')
    res.redirect(packageHref(provider, pkg))
  }))

  // --- Software packages: approval for production -----------------------------

  // Record the production approval test (PAT) result, or an exception that was
  // agreed. A package can only be approved once one of these is recorded.
  const PAT_KEYS = cf.PAT_OUTCOMES.map((outcome) => outcome.key)

  router.get(`${base}/software-providers/:id/packages/:packageId/pat-result`, changePackage((req, res, provider, pkg) => {
    if (!res.locals.pkg.canRecordPat) return res.redirect(packageHref(provider, pkg))
    form(res, 'software-providers/pat-result', {
      values: pkg.pat ? { outcome: pkg.pat.outcome, details: pkg.pat.details } : {}
    })
  }))

  router.post(`${base}/software-providers/:id/packages/:packageId/pat-result`, changePackage((req, res, provider, pkg) => {
    if (!res.locals.pkg.canRecordPat) return res.redirect(packageHref(provider, pkg))
    const errors = {}
    const values = { outcome: answer(req, 'outcome'), details: answer(req, 'details') }
    if (!PAT_KEYS.includes(values.outcome)) {
      errors.outcome = 'Select the result of the production approval test'
    } else if (values.outcome === 'exception' && !values.details) {
      errors.details = 'Enter what exception was agreed, and who agreed it'
    }
    if (failed(errors)) {
      return form(res, 'software-providers/pat-result', {
        values,
        errors,
        errorList: cf.errorList(errors, [['outcome', '#outcome'], ['details', '#details']])
      })
    }
    cf.recordPat(provider, pkg, values, by(req))
    flash(req, 'Production approval test result recorded', values.outcome === 'failed'
      ? `${pkg.name} cannot be approved for production until it passes, or an exception is agreed.`
      : `You can now approve ${pkg.name} for production.`)
    res.redirect(packageHref(provider, pkg))
  }))

  router.get(`${base}/software-providers/:id/packages/:packageId/approve`, changePackage((req, res, provider, pkg) => {
    if (!res.locals.pkg.canApprove) return res.redirect(packageHref(provider, pkg))
    res.render(view('software-providers/approve'))
  }))

  router.post(`${base}/software-providers/:id/packages/:packageId/approve`, changePackage((req, res, provider, pkg) => {
    if (!res.locals.pkg.canApprove) return res.redirect(packageHref(provider, pkg))
    cf.approve(provider, pkg, by(req))
    flash(req, `${pkg.name} approved for production`, 'You can now create production credentials.')
    res.redirect(packageHref(provider, pkg))
  }))

  // --- Software packages: suspend, reactivate and revoke access -----------------

  // One page each (access.html): the reason and a message for the software
  // provider, which goes to the key contact. Revoking cannot be undone, so it
  // has an "Are you sure?" step as well.
  const ACCESS_ACTIONS = {
    suspend: {
      can: 'canSuspend',
      reasons: cf.REASONS.suspend,
      run: cf.suspend,
      done: (pkg) => ['Access suspended', `${pkg.name} cannot connect to external test or production until you reactivate it.`]
    },
    reactivate: {
      can: 'canReactivate',
      reasons: cf.REASONS.reactivate,
      run: cf.reactivate,
      done: (pkg) => ['Access reactivated', `${pkg.name} can connect again with its existing credentials.`]
    },
    revoke: {
      can: 'canRevoke',
      reasons: cf.REASONS.revoke,
      run: cf.revoke,
      confirm: true,
      done: (pkg) => ['Access revoked', `The credentials for ${pkg.name} have been deleted.`]
    }
  }

  Object.keys(ACCESS_ACTIONS).forEach((key) => {
    const action = ACCESS_ACTIONS[key]
    const path = `${base}/software-providers/:id/packages/:packageId/${key}`
    const page = (res, options) => form(res, 'software-providers/access', Object.assign({
      action: key,
      reasons: action.reasons
    }, options))
    const finish = (req, res, provider, pkg, reason, message) => {
      action.run(provider, pkg, reason, message, by(req))
      flash(req, ...action.done(pkg))
      res.redirect(packageHref(provider, pkg))
    }

    router.get(path, changePackage((req, res, provider, pkg) => {
      if (!res.locals.pkg[action.can]) return res.redirect(packageHref(provider, pkg))
      page(res)
    }))

    router.post(path, changePackage((req, res, provider, pkg) => {
      if (!res.locals.pkg[action.can]) return res.redirect(packageHref(provider, pkg))
      const errors = {}
      const reason = readReason(req, action.reasons, errors)
      const message = answer(req, 'message')
      if (!message) errors.message = 'Enter a message to the software provider'
      if (failed(errors)) {
        return page(res, {
          values: Object.assign({ message }, reason.values),
          errors,
          errorList: cf.errorList(errors, REASON_FIELDS.concat([['message', '#message']]))
        })
      }
      if (!action.confirm) return finish(req, res, provider, pkg, reason.text, message)
      setPending(req, key, provider, { packageId: pkg.id, reason: reason.text, message })
      res.redirect(`${packageHref(provider, pkg)}/${key}/confirm`)
    }))

    if (!action.confirm) return

    const pendingFor = (req, provider, pkg) => {
      const pending = getPending(req, key, provider)
      return pending && pending.packageId === pkg.id ? pending : null
    }

    router.get(`${path}/confirm`, changePackage((req, res, provider, pkg) => {
      const pending = pendingFor(req, provider, pkg)
      if (!res.locals.pkg[action.can] || !pending) return res.redirect(`${packageHref(provider, pkg)}/${key}`)
      res.render(view(`software-providers/${key}-confirm`), { pending })
    }))

    router.post(`${path}/confirm`, changePackage((req, res, provider, pkg) => {
      const pending = pendingFor(req, provider, pkg)
      if (!res.locals.pkg[action.can] || !pending) return res.redirect(`${packageHref(provider, pkg)}/${key}`)
      delete req.session.data.pendingFutureCaseFiles
      finish(req, res, provider, pkg, pending.reason, pending.message)
    }))
  })

  // --- Software packages: move to another software provider ---------------------

  // For when a software package changes hands. Choose the new software provider
  // and the reason, then "Are you sure?". The package takes its credentials and
  // its history with it. With many software providers this would be a search.
  const moveTargets = (req, provider) => caseFiles(req)
    .filter((other) => other.id !== provider.id && !other.closed)
    .sort((a, b) => a.name.localeCompare(b.name))

  const movePending = (req, provider, pkg) => {
    const pending = getPending(req, 'move-package', provider)
    return pending && pending.packageId === pkg.id ? pending : null
  }

  function renderMove (req, res, provider, options) {
    form(res, 'software-providers/move', Object.assign({
      targets: moveTargets(req, provider).map((other) => ({ id: other.id, name: other.name, reference: other.reference })),
      reasons: cf.REASONS.movePackage
    }, options))
  }

  router.get(`${base}/software-providers/:id/packages/:packageId/move`, changePackage((req, res, provider, pkg) => {
    if (!res.locals.pkg.canMove) return res.redirect(packageHref(provider, pkg))
    renderMove(req, res, provider)
  }))

  router.post(`${base}/software-providers/:id/packages/:packageId/move`, changePackage((req, res, provider, pkg) => {
    if (!res.locals.pkg.canMove) return res.redirect(packageHref(provider, pkg))
    const errors = {}
    const to = moveTargets(req, provider).find((other) => other.id === answer(req, 'to'))
    if (!to) errors.to = `Select the software provider that ${pkg.name} is moving to`
    const reason = readReason(req, cf.REASONS.movePackage, errors)
    if (failed(errors)) {
      return renderMove(req, res, provider, {
        values: Object.assign({ to: to ? to.id : '' }, reason.values),
        errors,
        errorList: cf.errorList(errors, [['to', '#to']].concat(REASON_FIELDS))
      })
    }
    setPending(req, 'move-package', provider, { packageId: pkg.id, toId: to.id, reason: reason.text })
    res.redirect(`${packageHref(provider, pkg)}/move/confirm`)
  }))

  router.get(`${base}/software-providers/:id/packages/:packageId/move/confirm`, changePackage((req, res, provider, pkg) => {
    const pending = movePending(req, provider, pkg)
    const to = pending && moveTargets(req, provider).find((other) => other.id === pending.toId)
    if (!res.locals.pkg.canMove || !to) return res.redirect(`${packageHref(provider, pkg)}/move`)
    res.render(view('software-providers/move-confirm'), { pending, to: { name: to.name, reference: to.reference } })
  }))

  router.post(`${base}/software-providers/:id/packages/:packageId/move/confirm`, changePackage((req, res, provider, pkg) => {
    const pending = movePending(req, provider, pkg)
    const to = pending && moveTargets(req, provider).find((other) => other.id === pending.toId)
    if (!res.locals.pkg.canMove || !to) return res.redirect(`${packageHref(provider, pkg)}/move`)
    cf.movePackage(provider, pkg, to, pending.reason, by(req))
    delete req.session.data.pendingFutureCaseFiles
    flash(req, 'Software package moved', `${pkg.name} is now on the case file for ${to.name}. Its client names have not changed. Replace its secrets if the new software provider should not use the old ones.`)
    res.redirect(packageHref(to, pkg))
  }))

  // --- Contact providers (case worker only) ---------------------------------------

  // For an incident or a mailshot. Choose who to contact by the status of their
  // software packages, check and download the list, send the message from the
  // team mailbox, then record it. The message is recorded on every case file.
  // This service does not send the message.
  const CONTACT_STATUSES = cf.STATUSES.filter((status) => status.key !== 'revoked')
  const CONTACT_WHO = ['key', 'all']

  const bulkChoice = (req) => req.session.data.bulkContactFutureCaseFiles || null
  const bulkRows = (req, choice) => cf.contactsForStatuses(caseFiles(req), choice.statuses, choice.who)

  // "in test or in production", for the history.
  function groupText (statuses) {
    const names = CONTACT_STATUSES
      .filter((status) => statuses.includes(status.key))
      .map((status) => status.text.toLowerCase())
    return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0]
  }

  function renderContactProviders (req, res, options) {
    const values = (options && options.values) || bulkChoice(req) || { statuses: [], who: '' }
    form(res, 'contact-providers/index', Object.assign({
      activeSection: 'contact',
      statusItems: CONTACT_STATUSES.map((status) => ({
        value: status.key,
        text: status.text,
        checked: values.statuses.includes(status.key)
      })),
      sent: cf.toHistoryView(systemActions(req))
    }, options, { values }))
  }

  router.get(`${base}/contact-providers`, (req, res) => {
    renderContactProviders(req, res)
  })

  router.post(`${base}/contact-providers`, (req, res) => {
    const errors = {}
    const values = {
      statuses: [].concat(req.body.statuses || []).filter((key) => CONTACT_STATUSES.some((status) => status.key === key)),
      who: answer(req, 'who')
    }
    if (!values.statuses.length) errors.statuses = 'Select at least one status'
    if (!CONTACT_WHO.includes(values.who)) errors.who = 'Select who you want to contact'
    if (!failed(errors) && !bulkRows(req, values).length) {
      errors.statuses = 'No software provider has a software package with that status. Select another status'
    }
    if (failed(errors)) {
      return renderContactProviders(req, res, {
        values,
        errors,
        errorList: cf.errorList(errors, [['statuses', '#statuses'], ['who', '#who']])
      })
    }
    req.session.data.bulkContactFutureCaseFiles = values
    res.redirect(`${base}/contact-providers/review`)
  })

  function renderBulkReview (req, res, options) {
    const choice = bulkChoice(req)
    const rows = bulkRows(req, choice)
    form(res, 'contact-providers/review', Object.assign({
      activeSection: 'contact',
      rows,
      providerCount: new Set(rows.map((row) => row.providerId)).size,
      group: groupText(choice.statuses),
      keyOnly: choice.who === 'key',
      reasons: cf.REASONS.bulkContact
    }, options))
  }

  router.get(`${base}/contact-providers/review`, (req, res) => {
    if (!bulkChoice(req)) return res.redirect(`${base}/contact-providers`)
    renderBulkReview(req, res)
  })

  // The contact list as a CSV file, to use in the team mailbox.
  router.get(`${base}/contact-providers/contacts.csv`, (req, res) => {
    const choice = bulkChoice(req)
    if (!choice) return res.redirect(`${base}/contact-providers`)
    const cell = (value) => `"${String(value).replace(/"/g, '""')}"`
    const lines = [['Software provider', 'Reference', 'Software packages', 'Contact name', 'Email address', 'Key contact']]
      .concat(bulkRows(req, choice).map((row) =>
        [row.providerName, row.reference, row.packages, row.name, row.email, row.keyContact ? 'Yes' : 'No']))
      .map((line) => line.map(cell).join(','))
    res.set('Content-Type', 'text/csv; charset=utf-8')
    res.set('Content-Disposition', 'attachment; filename="software-provider-contacts.csv"')
    res.send(lines.join('\r\n') + '\r\n')
  })

  router.post(`${base}/contact-providers/review`, (req, res) => {
    const choice = bulkChoice(req)
    if (!choice) return res.redirect(`${base}/contact-providers`)
    const errors = {}
    const reason = readReason(req, cf.REASONS.bulkContact, errors)
    const summary = answer(req, 'summary')
    if (!summary) errors.summary = 'Enter a summary of the message you sent'
    if (failed(errors)) {
      return renderBulkReview(req, res, {
        values: Object.assign({ summary }, reason.values),
        errors,
        errorList: cf.errorList(errors, REASON_FIELDS.concat([['summary', '#summary']]))
      })
    }
    const providerIds = [...new Set(bulkRows(req, choice).map((row) => row.providerId))]
    cf.recordBulkContact(caseFiles(req), systemActions(req), providerIds, {
      group: groupText(choice.statuses),
      summary,
      reason: reason.text
    }, by(req))
    delete req.session.data.bulkContactFutureCaseFiles
    flash(req, 'Contact recorded', `We have recorded the message on ${providerIds.length} case file${providerIds.length === 1 ? '' : 's'}.`)
    res.redirect(`${base}/contact-providers`)
  })

  // --- Audit (auditor only) ------------------------------------------------------------

  // An audit is a random sample of actions that no earlier audit has looked
  // at. The auditor reviews each action and its reason, marks it "no concerns"
  // or "needs follow-up", then completes the audit, which records that it was
  // done. Following up with a member of staff is recorded, not sent.
  const AUDIT_OUTCOMES = ['ok', 'follow-up']
  const allActions = (req) => cf.allActions(caseFiles(req))

  router.get(`${base}/audit`, (req, res) => {
    const state = audits(req)
    const actions = allActions(req)
    const audited = cf.auditedDates(state)
    res.render(view('audit/index'), {
      activeSection: 'audit',
      current: state.current ? cf.toAuditView(state.current, actions) : null,
      completed: state.completed.map((audit) => cf.toAuditView(audit, actions)).reverse(),
      actionCount: actions.length,
      notAudited: actions.filter((action) => !audited[action.id]).length,
      sampleSize: cf.AUDIT_SAMPLE_SIZE
    })
  })

  router.post(`${base}/audit/start`, (req, res) => {
    const state = audits(req)
    if (!state.current) cf.startAudit(state, allActions(req), by(req))
    res.redirect(`${base}/audit/${state.current.id}`)
  })

  // Every action in the system. Must stay above the `/audit/:auditId` routes.
  router.get(`${base}/audit/actions`, (req, res) => {
    const audited = cf.auditedDates(audits(req))
    const all = cf.toHistoryView(allActions(req))
    const people = [...new Set(all.map((action) => action.by))].sort()
    const categories = [...new Set(all.map((action) => action.category))].sort()
    const person = people.includes(req.query.by) ? req.query.by : ''
    const category = categories.includes(req.query.category) ? req.query.category : ''
    const select = (first, options, chosen) => [{ value: '', text: first }]
      .concat(options.map((option) => ({ value: option, text: option })))
      .map((item) => Object.assign(item, { selected: item.value === chosen }))
    res.render(view('audit/actions'), {
      activeSection: 'audit',
      actions: all
        .filter((action) => (!person || action.by === person) && (!category || action.category === category))
        .map((action) => Object.assign(action, { auditedOn: audited[action.id] ? cf.formatDate(audited[action.id]) : null })),
      total: all.length,
      personItems: select('All staff', people, person),
      categoryItems: select('All types of action', categories, category),
      filtered: Boolean(person || category)
    })
  })

  // Finds the audit named in the URL. If there is none, back to the Audit page.
  const withAudit = (handler) => (req, res) => {
    const state = audits(req)
    const audit = cf.findAudit(state, req.params.auditId)
    if (!audit) return res.redirect(`${base}/audit`)
    res.locals.activeSection = 'audit'
    res.locals.audit = cf.toAuditView(audit, allActions(req))
    handler(req, res, audit, state)
  }

  // The same, for one action in the audit.
  const withAuditItem = (handler) => withAudit((req, res, audit) => {
    const item = res.locals.audit.items.find((i) => i.actionId === req.params.actionId)
    if (!item) return res.redirect(`${base}/audit/${audit.id}`)
    res.locals.item = item
    handler(req, res, audit, audit.items.find((i) => i.actionId === item.actionId))
  })

  router.get(`${base}/audit/:auditId`, withAudit((req, res) => {
    res.render(view('audit/sample'))
  }))

  router.get(`${base}/audit/:auditId/actions/:actionId`, withAuditItem((req, res, audit, item) => {
    form(res, 'audit/review', { values: { outcome: item.outcome || '', note: item.note } })
  }))

  router.post(`${base}/audit/:auditId/actions/:actionId`, withAuditItem((req, res, audit, item) => {
    // A completed audit cannot be changed.
    if (audit.completedAt) return res.redirect(`${base}/audit/${audit.id}`)
    const errors = {}
    const values = { outcome: answer(req, 'outcome'), note: answer(req, 'note') }
    if (!AUDIT_OUTCOMES.includes(values.outcome)) {
      errors.outcome = 'Select if you have any concerns about this action'
    } else if (values.outcome === 'follow-up' && !values.note) {
      errors.note = 'Enter what needs following up'
    }
    if (failed(errors)) {
      return form(res, 'audit/review', {
        values,
        errors,
        errorList: cf.errorList(errors, [['outcome', '#outcome'], ['note', '#note']])
      })
    }
    item.outcome = values.outcome
    item.note = values.outcome === 'follow-up' ? values.note : ''
    res.redirect(`${base}/audit/${audit.id}`)
  }))

  router.get(`${base}/audit/:auditId/complete`, withAudit((req, res, audit) => {
    if (audit.completedAt || !res.locals.audit.allReviewed) return res.redirect(`${base}/audit/${audit.id}`)
    form(res, 'audit/complete')
  }))

  router.post(`${base}/audit/:auditId/complete`, withAudit((req, res, audit, state) => {
    if (audit.completedAt || !res.locals.audit.allReviewed) return res.redirect(`${base}/audit/${audit.id}`)
    const errors = {}
    const notes = answer(req, 'notes')
    // With a follow-up, the audit has to say what was done about it.
    if (res.locals.audit.followUps && !notes) errors.notes = 'Enter what you did about the actions that need following up'
    if (failed(errors)) {
      return form(res, 'audit/complete', {
        values: { notes },
        errors,
        errorList: cf.errorList(errors, [['notes', '#notes']])
      })
    }
    cf.completeAudit(state, notes, by(req))
    flash(req, 'Audit completed', `We have recorded that you audited ${res.locals.audit.total} actions.`)
    res.redirect(`${base}/audit`)
  }))

  // --- Not built yet -----------------------------------------------------------

  // Any other page in these sections shows the placeholder page, not a dead link.
  router.get([`${base}/software-providers/*`, `${base}/contact-providers*`, `${base}/audit*`], (req, res) => {
    const section = req.path.split('/')[1]
    res.render(view('placeholder'), {
      activeSection: section === 'audit' ? 'audit' : (section === 'contact-providers' ? 'contact' : 'providers'),
      backHref: `${base}/software-providers`
    })
  })
}

registerFutureCaseFilesRoutes()

// --- Design page ------------------------------------------------------------
//
// Links out to screens in the versions and the Jira design pages. The list
// lives in app/data/design-index.js, so adding a variant doesn't touch this.
router.get('/design', (req, res) => {
  res.render('design', { screens: require('./data/design-index') })
})

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
