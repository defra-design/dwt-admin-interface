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
    environment: 'Test'
  },
  {
    id: 'client-2',
    softwareProvider: 'Kerbside Technologies Ltd (Kerbside Collect)',
    clientName: 'Kerbside_Collect_Live',
    clientId: '7e21d0a6-5b93-4f17-8c62-1af49e30d8b5',
    environment: 'Production'
  },
  {
    id: 'client-3',
    softwareProvider: 'Skipflow Software Ltd',
    clientName: 'Skipflow_Test',
    clientId: '1c847b52-9de6-4a03-b7f8-52c96e1d4a37',
    environment: 'Test'
  },
  {
    id: 'client-4',
    softwareProvider: 'Wastebase Systems Ltd (Wastebase Manager)',
    clientName: 'Wastebase_Manager_Test',
    clientId: '4a0e91c7-3f28-4d65-bc19-7e53a8d20f96',
    environment: 'Test'
  },
  {
    id: 'client-5',
    softwareProvider: 'Greenlane Digital Ltd',
    clientName: 'Greenlane_Digital_Live',
    clientId: '2f95e07b-4c86-41d3-9a72-58be6d10c9f4',
    environment: 'Production'
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

module.exports = {
  ENVIRONMENTS,
  exampleCredentials,
  allCredentials,
  findCredential,
  newCredential,
  validate,
  errorList
}
