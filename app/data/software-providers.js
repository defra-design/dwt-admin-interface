//
// Software provider records for version 3.
//
// There is no backend. Providers live in the kit's session data
// (`req.session.data.softwareProviders`), so every participant starts with an
// empty list and "Clear data" in the footer resets it between sessions.
//

const { randomUUID } = require('crypto')
const { formatDateObj, formatDateTimeObj } = require('./dates')

// The service rule the "add another" pattern enforces. Stated up front in the
// field hint and repeated in the error message if someone tries to exceed it.
// https://design-patterns.service.justice.gov.uk/components/add-another/
const MAX_EMAILS = 5

// A form field can arrive as undefined, a single string, or an array of strings
// depending on how many inputs with that name were submitted.
function toArray (value) {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

// Deliberately loose — enough to catch obvious typos without rejecting valid
// but unusual addresses (GOV.UK guidance on email validation).
function looksLikeEmail (value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// Client IDs are UUIDs, matching the format Defra services issue.
function newProvider (values, now = new Date()) {
  const noteText = (values.notes || '').trim()
  return {
    id: randomUUID(),
    companyName: values.companyName,
    emails: values.emails.map((email) => email.trim()).filter(Boolean),
    testClientId: randomUUID(),
    productionClientId: randomUUID(),
    createdAt: now.toISOString(),
    // Notes are append-only: each one keeps the date and time it was added and
    // is never edited or removed.
    notes: noteText ? [{ text: noteText, addedAt: now.toISOString() }] : []
  }
}

// Fixed example data for the filled-state page (/v3/software-providers/example).
// Deliberately hard-coded rather than generated, so screenshots and demos look
// the same every time. The company names are fictional.
const exampleProviders = [
  {
    id: 'example-kerbside',
    companyName: 'Kerbside Technologies Ltd',
    emails: ['integrations@kerbside.example.com', 'support@kerbside.example.com'],
    testClientId: 'b3f9c41e-2a7d-4c58-9e10-6d8a5f2b71c4',
    productionClientId: '7e21d0a6-5b93-4f17-8c62-1af49e30d8b5',
    createdAt: '2026-04-14T09:20:00.000Z',
    notes: [
      { text: 'Production access granted after PAT sign-off on 10 April 2026.', addedAt: '2026-04-14T09:22:00.000Z' },
      { text: 'Asked to be contacted through the integrations mailbox, not support.', addedAt: '2026-05-06T15:40:00.000Z' }
    ]
  },
  {
    id: 'example-skipflow',
    companyName: 'Skipflow Software Ltd',
    emails: ['hello@skipflow.example.com'],
    testClientId: '1c847b52-9de6-4a03-b7f8-52c96e1d4a37',
    productionClientId: 'd58a3e09-6c14-4b82-a35d-90e7cb2f16d8',
    createdAt: '2026-06-02T14:45:00.000Z',
    notes: [
      { text: 'Single developer. Expect slower responses during August.', addedAt: '2026-06-02T14:47:00.000Z' }
    ]
  },
  {
    id: 'example-wastebase',
    companyName: 'Wastebase Systems Ltd',
    emails: ['api@wastebase.example.com', 'billing@wastebase.example.com', 'ops@wastebase.example.com'],
    testClientId: '4a0e91c7-3f28-4d65-bc19-7e53a8d20f96',
    productionClientId: '9b62f44a-8d51-4e37-92c6-0fb85d1a4e73',
    createdAt: '2026-07-28T11:05:00.000Z',
    notes: []
  },
  {
    id: 'example-greenlane',
    companyName: 'Greenlane Digital Ltd',
    emails: ['dev@greenlane.example.com', 'accounts@greenlane.example.com'],
    testClientId: '6d3c8a19-7b40-4f92-8e15-c2a970f4b3d8',
    productionClientId: '2f95e07b-4c86-41d3-9a72-58be6d10c9f4',
    createdAt: '2026-09-09T16:30:00.000Z',
    notes: [
      { text: 'Onboarded as part of the September cohort. Two mailboxes on request.', addedAt: '2026-09-09T16:33:00.000Z' }
    ]
  }
]

function findProvider (sessionList, id) {
  return (sessionList || []).find((p) => p.id === id) ||
    exampleProviders.find((p) => p.id === id) ||
    null
}

function isExample (provider) {
  return exampleProviders.some((p) => p.id === provider.id)
}

function listPath (provider) {
  return isExample(provider) ? '/v3/software-providers/example' : '/v3/software-providers'
}

function toRow (provider) {
  return {
    id: provider.id,
    companyName: provider.companyName,
    testClientId: provider.testClientId,
    productionClientId: provider.productionClientId,
    createdDate: formatDateObj(new Date(provider.createdAt))
  }
}

// Most recently created first. MOJ's case list guidance says research should set
// the default order, and "most recently updated" is one of the orders it names —
// it also puts a newly added provider where the user is looking for it.
// https://design-patterns.service.justice.gov.uk/pages/case-list/
function toRows (providers) {
  return providers
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(toRow)
}

// Notes are append-only and shown newest first, like a case history.
function toDetail (provider) {
  return {
    id: provider.id,
    companyName: provider.companyName,
    emails: provider.emails || [],
    notes: toNotes(provider),
    listHref: listPath(provider)
  }
}

function toNotes (provider) {
  return (provider.notes || [])
    .slice()
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .map((note) => ({
      text: note.text,
      addedLabel: formatDateTimeObj(new Date(note.addedAt))
    }))
}

// Errors are keyed so the view can mark the right field:
//   companyName  – the company name input
//   emailGroup   – the whole "add another" group (only used for "too many")
//   emails       – { <index>: message } for a single email address input
//
// Email errors sit on the individual field, not on the group, because each field
// is its own question — MOJ's "add another" guidance is to name the item in the
// message ("Enter a first name for person 2") and show it beside that field as
// well as in the error summary.
// https://design-patterns.service.justice.gov.uk/components/add-another/
//
// GOV.UK error message guidance: say what is wrong and how to fix it, and reuse
// the wording from the label. https://design-system.service.gov.uk/components/error-message/
//
// example.com is used in the format message because RFC 2606 reserves it, so it
// can never belong to a real organisation. Real-looking domains can receive mail.
const FORMAT_EXAMPLE = 'for example name@example.com'

function updateCompanyName (provider, companyName) {
  provider.companyName = companyName
}

function updateEmails (provider, emails) {
  provider.emails = emails.map((email) => email.trim()).filter(Boolean)
}

// Shared by the add page and the change-emails page: add a field, remove one,
// or hand back 'save' so the caller can validate and persist.
function applyEmailActions (values, body) {
  if (body.remove !== undefined) {
    const index = Number(body.remove)
    if (values.emails.length > 1 && index >= 0 && index < values.emails.length) {
      values.emails.splice(index, 1)
    }
    return { action: 'remove', focus: 'add-another-email' }
  }

  if (body.addAnother !== undefined) {
    if (values.emails.length >= MAX_EMAILS) {
      return { action: 'tooMany', errors: maxEmailsError() }
    }
    values.emails.push('')
    return { action: 'add', focus: `email-${values.emails.length}` }
  }

  return { action: 'save' }
}

function validate (values, options) {
  const fields = (options && options.fields) || ['companyName', 'emails']
  const errors = {}

  if (fields.includes('companyName') && !values.companyName) {
    errors.companyName = 'Enter a company name'
  }

  // With a single field there is nothing to distinguish it from, so the number
  // is left out and the message reads naturally.
  if (!fields.includes('emails')) return errors

  const onlyOne = values.emails.length === 1
  const emailErrors = {}

  if (!values.emails.some((email) => email.trim())) {
    // Nothing entered at all. One error on the first field — there is no point
    // also flagging the other blanks when the user has not started.
    emailErrors[0] = 'Enter at least one email address'
  } else {
    values.emails.forEach((email, index) => {
      const value = email.trim()
      if (!value) {
        emailErrors[index] = `Enter email address ${index + 1} or remove the empty field`
      } else if (!looksLikeEmail(value)) {
        emailErrors[index] = onlyOne
          ? `Enter the email address in the correct format, ${FORMAT_EXAMPLE}`
          : `Enter email address ${index + 1} in the correct format, ${FORMAT_EXAMPLE}`
      }
    })
  }

  if (Object.keys(emailErrors).length) errors.emails = emailErrors

  return errors
}

// Deliberately not the same wording as the hint ("You can add up to 5 email
// addresses"): the hint states the rule, the error says what has just happened.
// Repeating the hint verbatim directly beneath it reads as a glitch.
function maxEmailsError () {
  return { emailGroup: `You cannot add more than ${MAX_EMAILS} email addresses` }
}

// Error summary links in the same order as the fields on the page. The only
// group-level error ("too many") points at the "Add another email address"
// button, because no single field is at fault.
function errorList (errors) {
  const list = []
  if (errors.companyName) {
    list.push({ text: errors.companyName, href: '#companyName' })
  }
  if (errors.emailGroup) {
    list.push({ text: errors.emailGroup, href: '#add-another-email' })
  }
  Object.keys(errors.emails || {})
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((index) => {
      list.push({ text: errors.emails[index], href: `#email-${index + 1}` })
    })
  return list
}

module.exports = {
  MAX_EMAILS,
  toArray,
  newProvider,
  exampleProviders,
  findProvider,
  isExample,
  listPath,
  toRow,
  toRows,
  toDetail,
  toNotes,
  updateCompanyName,
  updateEmails,
  applyEmailActions,
  validate,
  maxEmailsError,
  errorList
}
