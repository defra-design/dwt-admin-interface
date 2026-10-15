//
// Client credentials — data and helpers for the v4 "Software providers"
// table and the "Create new credentials" journey.
//
// There is no backend. The five rows below are fixed dummy data. Credentials
// created in a session are held in session data (a key unique to v4 — see
// routes.js) and shown above these rows. All names and IDs are synthetic.
// The dummy client IDs are placeholders in UUID format — swap in the real
// examples when they are available.
//
// From version 4.2 each credential also has `lastChanged` (an ISO date and
// time, in local time) and the software provider is no longer recorded.
//
// The client secret is never shown in the table. A new secret is generated
// once, kept on the record only until the user closes the "created" page
// (`pendingSecret`), then deleted — so it can be shown once and never again.
//

const { randomUUID, randomBytes } = require('crypto')

const ENVIRONMENTS = [
  { value: 'Test', text: 'Test' },
  { value: 'Production', text: 'Production' }
]

const exampleCredentials = [
  {
    id: 'client-1',
    softwareProvider: 'Kerbside Technologies Ltd (Kerbside Collect)',
    clientName: 'Kerbside_Collect_Test',
    clientId: 'b3f9c41e-2a7d-4c58-9e10-6d8a5f2b71c4',
    environment: 'Test',
    lastChanged: '2026-09-14T09:32:00'
  },
  {
    id: 'client-2',
    softwareProvider: 'Kerbside Technologies Ltd (Kerbside Collect)',
    clientName: 'Kerbside_Collect_Live',
    clientId: '7e21d0a6-5b93-4f17-8c62-1af49e30d8b5',
    environment: 'Production',
    lastChanged: '2026-09-29T14:05:00'
  },
  {
    id: 'client-3',
    softwareProvider: 'Skipflow Software Ltd',
    clientName: 'Skipflow_Test',
    clientId: '1c847b52-9de6-4a03-b7f8-52c96e1d4a37',
    environment: 'Test',
    lastChanged: '2026-10-01T11:00:00'
  },
  {
    id: 'client-4',
    softwareProvider: 'Wastebase Systems Ltd (Wastebase Manager)',
    clientName: 'Wastebase_Manager_Test',
    clientId: '4a0e91c7-3f28-4d65-bc19-7e53a8d20f96',
    environment: 'Test',
    lastChanged: '2026-09-22T16:48:00'
  },
  {
    id: 'client-5',
    softwareProvider: 'Greenlane Digital Ltd',
    clientName: 'Greenlane_Digital_Live',
    clientId: '2f95e07b-4c86-41d3-9a72-58be6d10c9f4',
    environment: 'Production',
    lastChanged: '2026-10-05T10:15:00'
  }
]

// Newest first, then the fixed dummy rows.
function allCredentials (sessionList) {
  return (sessionList || []).slice().reverse().concat(exampleCredentials)
}

function findCredential (sessionList, id) {
  return (sessionList || []).find((c) => c.id === id) || null
}

// A dummy secret, not a real credential: prefixed by environment, followed by
// 32 random hex characters (the same shape as the API keys in v3 and v4).
function generateClientSecret (environment) {
  const prefix = environment === 'Production' ? 'dwt_live_' : 'dwt_test_'
  return prefix + randomBytes(16).toString('hex')
}

function newCredential (values) {
  return {
    id: randomUUID(),
    softwareProvider: values.softwareProvider,
    clientName: values.clientName,
    clientId: randomUUID(),
    environment: values.environment,
    pendingSecret: generateClientSecret(values.environment)
  }
}

// Letters (either case) and underscores only, as agreed for client names.
const CLIENT_NAME_PATTERN = /^[A-Za-z_]+$/

function validate (values, sessionList) {
  const errors = {}

  if (!values.softwareProvider) {
    errors.softwareProvider = 'Enter the software provider name'
  }

  if (!values.clientName) {
    errors.clientName = 'Enter a client name'
  } else if (!CLIENT_NAME_PATTERN.test(values.clientName)) {
    errors.clientName = 'Client name must only include letters and underscores'
  } else {
    const taken = allCredentials(sessionList)
      .some((c) => c.clientName.toLowerCase() === values.clientName.toLowerCase())
    if (taken) errors.clientName = 'A client with this name already exists. Enter a different client name'
  }

  if (!ENVIRONMENTS.some((e) => e.value === values.environment)) {
    errors.environment = 'Select whether this is for the test or production environment'
  }

  return errors
}

// Error summary links, in the same order as the fields on the page. The
// environment link points at the first radio.
function errorList (errors) {
  const list = []
  if (errors.softwareProvider) list.push({ text: errors.softwareProvider, href: '#softwareProvider' })
  if (errors.clientName) list.push({ text: errors.clientName, href: '#clientName' })
  if (errors.environment) list.push({ text: errors.environment, href: '#environment' })
  return list
}

// --- Version 4.2 ------------------------------------------------------------
// Credentials in 4.2 have no software provider, and can have their client name
// edited and their secret rotated. The fixed example rows can be changed too:
// the first time one is changed, a copy is kept in the session list under the
// same id, and that copy is shown in the row's original place.

const exampleIds = new Set(exampleCredentials.map((c) => c.id))

// Newly created credentials first (newest first), then the fixed rows, with
// any changed copies swapped in so they keep their place.
function listCredentials (sessionList) {
  const session = sessionList || []
  const changed = new Map(session.filter((c) => exampleIds.has(c.id)).map((c) => [c.id, c]))
  const created = session.filter((c) => !exampleIds.has(c.id)).reverse()
  return created.concat(exampleCredentials.map((c) => changed.get(c.id) || c))
}

function getCredential (sessionList, id) {
  return listCredentials(sessionList).find((c) => c.id === id) || null
}

// The copy to change. For a fixed row, this adds a copy to the session list.
function credentialToChange (sessionList, id) {
  const inSession = (sessionList || []).find((c) => c.id === id)
  if (inSession) return inSession
  const example = exampleCredentials.find((c) => c.id === id)
  if (!example) return null
  const copy = Object.assign({}, example)
  sessionList.push(copy)
  return copy
}

function createCredential (values) {
  return {
    id: randomUUID(),
    clientName: values.clientName,
    clientId: randomUUID(),
    environment: values.environment,
    lastChanged: new Date().toISOString(),
    pendingSecret: generateClientSecret(values.environment),
    pendingAction: 'created'
  }
}

// Rotating gives the credential a new secret, shown once on the next page.
function rotateSecret (credential) {
  credential.pendingSecret = generateClientSecret(credential.environment)
  credential.pendingAction = 'rotated'
  credential.lastChanged = new Date().toISOString()
}

// Adding another secret keeps the existing one working and gives the credential
// a second, new secret, shown once on the next page. `secrets` holds when each
// secret was generated (oldest first). Used from version 5. A credential
// without `secrets` has one secret, generated at `lastChanged`.
const MAX_SECRETS = 2

function secretDates (credential) {
  return credential.secrets && credential.secrets.length
    ? credential.secrets
    : [credential.lastChanged]
}

function addSecret (credential) {
  const now = new Date().toISOString()
  credential.secrets = secretDates(credential).concat(now)
  credential.pendingSecret = generateClientSecret(credential.environment)
  credential.pendingAction = 'added'
  credential.lastChanged = now
}

// Only the client name is asked for. `ownId` lets an edit keep its own name.
function validateClientName (clientName, sessionList, ownId) {
  const errors = {}

  if (!clientName) {
    errors.clientName = 'Enter a client name'
  } else if (!CLIENT_NAME_PATTERN.test(clientName)) {
    errors.clientName = 'Client name must only include letters and underscores'
  } else {
    const taken = listCredentials(sessionList)
      .some((c) => c.id !== ownId && c.clientName.toLowerCase() === clientName.toLowerCase())
    if (taken) errors.clientName = 'A client with this name already exists. Enter a different client name'
  }

  return errors
}

function clientNameErrorList (errors) {
  return errors.clientName ? [{ text: errors.clientName, href: '#clientName' }] : []
}

module.exports = {
  ENVIRONMENTS,
  exampleCredentials,
  allCredentials,
  findCredential,
  newCredential,
  validate,
  errorList,
  listCredentials,
  getCredential,
  credentialToChange,
  createCredential,
  rotateSecret,
  MAX_SECRETS,
  secretDates,
  addSecret,
  validateClientName,
  clientNameErrorList
}
