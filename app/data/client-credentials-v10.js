//
// Client credentials — data and helpers for the v4 "Software providers"
// table and the "Create new credentials" journey.
//
// There is no backend. The rows below are fixed dummy data. Credentials
// created in a session are held in session data (a key unique to v10 — see
// routes.js) and shown above these rows. All names and IDs are synthetic.
// The dummy client IDs are 26 characters (lowercase letters and numerals).
// This is a copy of client-credentials-v9.js for v10, with new example rows,
// so earlier versions keep their own data.
//
// From version 4.2 each credential also has `lastChanged` (an ISO date and
// time, in local time) and the software provider is no longer recorded.
//
// The client secret is never shown in the table. A new secret is generated
// once, kept on the record only until the user closes the "created" page
// (`pendingSecret`), then deleted — so it can be shown once and never again.
//

const { randomUUID, randomInt, createHash } = require('crypto')

// Dummy IDs and secrets use lowercase letters and numerals only.
const ID_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomString (length) {
  let result = ''
  for (let i = 0; i < length; i++) result += ID_CHARACTERS[randomInt(ID_CHARACTERS.length)]
  return result
}

// A dummy client ID: 26 lowercase letters and numerals.
function generateClientId () {
  return randomString(26)
}

const ENVIRONMENTS = [
  { value: 'Test', text: 'Test' },
  { value: 'Production', text: 'Production' }
]

// Research data for 26 November 2026: 50 External test and 30 Production clients,
// grouped by software provider (all synthetic). Production clients are a subset
// of the External test ones, but were set up at different times by different
// people, so their client names often differ. Meridian Software Ltd
// (ResourceHub Enterprise) is the provider participants look for. It is in
// External test only. Meridian Waste Group is a different provider, there to
// be confused with it.
//
// Each row: client name, when the newest secret was generated and, for clients
// with two secrets, when the older one was generated.

// The client ID comes from the client name, so it stays the same every time
// the prototype restarts: 26 lowercase letters and numerals.
function fixedClientId (clientName) {
  const hash = createHash('sha256').update(clientName).digest()
  let id = ''
  for (let i = 0; i < 26; i++) id += ID_CHARACTERS[hash[i] % ID_CHARACTERS.length]
  return id
}

function example (environment) {
  return (clientName, lastChanged, olderSecret) => {
    const id = fixedClientId(clientName)
    const credential = { id, clientName, clientId: id, environment, lastChanged }
    if (olderSecret) credential.secrets = [olderSecret, lastChanged]
    return credential
  }
}
const test = example('Test')
const live = example('Production')

const exampleCredentials = [
  // Meridian Software Ltd: ResourceHub Enterprise and ResourceHub Lite. External test only.
  test('Meridian_ResourceHub_Enterprise', '2026-10-14T10:22:00'),
  test('Meridian_ResourceHub_Lite', '2026-09-03T15:40:00', '2026-03-11T09:05:00'),
  test('Meridian_Software', '2026-06-18T11:30:00'),

  // Meridian Waste Group: a different provider with a similar name
  test('Meridian_Waste_Group_Test', '2026-08-12T13:15:00'),
  live('Meridian_Waste_Group', '2026-10-02T09:48:00'),

  // Kerbside Technologies Ltd: Kerbside Collect, England and Scotland
  test('Kerbside_Collect_Test', '2026-09-14T09:32:00'),
  test('Kerbside_Collect_Scotland_Test', '2026-07-22T14:10:00', '2026-01-19T10:00:00'),
  live('Kerbside_Collect_Live', '2026-09-29T14:05:00'),
  live('Kerbside_Collect_Glasgow', '2026-11-04T16:20:00'),

  // Skipflow Software Ltd
  test('Skipflow_Test', '2026-10-01T11:00:00'),
  live('Skipflow_Software', '2026-10-20T10:35:00'),

  // Wastebase Systems Ltd: Wastebase Manager and Wastebase Weighbridge
  test('Wastebase_Manager_Test', '2026-09-22T16:48:00'),
  test('Wastebase_Weighbridge_Test', '2026-05-07T08:55:00'),
  live('Wastebase_Manager_Live', '2026-11-10T12:00:00', '2026-04-15T12:00:00'),

  // Greenlane Digital Ltd: Cardiff, Bristol and no place
  test('Greenlane_Digital', '2026-04-28T10:10:00'),
  test('Greenlane_Digital_Cardiff', '2026-08-19T15:25:00'),
  test('Greenlane_Digital_Bristol', '2026-08-19T15:31:00'),
  live('Greenlane_Digital_Live', '2026-10-05T10:15:00'),
  live('Greenlane_Cardiff', '2026-11-12T09:00:00'),
  live('Greenlane_Digital_Bristol_Live', '2026-11-12T09:12:00', '2026-06-02T14:45:00'),

  // Binwise Solutions Ltd: Cardiff and no place
  test('Binwise', '2025-11-20T10:00:00'),
  test('Binwise_Solutions_Cardiff', '2026-02-09T13:40:00'),
  live('Binwise_Live', '2026-03-16T11:20:00'),

  // Circulr Ltd: Circulr Trace and Circulr Docs
  test('Circulr_Trace', '2026-07-01T09:15:00'),
  test('Circulr_Docs', '2026-07-01T09:20:00', '2026-02-24T16:00:00'),
  live('Circulr_Trace_Prod', '2026-09-08T10:30:00'),

  // Ecotrack Data Ltd: Edinburgh, Leeds and no place
  test('Ecotrack_Data_Test', '2026-01-13T14:00:00'),
  test('Ecotrack_Edinburgh', '2026-06-25T10:45:00'),
  test('Ecotrack_Leeds', '2026-06-25T10:52:00'),
  live('Ecotrack_Data_Live', '2026-03-30T09:00:00'),
  live('Ecotrack_Data_Edinburgh', '2026-10-27T11:05:00'),
  live('Ecotrack_Data_Leeds', '2026-10-27T11:10:00', '2026-08-04T15:30:00'),

  // Haulage Hub Ltd: HaulLog
  test('HaulageHub_HaulLog', '2026-05-19T12:25:00'),
  live('Haulage_Hub_HaulLog', '2026-09-15T08:40:00'),

  // Recyclo Systems Ltd: Recyclo Resource Manager
  test('Recyclo_Resource_Manager', '2026-08-27T10:00:00', '2026-02-11T10:00:00'),
  test('Recyclo_Systems', '2026-03-05T15:15:00'),
  live('Recyclo_Resource_Manager_Live', '2026-10-09T13:50:00'),

  // Tipsite Software Ltd
  test('Tipsite_Test', '2026-04-14T09:30:00'),
  live('Tipsite', '2026-07-30T16:05:00'),

  // Consignly Ltd: Swansea and Manchester
  test('Consignly_Swansea', '2026-09-01T11:11:00'),
  test('Consignly_Manchester', '2026-09-01T11:18:00'),
  live('Consignly_Manchester_Prod', '2026-11-18T10:00:00'),

  // Thistle Digital Ltd: Aberdeen, Inverness and Kent
  test('Thistle_Digital_Aberdeen', '2026-06-09T09:00:00'),
  test('Thistle_Digital_Inverness', '2026-06-09T09:06:00', '2025-12-01T09:00:00'),
  test('Thistle_Digital_Kent', '2026-10-21T14:35:00'),
  live('Thistle_Aberdeen', '2026-08-17T10:20:00'),
  live('Thistle_Digital_Inverness_Live', '2026-11-24T15:45:00'),

  // Dragonfly Data Ltd: WasteDesk, Wrexham and Birmingham
  test('Dragonfly_WasteDesk_Wrexham', '2026-07-08T13:00:00'),
  test('Dragonfly_WasteDesk_Birmingham', '2026-07-08T13:07:00'),
  live('Dragonfly_Data_Wrexham', '2026-10-13T09:25:00'),
  live('Dragonfly_Data_WasteDesk_Birmingham', '2026-10-13T09:31:00', '2026-07-08T13:07:00'),

  // Loadlog Ltd: Leeds and no place
  test('Loadlog_Test', '2026-02-17T10:40:00'),
  test('Loadlog_Leeds', '2026-11-03T12:15:00'),

  // Compactor Cloud Ltd: Compactor Cloud and Compactor Cloud Fleet
  test('Compactor_Cloud', '2026-05-26T11:50:00'),
  test('Compactor_Cloud_Fleet', '2026-09-30T15:00:00', '2026-05-26T11:55:00'),
  live('Compactor_Cloud_Live', '2026-10-30T10:10:00'),

  // Pennine Data Services Ltd: Pennine Transfer and Pennine Hazwaste
  test('Pennine_Transfer', '2026-03-23T09:45:00'),
  test('Pennine_Hazwaste_Test', '2026-08-06T14:20:00'),
  live('Pennine_Data_Transfer', '2026-06-29T10:00:00'),

  // Severn Systems Ltd: Newport and Gloucester
  test('Severn_Systems_Newport', '2026-04-02T13:30:00'),
  test('Severn_Systems_Gloucester', '2026-04-02T13:36:00'),
  live('Severn_Newport', '2026-09-24T09:15:00', '2026-04-20T09:15:00'),

  // Clydeside Software Ltd
  test('Clydeside_Software_Test', '2026-01-27T11:00:00'),
  live('Clydeside_Software_Glasgow', '2026-05-12T14:40:00'),

  // Taff Digital Ltd: TipTrack. External test only.
  test('Taff_Digital_TipTrack', '2026-10-16T10:05:00'),

  // Ashby Waste Systems Ltd: Cornwall and no place
  test('Ashby_Waste_Systems', '2025-12-10T09:30:00'),
  test('Ashby_Waste_Cornwall', '2026-07-14T16:10:00'),
  live('Ashby_Waste_Systems_Live', '2026-02-03T10:50:00'),

  // Metalnote Ltd
  test('Metalnote_Test', '2026-08-25T12:00:00'),
  live('Metalnote', '2026-11-06T13:25:00'),

  // Greenbin Data Ltd: Dundee and Fife. External test only.
  test('Greenbin_Data_Dundee', '2026-09-10T10:30:00'),
  test('Greenbin_Data_Fife', '2026-09-10T10:37:00', '2026-03-18T14:00:00'),

  // Ridgeway Software Ltd: Ridgeway Waste Manager
  test('Ridgeway_Waste_Manager', '2026-05-05T15:20:00'),
  live('Ridgeway_Software_Ltd', '2026-08-11T09:55:00'),

  // Transferly Ltd: Gwynedd and no place
  test('Transferly_Test', '2026-02-26T10:15:00'),
  test('Transferly_Gwynedd', '2026-10-07T11:45:00'),
  live('Transferly_Live', '2026-06-16T14:30:00'),

  // Carrick Software Ltd. External test only.
  test('Carrick_Software', '2026-11-19T09:40:00'),

  // Hazcon Digital Ltd: Hazcon Notes
  test('Hazcon_Notes_Test', '2026-04-21T13:05:00'),
  live('Hazcon_Notes', '2026-09-02T10:25:00', '2026-04-29T10:25:00')
]

// Newest first, then the fixed dummy rows.
function allCredentials (sessionList) {
  return (sessionList || []).slice().reverse().concat(exampleCredentials)
}

function findCredential (sessionList, id) {
  return (sessionList || []).find((c) => c.id === id) || null
}

// A dummy secret, not a real credential: 52 lowercase letters and numerals.
function generateClientSecret () {
  return randomString(52)
}

function newCredential (values) {
  return {
    id: randomUUID(),
    softwareProvider: values.softwareProvider,
    clientName: values.clientName,
    clientId: generateClientId(),
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
  // The id is the client ID, which is the identifier in the URL: /software-providers/{clientId}.
  const clientId = generateClientId()
  return {
    id: clientId,
    clientName: values.clientName,
    clientId,
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
// With `environment`, a name only has to be unique in that environment, because
// External test and Production are separate.
function validateClientName (clientName, sessionList, ownId, environment) {
  const errors = {}

  if (!clientName) {
    errors.clientName = 'Enter a client name'
  } else if (!CLIENT_NAME_PATTERN.test(clientName)) {
    errors.clientName = 'Client name must only include letters and underscores'
  } else {
    const taken = listCredentials(sessionList)
      .filter((c) => !environment || c.environment === environment)
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
