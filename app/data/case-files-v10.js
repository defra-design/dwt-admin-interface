//
// Case files — data and helpers for version 10, a future-state concept.
//
// One case file per software provider. It holds the organisation details, its
// contacts, its software packages (each with a status, a PAT result and
// credentials for External test and Production) and a history of every action.
//
// There is no backend. The example case files are built when the server starts,
// by replaying the same helpers the routes use, so their history always matches
// their data. Each session gets its own copy (see routes.js, `caseFilesV10`).
// Dates are worked out from today, so the examples never look out of date.
// All names, email addresses, phone numbers and IDs are synthetic.
//
// A client secret is never stored or shown in this version. A "secret" here is
// only a record of when it was generated and who it was sent to.
//

const { randomInt } = require('crypto')
const { formatDateObj, formatDateTimeObj } = require('./dates')

// --- Fixed lists --------------------------------------------------------------

// Two roles. A case worker does everything except audit. An auditor can view
// case files and audits actions, but cannot change anything.
const USERS = {
  caseworker: { key: 'caseworker', name: 'Priya Shah', role: 'Case worker' },
  auditor: { key: 'auditor', name: 'Tom Fielding', role: 'Auditor' }
}

// Status of a software package. Tag colours follow the GOV.UK tag guidance and
// version 9: blue for External test and purple for Production.
const STATUSES = [
  { key: 'created', text: 'Created', tag: 'govuk-tag--grey' },
  { key: 'in-test', text: 'In test', tag: 'govuk-tag--blue' },
  { key: 'approved', text: 'Approved for production', tag: 'govuk-tag--teal' },
  { key: 'in-production', text: 'In production', tag: 'govuk-tag--purple' },
  { key: 'suspended', text: 'Suspended', tag: 'govuk-tag--orange' },
  { key: 'revoked', text: 'Revoked', tag: 'govuk-tag--red' }
]

// Shown for every package of a software provider that has been removed.
const CLOSED_STATUS = { key: 'closed', text: 'Closed', tag: 'govuk-tag--grey' }

// A package in one of these statuses can connect to the service.
const ACTIVE_STATUSES = ['in-test', 'approved', 'in-production']

const ENVIRONMENTS = [
  { key: 'test', text: 'External test', lower: 'external test', suffix: 'Test' },
  { key: 'production', text: 'Production', lower: 'production', suffix: 'Live' }
]

// PLACEHOLDER VALUES, TO CONFIRM. The team spreadsheet has columns for
// 'Provider/In-house', 'Developer type' and 'Size'. The real values are not known.
const PROVIDER_TYPES = ['Software provider', 'In-house developer']
const DEVELOPER_TYPES = ['Specialist waste software', 'General business software', 'Bespoke or custom software']
const SIZES = [
  'Micro (fewer than 10 employees)',
  'Small (10 to 49 employees)',
  'Medium (50 to 249 employees)',
  'Large (250 or more employees)'
]

// PLACEHOLDER VALUES, TO CONFIRM. There is no agreed way to check that a
// contact can act for their organisation.
const VERIFY_METHODS = [
  'A director or owner of the organisation confirmed it by email',
  'The contact is listed as a director at Companies House',
  'The organisation sent a signed letter'
]

// Reasons offered for each action. `what` completes "Why are you …?" and the
// error "Select why you are …". Every list also gets "Other" (see the
// _reason.html partial).
const REASONS = {
  createCaseFile: {
    what: 'creating this case file',
    options: ['The software provider asked to join the service', 'I am moving a record from the team spreadsheet']
  },
  addPackage: {
    what: 'adding this software package',
    options: ['The software provider has a new software package', 'I am moving a record from the team spreadsheet']
  },
  changeName: {
    what: 'changing the organisation name',
    options: ['The organisation changed its name', 'I am correcting a mistake']
  },
  changeDetails: {
    what: 'changing the organisation details',
    options: ['The software provider told us about a change', 'I am correcting a mistake']
  },
  addContact: {
    what: 'adding this contact',
    options: ['The software provider asked us to add them', 'I am moving a record from the team spreadsheet']
  },
  changeContact: {
    what: 'changing this contact',
    options: ['The software provider told us about a change', 'I am correcting a mistake']
  },
  removeContact: {
    what: 'removing this contact',
    options: ['The contact has left the organisation', 'I am correcting a mistake']
  },
  removeSecret: {
    what: 'removing the old secret',
    options: ['The software provider has changed over to the new secret', 'The software provider did not change over in the agreed time']
  },
  suspend: {
    what: 'suspending access',
    options: ['The software provider is sending poor quality data', 'The credentials may be compromised', 'The software provider asked us to pause access']
  },
  reactivate: {
    what: 'reactivating access',
    options: ['The problem has been fixed', 'Access was suspended by mistake']
  },
  revoke: {
    what: 'revoking access',
    options: ['The software provider did not fix a problem with their data', 'The credentials are compromised', 'The software package is no longer used']
  },
  removeProvider: {
    what: 'removing this software provider',
    options: ['The software provider has gone out of business', 'The software provider no longer needs to send data', 'This is a duplicate case file']
  },
  movePackage: {
    what: 'moving this software package',
    options: ['The software package was sold to another software provider', 'I am correcting a mistake']
  },
  recordContact: {
    what: 'in contact with the software provider',
    options: [
      'Question about joining or testing',
      'Request for credentials',
      'Request to replace a secret',
      'Report of a security breach',
      'Change to organisation or contact details'
    ]
  },
  bulkContact: {
    what: 'contacting these software providers',
    options: ['Incident', 'Planned maintenance or a change to the service', 'Service update or mailshot']
  }
}

const CHANNELS = ['Email', 'Phone call', 'Microsoft Teams call']

const PAT_OUTCOMES = [
  { key: 'passed', text: 'Passed' },
  { key: 'failed', text: 'Failed' },
  { key: 'exception', text: 'Exception agreed' }
]

// An audit looks at this many actions, picked at random.
const AUDIT_SAMPLE_SIZE = 10

// --- Small helpers ------------------------------------------------------------

const ID_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomString (length) {
  let result = ''
  for (let i = 0; i < length; i++) result += ID_CHARACTERS[randomInt(ID_CHARACTERS.length)]
  return result
}

function newId (prefix) {
  return `${prefix}-${randomString(8)}`
}

function clone (value) {
  return JSON.parse(JSON.stringify(value))
}

// `ctx` says who did something and when: { by: 'Name', at: Date }. `at` is
// only given for the example data. Everything else happens now.
function when (ctx) {
  return (ctx.at || new Date()).toISOString()
}

function looksLikeEmail (value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function findStatus (key) {
  return STATUSES.find((s) => s.key === key) || CLOSED_STATUS
}

function findEnvironment (key) {
  return ENVIRONMENTS.find((e) => e.key === key) || null
}

function findProvider (list, id) {
  return list.find((p) => p.id === id) || null
}

function findPackage (provider, id) {
  return provider.packages.find((p) => p.id === id) || null
}

function findContact (provider, id) {
  return provider.contacts.find((c) => c.id === id) || null
}

function keyContact (provider) {
  return provider.contacts.find((c) => c.keyContact) || provider.contacts[0] || null
}

// --- History --------------------------------------------------------------------

// Every action adds an entry: who, what, when and why. The History page and
// the audit both read these.
function addHistory (provider, entry, ctx) {
  const item = Object.assign({ id: newId('act'), at: when(ctx), by: ctx.by }, entry)
  provider.history.push(item)
  return item
}

function setStatus (pkg, status, ctx) {
  pkg.status = status
  pkg.statusSince = when(ctx)
}

// --- Case file, organisation details and contacts ---------------------------------

function newContact (values) {
  return {
    id: newId('con'),
    name: values.name,
    jobTitle: values.jobTitle || '',
    email: values.email,
    phone: values.phone || '',
    keyContact: false,
    verified: null
  }
}

function createProvider (list, values, ctx) {
  // References count up from SP-1001. The id in the URL is the reference in lowercase.
  const highest = list.reduce((max, p) => Math.max(max, Number(p.reference.split('-')[1])), 1000)
  const reference = `SP-${highest + 1}`
  const contact = Object.assign(newContact(values.contact), { keyContact: true })
  if (values.verifyMethod) {
    contact.verified = { method: values.verifyMethod, at: when(ctx), by: ctx.by }
  }
  const provider = {
    id: reference.toLowerCase(),
    reference,
    name: values.name,
    providerType: values.providerType,
    developerType: values.developerType,
    size: values.size,
    closed: null,
    packageCount: 0,
    contacts: [contact],
    packages: [],
    history: []
  }
  addHistory(provider, {
    category: 'Case file',
    title: 'Case file created',
    detail: `Key contact: ${contact.name}. ` + (contact.verified
      ? `Checked they can act for the organisation: ${lowerFirst(contact.verified.method)}.`
      : 'Not yet checked that they can act for the organisation.'),
    reason: values.reason
  }, ctx)
  list.push(provider)
  return provider
}

function lowerFirst (text) {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function updateName (provider, name, reason, ctx) {
  const before = provider.name
  provider.name = name
  addHistory(provider, {
    category: 'Organisation details',
    title: 'Organisation name changed',
    detail: `Changed from ${before} to ${name}.`,
    reason
  }, ctx)
}

function updateDetails (provider, values, reason, ctx) {
  const labels = { providerType: 'Provider type', developerType: 'Developer type', size: 'Size' }
  const changes = Object.keys(labels)
    .filter((key) => provider[key] !== values[key])
    .map((key) => `${labels[key]} changed from ${provider[key]} to ${values[key]}.`)
  if (!changes.length) return false
  Object.keys(labels).forEach((key) => { provider[key] = values[key] })
  addHistory(provider, {
    category: 'Organisation details',
    title: 'Organisation details changed',
    detail: changes.join(' '),
    reason
  }, ctx)
  return true
}

// Only one key contact. Making a contact the key contact takes it from the other.
function makeKeyContact (provider, contact) {
  provider.contacts.forEach((c) => { c.keyContact = c.id === contact.id })
}

function addContact (provider, values, reason, ctx) {
  const contact = newContact(values)
  provider.contacts.push(contact)
  if (values.keyContact) makeKeyContact(provider, contact)
  addHistory(provider, {
    category: 'Contacts',
    title: 'Contact added',
    detail: `${contact.name} (${contact.email})` + (contact.keyContact ? ', as the key contact.' : '.'),
    reason
  }, ctx)
  return contact
}

function updateContact (provider, contact, values, reason, ctx) {
  // A new email address is a new way to reach the person, so they are checked again.
  const emailChanged = contact.email !== values.email
  Object.assign(contact, {
    name: values.name,
    jobTitle: values.jobTitle || '',
    email: values.email,
    phone: values.phone || ''
  })
  if (emailChanged) contact.verified = null
  if (values.keyContact) makeKeyContact(provider, contact)
  addHistory(provider, {
    category: 'Contacts',
    title: 'Contact changed',
    detail: `${contact.name} (${contact.email})` +
      (contact.keyContact ? ', the key contact.' : '.') +
      (emailChanged ? ' The email address changed, so they need to be checked again.' : ''),
    reason
  }, ctx)
}

function verifyContact (provider, contact, method, ctx) {
  contact.verified = { method, at: when(ctx), by: ctx.by }
  addHistory(provider, {
    category: 'Contacts',
    title: 'Contact checked',
    detail: `${contact.name} can act for the organisation.`,
    reason: method
  }, ctx)
}

function removeContact (provider, contact, reason, ctx) {
  provider.contacts = provider.contacts.filter((c) => c.id !== contact.id)
  addHistory(provider, {
    category: 'Contacts',
    title: 'Contact removed',
    detail: `${contact.name} (${contact.email}).`,
    reason
  }, ctx)
}

// A record of a conversation with the software provider.
function recordContact (provider, values, ctx) {
  addHistory(provider, {
    category: 'Contact with provider',
    title: `${values.channel} with ${values.who}`,
    detail: (values.verified
      ? ''
      : `${values.who} has not been checked as able to act for the organisation. `) + values.summary,
    reason: values.reason
  }, ctx)
}

// The case file is kept, with its history, so it can still be audited. Its
// credentials are deleted, so none of its secrets work.
function closeProvider (provider, reason, ctx) {
  provider.closed = { at: when(ctx), by: ctx.by, reason }
  provider.packages.forEach((pkg) => { pkg.credentials = {} })
  addHistory(provider, {
    category: 'Case file',
    title: 'Software provider removed',
    detail: 'All credentials were deleted. The case file is closed.',
    reason
  }, ctx)
}

// --- Software packages -------------------------------------------------------------

function addPackage (provider, name, reason, ctx) {
  provider.packageCount += 1
  const pkg = {
    id: `${provider.id}-p${provider.packageCount}`,
    name,
    status: 'created',
    statusSince: when(ctx),
    pat: null,
    approval: null,
    credentials: {}
  }
  provider.packages.push(pkg)
  addHistory(provider, {
    category: 'Case file',
    title: 'Software package added',
    packageId: pkg.id,
    packageName: pkg.name,
    reason
  }, ctx)
  return pkg
}

// The history of a package moves with it, and both case files record the move.
function movePackage (from, pkg, to, reason, ctx) {
  from.packages = from.packages.filter((p) => p.id !== pkg.id)
  to.packages.push(pkg)
  const moving = from.history.filter((h) => h.packageId === pkg.id)
  from.history = from.history.filter((h) => h.packageId !== pkg.id)
  to.history = to.history.concat(moving)
  addHistory(from, {
    category: 'Case file',
    title: 'Software package moved to another software provider',
    detail: `${pkg.name} moved to ${to.name} (${to.reference}).`,
    reason
  }, ctx)
  addHistory(to, {
    category: 'Case file',
    title: 'Software package moved from another software provider',
    detail: `${pkg.name} moved from ${from.name} (${from.reference}).`,
    packageId: pkg.id,
    packageName: pkg.name,
    reason
  }, ctx)
}

// --- Credentials ---------------------------------------------------------------------

// Client names are made by the system: the words of the provider and package
// names (each word once), then Test or Live. Letters and underscores only, as
// agreed for client names in earlier versions.
function clientNameFor (provider, pkg, environment) {
  const seen = new Set()
  const words = `${provider.name} ${pkg.name}`
    .replace(/[^A-Za-z ]/g, ' ')
    .split(/\s+/)
    .filter((word) => {
      const key = word.toLowerCase()
      if (!word || ['ltd', 'limited', 'plc', 'llp'].includes(key) || seen.has(key)) return false
      seen.add(key)
      return true
    })
  return words.concat(environment.suffix).join('_')
}

function newSecret (contact, ctx) {
  return {
    id: newId('sec'),
    generatedAt: when(ctx),
    sentTo: contact.name,
    sentToEmail: contact.email,
    sentBy: ctx.by
  }
}

function sentTo (contact) {
  return `${contact.name} (${contact.email})`
}

function createCredentials (provider, pkg, environmentKey, contact, ctx) {
  const environment = findEnvironment(environmentKey)
  pkg.credentials[environmentKey] = {
    clientName: clientNameFor(provider, pkg, environment),
    clientId: randomString(26),
    secrets: [newSecret(contact, ctx)]
  }
  if (environmentKey === 'test' && pkg.status === 'created') setStatus(pkg, 'in-test', ctx)
  if (environmentKey === 'production' && pkg.status === 'approved') setStatus(pkg, 'in-production', ctx)
  addHistory(provider, {
    category: 'Credentials',
    title: `${environment.text} credentials created`,
    detail: `Client ID and a one-time link to the client secret sent to ${sentTo(contact)}.`,
    packageId: pkg.id,
    packageName: pkg.name,
    reason: environmentKey === 'test'
      ? 'The software provider is ready to test their software'
      : 'The software package is approved for production'
  }, ctx)
}

// Routine: the earlier secret keeps working until a case worker removes it.
// Security breach: every earlier secret stops working now.
function replaceSecret (provider, pkg, environmentKey, contact, options, ctx) {
  const environment = findEnvironment(environmentKey)
  const credential = pkg.credentials[environmentKey]
  const secret = newSecret(contact, ctx)
  credential.secrets = options.breach ? [secret] : credential.secrets.concat(secret)
  addHistory(provider, {
    category: 'Credentials',
    title: options.breach
      ? `${environment.text} secret replaced after a security breach`
      : `New ${environment.lower} secret sent`,
    detail: options.breach
      ? `The earlier secret stopped working immediately. A one-time link to the new secret was sent to ${sentTo(contact)}. The Defra security team was told.`
      : `A one-time link to the new secret was sent to ${sentTo(contact)}. The earlier secret works until it is removed.`,
    packageId: pkg.id,
    packageName: pkg.name,
    reason: options.breach ? `Security breach or suspected breach: ${options.details}` : 'Routine replacement'
  }, ctx)
}

function removeOldSecret (provider, pkg, environmentKey, reason, ctx) {
  const environment = findEnvironment(environmentKey)
  const credential = pkg.credentials[environmentKey]
  credential.secrets = credential.secrets.slice(-1)
  addHistory(provider, {
    category: 'Credentials',
    title: `Old ${environment.lower} secret removed`,
    detail: 'The old secret no longer works.',
    packageId: pkg.id,
    packageName: pkg.name,
    reason
  }, ctx)
}

// --- Approval for production -------------------------------------------------------

function recordPat (provider, pkg, values, ctx) {
  pkg.pat = { outcome: values.outcome, details: values.details || '', at: when(ctx), by: ctx.by }
  const outcome = PAT_OUTCOMES.find((o) => o.key === values.outcome)
  addHistory(provider, {
    category: 'Approval',
    title: values.outcome === 'exception'
      ? 'Exception to the production approval test recorded'
      : `Production approval test result recorded: ${outcome.text.toLowerCase()}`,
    detail: values.details || '',
    packageId: pkg.id,
    packageName: pkg.name
  }, ctx)
}

// The reason for approval is the PAT result or the exception, so it is not asked for again.
function approve (provider, pkg, ctx) {
  pkg.approval = { at: when(ctx), by: ctx.by }
  setStatus(pkg, 'approved', ctx)
  addHistory(provider, {
    category: 'Approval',
    title: 'Approved for production',
    packageId: pkg.id,
    packageName: pkg.name,
    reason: pkg.pat.outcome === 'exception'
      ? `Exception agreed: ${pkg.pat.details}`
      : 'The production approval test was passed'
  }, ctx)
}

// --- Access: suspend, reactivate, revoke -------------------------------------------

function messageDetail (provider, message) {
  const contact = keyContact(provider)
  return `Message sent to ${contact ? sentTo(contact) : 'the software provider'}: “${message}”`
}

function suspend (provider, pkg, reason, message, ctx) {
  pkg.previousStatus = pkg.status
  setStatus(pkg, 'suspended', ctx)
  addHistory(provider, {
    category: 'Access',
    title: 'Access suspended',
    detail: messageDetail(provider, message),
    packageId: pkg.id,
    packageName: pkg.name,
    reason
  }, ctx)
}

function reactivate (provider, pkg, reason, message, ctx) {
  setStatus(pkg, pkg.previousStatus || 'in-test', ctx)
  delete pkg.previousStatus
  addHistory(provider, {
    category: 'Access',
    title: 'Access reactivated',
    detail: messageDetail(provider, message),
    packageId: pkg.id,
    packageName: pkg.name,
    reason
  }, ctx)
}

function revoke (provider, pkg, reason, message, ctx) {
  setStatus(pkg, 'revoked', ctx)
  delete pkg.previousStatus
  pkg.credentials = {}
  addHistory(provider, {
    category: 'Access',
    title: 'Access revoked',
    detail: 'All credentials were deleted. ' + messageDetail(provider, message),
    packageId: pkg.id,
    packageName: pkg.name,
    reason
  }, ctx)
}

// --- Contact all providers ----------------------------------------------------------

// Contacts for every software provider with a package in one of the statuses.
// `who` is 'key' (key contacts only) or 'all'.
function contactsForStatuses (list, statuses, who) {
  const rows = []
  list.filter((p) => !p.closed).forEach((provider) => {
    const packages = provider.packages.filter((pkg) => statuses.includes(pkg.status))
    if (!packages.length) return
    provider.contacts
      .filter((c) => who === 'all' || c.keyContact)
      .forEach((contact) => {
        rows.push({
          providerId: provider.id,
          providerName: provider.name,
          reference: provider.reference,
          packages: packages.map((pkg) => `${pkg.name} (${findStatus(pkg.status).text})`).join(', '),
          name: contact.name,
          email: contact.email,
          keyContact: contact.keyContact
        })
      })
  })
  return rows.sort((a, b) => a.providerName.localeCompare(b.providerName))
}

// Records the contact on each case file, and once in the system list, so the
// Contact providers page can show what has been sent.
function recordBulkContact (list, systemActions, providerIds, values, ctx) {
  providerIds.forEach((id) => {
    const provider = findProvider(list, id)
    if (!provider) return
    addHistory(provider, {
      category: 'Contact with provider',
      title: 'Message to a group of software providers',
      detail: `Sent to software providers with a software package that is ${values.group}. ${values.summary}`,
      reason: values.reason
    }, ctx)
  })
  systemActions.push({
    id: newId('act'),
    at: when(ctx),
    by: ctx.by,
    category: 'Contact with provider',
    title: 'Message to a group of software providers',
    detail: `${providerIds.length} software providers with a software package that is ${values.group}. ${values.summary}`,
    reason: values.reason,
    system: true
  })
}

// --- Audit -----------------------------------------------------------------------------

// Every action in the system, newest first. Entries on a case file carry the
// software provider they belong to. `system` entries belong to no case file,
// and would count each bulk message twice, so they are left out.
function allActions (list) {
  return list
    .flatMap((provider) => provider.history.map((entry) => Object.assign({}, entry, {
      providerId: provider.id,
      providerName: provider.name,
      reference: provider.reference
    })))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
}

// Picks actions at random that no earlier audit has looked at.
function startAudit (audits, actions, ctx) {
  const reviewed = new Set(audits.completed.flatMap((audit) => audit.items.map((item) => item.actionId)))
  const pool = actions.filter((action) => !reviewed.has(action.id))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const swap = pool[i]
    pool[i] = pool[j]
    pool[j] = swap
  }
  audits.current = {
    id: newId('audit'),
    startedAt: when(ctx),
    by: ctx.by,
    items: pool.slice(0, AUDIT_SAMPLE_SIZE).map((action) => ({ actionId: action.id, outcome: null, note: '' }))
  }
  return audits.current
}

function completeAudit (audits, notes, ctx) {
  const audit = Object.assign(audits.current, { completedAt: when(ctx), notes })
  audits.completed.push(audit)
  audits.current = null
  return audit
}

function findAudit (audits, id) {
  if (audits.current && audits.current.id === id) return audits.current
  return audits.completed.find((audit) => audit.id === id) || null
}

// When each action was audited, by action id.
function auditedDates (audits) {
  const dates = {}
  audits.completed.forEach((audit) => {
    audit.items.forEach((item) => { dates[item.actionId] = audit.completedAt })
  })
  return dates
}

// --- Views: what the pages show ----------------------------------------------------

function daysSince (iso) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000))
}

function daysText (days) {
  return days === 1 ? '1 day' : `${days} days`
}

function toContactView (contact) {
  return Object.assign({}, contact, {
    verifiedOn: contact.verified ? formatDateObj(new Date(contact.verified.at)) : null,
    verifiedBy: contact.verified ? contact.verified.by : null,
    verifiedMethod: contact.verified ? contact.verified.method : null
  })
}

// Newest first. With two secrets, the second one is the old secret.
function toSecretViews (credential) {
  return credential.secrets
    .slice()
    .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
    .map((secret, index) => ({
      generatedOn: formatDateTimeObj(new Date(secret.generatedAt)),
      sentTo: secret.sentTo,
      sentToEmail: secret.sentToEmail,
      sentBy: secret.sentBy,
      old: index > 0
    }))
}

function toPackageView (provider, pkg) {
  const open = !provider.closed
  const status = open ? findStatus(pkg.status) : CLOSED_STATUS
  const active = open && ACTIVE_STATUSES.includes(pkg.status)
  const days = daysSince(open ? pkg.statusSince : provider.closed.at)
  const patOutcome = pkg.pat ? PAT_OUTCOMES.find((o) => o.key === pkg.pat.outcome) : null
  return {
    id: pkg.id,
    name: pkg.name,
    status,
    days,
    daysText: daysText(days),
    since: formatDateObj(new Date(open ? pkg.statusSince : provider.closed.at)),
    pat: pkg.pat ? {
      outcome: pkg.pat.outcome,
      text: patOutcome.text,
      details: pkg.pat.details,
      on: formatDateObj(new Date(pkg.pat.at)),
      by: pkg.pat.by
    } : null,
    approval: pkg.approval ? { on: formatDateObj(new Date(pkg.approval.at)), by: pkg.approval.by } : null,
    environments: ENVIRONMENTS.map((environment) => {
      const credential = pkg.credentials[environment.key]
      // Production credentials can only be created once the package is approved.
      const allowed = environment.key === 'test' || Boolean(pkg.approval)
      return Object.assign({}, environment, {
        credential: credential ? {
          clientName: credential.clientName,
          clientId: credential.clientId,
          secrets: toSecretViews(credential),
          oldSecretWaiting: credential.secrets.length > 1
        } : null,
        canCreate: active && !credential && allowed,
        needsApproval: active && !credential && !allowed
      })
    }),
    active,
    canRecordPat: open && pkg.status === 'in-test',
    canApprove: open && pkg.status === 'in-test' && Boolean(pkg.pat) && pkg.pat.outcome !== 'failed',
    canSuspend: active,
    canReactivate: open && pkg.status === 'suspended',
    canRevoke: active || (open && pkg.status === 'suspended'),
    canMove: open && pkg.status !== 'revoked'
  }
}

function toHistoryView (entries) {
  return entries
    .slice()
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .map((entry) => Object.assign({}, entry, {
      dateTime: formatDateTimeObj(new Date(entry.at)),
      context: [entry.category, entry.packageName].filter(Boolean).join(', ')
    }))
}

// Old secrets that are still working after a routine replacement.
function reminders (provider) {
  const list = []
  if (provider.closed) return list
  provider.packages.forEach((pkg) => {
    ENVIRONMENTS.forEach((environment) => {
      const credential = pkg.credentials[environment.key]
      if (credential && credential.secrets.length > 1) {
        const newest = credential.secrets[credential.secrets.length - 1]
        list.push({
          packageId: pkg.id,
          packageName: pkg.name,
          environment: environment.lower,
          sentOn: formatDateObj(new Date(newest.generatedAt)),
          days: daysText(daysSince(newest.generatedAt))
        })
      }
    })
  })
  return list
}

function toProviderView (provider) {
  const key = keyContact(provider)
  return {
    id: provider.id,
    reference: provider.reference,
    name: provider.name,
    providerType: provider.providerType,
    developerType: provider.developerType,
    size: provider.size,
    closed: provider.closed ? {
      on: formatDateObj(new Date(provider.closed.at)),
      by: provider.closed.by,
      reason: provider.closed.reason
    } : null,
    keyContact: key ? toContactView(key) : null,
    contacts: provider.contacts
      .map(toContactView)
      .sort((a, b) => Number(b.keyContact) - Number(a.keyContact) || a.name.localeCompare(b.name)),
    verifiedContacts: provider.contacts.filter((c) => c.verified).map(toContactView),
    packages: provider.packages.map((pkg) => toPackageView(provider, pkg)),
    reminders: reminders(provider)
  }
}

// One row for each software package, because the status belongs to the package.
// A software provider with no package yet still gets a row, so it can be found.
// `filters.search` matches every word typed, in any of: organisation, reference,
// package, client name, client ID, contact name or email address.
function listRows (list, filters) {
  const words = (filters.search || '').toLowerCase().split(/\s+/).filter(Boolean)
  const statuses = filters.statuses || []
  const rows = []
  list.forEach((provider) => {
    const key = keyContact(provider)
    const about = [provider.name, provider.reference]
      .concat(provider.contacts.flatMap((c) => [c.name, c.email]))
    const packages = provider.packages.length ? provider.packages : [null]
    packages.forEach((pkg) => {
      const view = pkg ? toPackageView(provider, pkg) : null
      const credentials = pkg ? Object.values(pkg.credentials).flatMap((c) => [c.clientName, c.clientId]) : []
      const statusKey = provider.closed ? 'closed' : (pkg ? pkg.status : null)
      const text = about.concat(pkg ? [pkg.name] : [], credentials).join(' ').toLowerCase()
      if (!words.every((word) => text.includes(word))) return
      if (statuses.length && !statuses.includes(statusKey)) return
      rows.push({
        providerId: provider.id,
        providerName: provider.name,
        reference: provider.reference,
        packageId: pkg ? pkg.id : null,
        packageName: pkg ? pkg.name : null,
        status: view ? view.status : (provider.closed ? CLOSED_STATUS : null),
        statusOrder: statusKey ? STATUSES.concat(CLOSED_STATUS).findIndex((s) => s.key === statusKey) : -1,
        days: view ? view.days : null,
        keyContact: key ? key.name : ''
      })
    })
  })
  return rows.sort((a, b) =>
    a.providerName.localeCompare(b.providerName) || (a.packageName || '').localeCompare(b.packageName || ''))
}

// How many software packages are in each status. Removed software providers are not counted.
function statusCounts (list) {
  return STATUSES.map((status) => Object.assign({}, status, {
    count: list
      .filter((provider) => !provider.closed)
      .reduce((total, provider) => total + provider.packages.filter((pkg) => pkg.status === status.key).length, 0)
  }))
}

// Case files whose name looks like the one typed, to stop the same organisation
// being recorded twice. Company endings, spaces and punctuation are ignored.
// Two names match if one contains the other, or they start with the same 5 letters.
function similarProviders (list, name) {
  const simplify = (text) => text.toLowerCase()
    .replace(/\b(ltd|limited|plc|llp)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
  const typed = simplify(name)
  if (typed.length < 3) return []
  return list.filter((provider) => {
    const existing = simplify(provider.name)
    return existing.includes(typed) || typed.includes(existing) ||
      (typed.length >= 5 && existing.slice(0, 5) === typed.slice(0, 5))
  })
}

// --- Validation ---------------------------------------------------------------------

// Reads the shared "reason" question. `text` is what gets recorded.
function checkReason (body, reasons) {
  const reason = (body.reason || '').trim()
  const details = (body.reasonDetails || '').trim()
  const errors = {}
  if (!reasons.options.concat('Other').includes(reason)) {
    errors.reason = `Select why you are ${reasons.what}`
  } else if (reason === 'Other' && !details) {
    errors.reasonDetails = `Enter why you are ${reasons.what}`
  }
  return {
    values: { reason, reasonDetails: details },
    errors,
    text: reason === 'Other' ? details : reason
  }
}

function validateContact (values) {
  const errors = {}
  if (!values.name) errors.name = 'Enter the contact’s full name'
  if (!values.email) {
    errors.email = 'Enter the contact’s email address'
  } else if (!looksLikeEmail(values.email)) {
    errors.email = 'Enter an email address in the correct format, like name@example.com'
  }
  return errors
}

// Error summary links, in the order the fields are on the page.
// `fields` is a list of [name, href].
function errorList (errors, fields) {
  return fields
    .filter(([name]) => errors[name])
    .map(([name, href]) => ({ text: errors[name], href }))
}

// --- Example data ---------------------------------------------------------------------

function daysAgo (days, hour, minute) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date
}

function buildExamples () {
  const list = []
  const systemActions = []
  const priya = USERS.caseworker.name
  const alex = 'Alex Morgan'
  const sam = 'Sam Okoro'
  const on = (by, days, hour, minute) => ({ by, at: daysAgo(days, hour, minute) })
  const fromSpreadsheet = REASONS.createCaseFile.options[1]
  const asked = REASONS.createCaseFile.options[0]
  const newPackage = REASONS.addPackage.options[0]

  // 1. In production, with a second package still in test.
  const kerbside = createProvider(list, {
    name: 'Kerbside Technologies Ltd',
    providerType: PROVIDER_TYPES[0],
    developerType: DEVELOPER_TYPES[0],
    size: SIZES[2],
    contact: { name: 'Jo Bell', jobTitle: 'Head of product', email: 'jo.bell@kerbside.example.com', phone: '01632 960101' },
    verifyMethod: VERIFY_METHODS[0],
    reason: fromSpreadsheet
  }, on(alex, 92, 9, 30))
  const collect = addPackage(kerbside, 'Kerbside Collect', REASONS.addPackage.options[1], on(alex, 92, 9, 34))
  createCredentials(kerbside, collect, 'test', kerbside.contacts[0], on(alex, 90, 11, 5))
  recordPat(kerbside, collect, { outcome: 'passed' }, on(sam, 41, 14, 20))
  approve(kerbside, collect, on(sam, 40, 10, 15))
  createCredentials(kerbside, collect, 'production', kerbside.contacts[0], on(sam, 40, 10, 22))
  addContact(kerbside, {
    name: 'Dev Patel', jobTitle: 'Technical lead', email: 'dev.patel@kerbside.example.com', phone: '01632 960102'
  }, REASONS.addContact.options[0], on(priya, 20, 13, 10))
  const weigh = addPackage(kerbside, 'Kerbside Weigh', newPackage, on(priya, 14, 10, 45))
  createCredentials(kerbside, weigh, 'test', kerbside.contacts[0], on(priya, 13, 9, 50))
  recordContact(kerbside, {
    who: 'Jo Bell',
    verified: true,
    channel: 'Email',
    reason: REASONS.recordContact.options[0],
    summary: 'Asked how long the production approval test takes for Kerbside Weigh. Sent the PAT guidance.'
  }, on(priya, 5, 15, 40))

  // 2. In test, with a routine replacement under way: two secrets, so a reminder shows.
  const skipflow = createProvider(list, {
    name: 'Skipflow Software Ltd',
    providerType: PROVIDER_TYPES[0],
    developerType: DEVELOPER_TYPES[0],
    size: SIZES[1],
    contact: { name: 'Marta Kowalska', jobTitle: 'Chief technology officer', email: 'marta.kowalska@skipflow.example.com', phone: '01632 960110' },
    verifyMethod: VERIFY_METHODS[1],
    reason: fromSpreadsheet
  }, on(alex, 88, 10, 0))
  const skipflowPackage = addPackage(skipflow, 'Skipflow', REASONS.addPackage.options[1], on(alex, 88, 10, 3))
  createCredentials(skipflow, skipflowPackage, 'test', skipflow.contacts[0], on(alex, 85, 15, 12))
  recordContact(skipflow, {
    who: 'Marta Kowalska',
    verified: true,
    channel: 'Phone call',
    reason: REASONS.recordContact.options[2],
    summary: 'Their policy is to change secrets every 90 days. Agreed to send a new secret and remove the old one after a week.'
  }, on(priya, 3, 11, 20))
  replaceSecret(skipflow, skipflowPackage, 'test', skipflow.contacts[0], { breach: false }, on(priya, 3, 11, 32))

  // 3. Approved for production, waiting for production credentials.
  const wastebase = createProvider(list, {
    name: 'Wastebase Systems Ltd',
    providerType: PROVIDER_TYPES[0],
    developerType: DEVELOPER_TYPES[1],
    size: SIZES[3],
    contact: { name: 'Callum Reid', jobTitle: 'Integration manager', email: 'callum.reid@wastebase.example.com', phone: '01632 960120' },
    verifyMethod: VERIFY_METHODS[2],
    reason: fromSpreadsheet
  }, on(alex, 80, 14, 0))
  const manager = addPackage(wastebase, 'Wastebase Manager', REASONS.addPackage.options[1], on(alex, 80, 14, 4))
  createCredentials(wastebase, manager, 'test', wastebase.contacts[0], on(sam, 76, 9, 15))
  recordPat(wastebase, manager, {
    outcome: 'exception',
    details: 'Agreed by the service owner. The package only sends receipt of waste, which was tested in the private beta.'
  }, on(sam, 6, 16, 5))
  approve(wastebase, manager, on(sam, 6, 16, 10))

  // 4. In production. Had a security breach, so the production secret was replaced.
  const greenlane = createProvider(list, {
    name: 'Greenlane Digital Ltd',
    providerType: PROVIDER_TYPES[0],
    developerType: DEVELOPER_TYPES[0],
    size: SIZES[0],
    contact: { name: 'Aisha Rahman', jobTitle: 'Director', email: 'aisha.rahman@greenlane.example.com', phone: '01632 960130' },
    verifyMethod: VERIFY_METHODS[1],
    reason: fromSpreadsheet
  }, on(alex, 86, 11, 30))
  const tracker = addPackage(greenlane, 'Greenlane Tracker', REASONS.addPackage.options[1], on(alex, 86, 11, 33))
  createCredentials(greenlane, tracker, 'test', greenlane.contacts[0], on(alex, 84, 10, 0))
  recordPat(greenlane, tracker, { outcome: 'passed' }, on(sam, 52, 13, 45))
  approve(greenlane, tracker, on(sam, 51, 9, 20))
  createCredentials(greenlane, tracker, 'production', greenlane.contacts[0], on(sam, 51, 9, 31))
  recordContact(greenlane, {
    who: 'Aisha Rahman',
    verified: true,
    channel: 'Phone call',
    reason: REASONS.recordContact.options[3],
    summary: 'A developer put the production secret in a public code repository by mistake. It has been taken down.'
  }, on(priya, 10, 8, 50))
  replaceSecret(greenlane, tracker, 'production', greenlane.contacts[0], {
    breach: true,
    details: 'The production secret was put in a public code repository.'
  }, on(priya, 10, 8, 58))

  // 5. A similar name to number 4. Created, with a key contact who is not checked yet.
  const greenLaneData = createProvider(list, {
    name: 'Green Lane Data Ltd',
    providerType: PROVIDER_TYPES[0],
    developerType: DEVELOPER_TYPES[1],
    size: SIZES[0],
    contact: { name: 'Owen Hughes', jobTitle: 'Developer', email: 'owen.hughes@greenlanedata.example.com', phone: '' },
    verifyMethod: null,
    reason: asked
  }, on(priya, 4, 14, 25))
  addPackage(greenLaneData, 'Lane Ledger', newPackage, on(priya, 4, 14, 28))

  // 6. Suspended while in production.
  const binwise = createProvider(list, {
    name: 'Binwise Ltd',
    providerType: PROVIDER_TYPES[0],
    developerType: DEVELOPER_TYPES[0],
    size: SIZES[1],
    contact: { name: 'Hannah Clarke', jobTitle: 'Operations director', email: 'hannah.clarke@binwise.example.com', phone: '01632 960150' },
    verifyMethod: VERIFY_METHODS[0],
    reason: fromSpreadsheet
  }, on(alex, 84, 9, 0))
  const binwisePro = addPackage(binwise, 'Binwise Pro', REASONS.addPackage.options[1], on(alex, 84, 9, 2))
  createCredentials(binwise, binwisePro, 'test', binwise.contacts[0], on(alex, 82, 12, 0))
  recordPat(binwise, binwisePro, { outcome: 'passed' }, on(sam, 47, 10, 30))
  approve(binwise, binwisePro, on(sam, 47, 10, 34))
  createCredentials(binwise, binwisePro, 'production', binwise.contacts[0], on(sam, 46, 15, 0))
  suspend(binwise, binwisePro, REASONS.suspend.options[0],
    'We have paused access for Binwise Pro because movements are being sent with missing waste codes. Fix this in the external test environment, then contact us.',
    on(priya, 8, 16, 45))

  // 7. Revoked.
  const tipstream = createProvider(list, {
    name: 'Tipstream Software Ltd',
    providerType: PROVIDER_TYPES[0],
    developerType: DEVELOPER_TYPES[2],
    size: SIZES[0],
    contact: { name: 'Lewis Grant', jobTitle: 'Owner', email: 'lewis.grant@tipstream.example.com', phone: '01632 960160' },
    verifyMethod: VERIFY_METHODS[1],
    reason: fromSpreadsheet
  }, on(alex, 79, 10, 10))
  const tipstreamPackage = addPackage(tipstream, 'Tipstream', REASONS.addPackage.options[1], on(alex, 79, 10, 12))
  createCredentials(tipstream, tipstreamPackage, 'test', tipstream.contacts[0], on(alex, 78, 9, 0))
  suspend(tipstream, tipstreamPackage, REASONS.suspend.options[0],
    'We have paused access for Tipstream because test movements are being sent in the wrong format.',
    on(sam, 35, 11, 0))
  revoke(tipstream, tipstreamPackage, REASONS.revoke.options[0],
    'We have ended access for Tipstream because the problem with the data was not fixed. Contact us if you want to start again.',
    on(priya, 12, 14, 5))

  // 8. An in-house developer that has been in test for a long time.
  const northgate = createProvider(list, {
    name: 'Northgate Skip Hire Ltd',
    providerType: PROVIDER_TYPES[1],
    developerType: DEVELOPER_TYPES[2],
    size: SIZES[2],
    contact: { name: 'Ruth Adeyemi', jobTitle: 'IT manager', email: 'ruth.adeyemi@northgateskips.example.com', phone: '01632 960170' },
    verifyMethod: VERIFY_METHODS[2],
    reason: asked
  }, on(sam, 58, 13, 0))
  const loads = addPackage(northgate, 'Northgate Loads', newPackage, on(sam, 58, 13, 5))
  createCredentials(northgate, loads, 'test', northgate.contacts[0], on(sam, 56, 10, 40))

  // 9. Removed. The case file is closed, and kept with its history.
  const loadwise = createProvider(list, {
    name: 'Loadwise Solutions Ltd',
    providerType: PROVIDER_TYPES[0],
    developerType: DEVELOPER_TYPES[1],
    size: SIZES[0],
    contact: { name: 'Peter Novak', jobTitle: 'Director', email: 'peter.novak@loadwise.example.com', phone: '01632 960180' },
    verifyMethod: VERIFY_METHODS[1],
    reason: fromSpreadsheet
  }, on(alex, 83, 15, 30))
  const loadwisePackage = addPackage(loadwise, 'Loadwise', REASONS.addPackage.options[1], on(alex, 83, 15, 33))
  createCredentials(loadwise, loadwisePackage, 'test', loadwise.contacts[0], on(alex, 81, 9, 45))
  closeProvider(loadwise, REASONS.removeProvider.options[0], on(priya, 25, 10, 20))

  // A message that went to everyone in production.
  recordBulkContact(list, systemActions, [kerbside.id, greenlane.id, binwise.id], {
    group: 'in production',
    summary: 'The production service will be unavailable on Saturday from 8am to midday while we move to a new database.',
    reason: REASONS.bulkContact.options[1]
  }, on(sam, 21, 9, 5))

  // One audit already done by the auditor: the 5 oldest actions by Alex Morgan
  // that are not "Case file created", one of which needed a follow-up.
  const sample = allActions(list)
    .filter((action) => action.by === alex && action.title !== 'Case file created')
    .slice(-5)
  const audits = {
    current: null,
    completed: [{
      id: 'audit-example',
      startedAt: daysAgo(30, 14, 0).toISOString(),
      completedAt: daysAgo(30, 14, 50).toISOString(),
      by: USERS.auditor.name,
      notes: 'One action had no reason I could match to a request. Asked Alex Morgan about it. They confirmed the request came by phone and added a note to the case file.',
      items: sample.map((action, index) => ({
        actionId: action.id,
        outcome: index === 2 ? 'follow-up' : 'ok',
        note: index === 2 ? 'No record of the software provider asking for credentials on this date.' : ''
      }))
    }]
  }

  return { list, systemActions, audits }
}

const examples = buildExamples()

module.exports = {
  USERS,
  STATUSES,
  ENVIRONMENTS,
  PROVIDER_TYPES,
  DEVELOPER_TYPES,
  SIZES,
  VERIFY_METHODS,
  REASONS,
  CHANNELS,
  PAT_OUTCOMES,
  AUDIT_SAMPLE_SIZE,
  // A fresh copy for each session, so one person's changes never show for another.
  exampleCaseFiles: () => clone(examples.list),
  exampleSystemActions: () => clone(examples.systemActions),
  exampleAudits: () => clone(examples.audits),
  findStatus,
  findEnvironment,
  findProvider,
  findPackage,
  findContact,
  keyContact,
  createProvider,
  updateName,
  updateDetails,
  addContact,
  updateContact,
  verifyContact,
  removeContact,
  recordContact,
  closeProvider,
  addPackage,
  movePackage,
  createCredentials,
  replaceSecret,
  removeOldSecret,
  recordPat,
  approve,
  suspend,
  reactivate,
  revoke,
  contactsForStatuses,
  recordBulkContact,
  allActions,
  startAudit,
  completeAudit,
  findAudit,
  auditedDates,
  toContactView,
  toPackageView,
  toHistoryView,
  toProviderView,
  listRows,
  statusCounts,
  similarProviders,
  checkReason,
  validateContact,
  looksLikeEmail,
  errorList
}
