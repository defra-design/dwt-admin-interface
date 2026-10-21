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
      added: credential.pendingAction === 'added',
      rotated: credential.pendingAction === 'rotated',
      caption: `${credential.environment} credentials`
    })
  }

  router.get(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
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
      clientId: 'b3f9c41e-2a7d-4c58-9e10-6d8a5f2b71c4',
      pendingSecret: 'dwt_test_b796d64665f65a16ef1ab2faa5954b25'
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
      clientId: 'b3f9c41e-2a7d-4c58-9e10-6d8a5f2b71c4',
      pendingSecret: 'dwt_test_b796d64665f65a16ef1ab2faa5954b25'
    }
    res.render(view('client-credentials/created-warning'), {
      credential,
      generatedOn: formatDateTimeObj(new Date('2026-10-21T08:14:00'))
    })
  })

  // Closing goes to the software provider page, which confirms what was created.
  router.post(`${base}/client-credentials/:id/created`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
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
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    const showNew = Boolean(credential.showNewTag)
    delete credential.showNewTag
    res.render(view('client-credentials/software-provider-detail'), {
      credential,
      showNew,
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
    if (labels.length < 2) return res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
    res.render(view('client-credentials/remove'), { credential, olderSecretDate: labels[1] })
  })

  router.post(`${base}/client-credentials/:id/remove`, (req, res) => {
    if (!cc.getCredential(credentialList(req), req.params.id)) {
      return res.redirect(`${base}/software-providers`)
    }
    const credential = cc.credentialToChange(credentialList(req), req.params.id)
    const dates = cc.secretDates(credential)
    if (dates.length > 1) credential.secrets = dates.slice(-1)
    res.redirect(`${base}/client-credentials/${credential.id}/software-provider-detail`)
  })

  // Replacing the secret asks the user to confirm first. The form on this page
  // posts to the rotate route above, which is what replaces the secret.
  router.get(`${base}/client-credentials/:id/replace`, (req, res) => {
    const credential = cc.getCredential(credentialList(req), req.params.id)
    if (!credential) return res.redirect(`${base}/software-providers`)
    res.render(view('client-credentials/replace'), { credential })
  })
}

registerV6Routes()

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
