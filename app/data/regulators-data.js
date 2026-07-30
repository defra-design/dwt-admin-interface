//
// Mocked data for the Reporting > Waste organisations report.
//
// Generated ONCE at module load from a seeded PRNG, so the numbers are
// deterministic (stable across reloads/restarts). Replace this whole module
// with a real query against the registration database when integrating.
//

// --- Seeded PRNG (mulberry32) ----------------------------------------------
function mulberry32 (seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260604)

// "Now", captured once so generation and period filters stay aligned.
const NOW = new Date()
function dateDaysAgo (n) {
  return new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n)
}

// --- Organisation names ----------------------------------------------------
const NAME_PREFIXES = [
  'Northfield', 'Riverside', 'Greenacre', 'Oakwood', 'Silverline', 'Ironbridge',
  'Fenwick', 'Harrowgate', 'Merton', 'Kesteven', 'Bramwell', 'Colston',
  'Deepdale', 'Elmsworth', 'Foxhollow', 'Grantley', 'Hollis', 'Ivywood',
  'Juniper', 'Kendrick', 'Larkspur', 'Millbrook', 'Norwood', 'Oldfield',
  'Pennant', 'Quarrymoor', 'Rushton', 'Stanmore', 'Thornfield', 'Underhill',
  'Vantage', 'Westgate', 'Yarrow'
]
const NAME_SECTORS = [
  'Waste', 'Recycling', 'Environmental', 'Resource', 'Materials',
  'Reclamation', 'Salvage', 'Composting'
]
const NAME_SUFFIXES = ['Ltd', 'Group', 'Services Ltd', 'Solutions', 'PLC', '& Co Ltd', 'Partners', 'UK Ltd']

// Excluded combinations that happen to match a real organisation's name.
const EXCLUDED_NAMES = new Set(['Oldfield Environmental Services Ltd'])

function generateOrgName () {
  let name
  do {
    const prefix = NAME_PREFIXES[Math.floor(rand() * NAME_PREFIXES.length)]
    const sector = NAME_SECTORS[Math.floor(rand() * NAME_SECTORS.length)]
    const suffix = NAME_SUFFIXES[Math.floor(rand() * NAME_SUFFIXES.length)]
    name = `${prefix} ${sector} ${suffix}`
  } while (EXCLUDED_NAMES.has(name))
  return name
}

// --- Payment status/period ---------------------------------------------------
// Payment periods always run 1 Oct to 30 Sep the following year.

// The Oct-Sep cycle covering "now" ends in this year (rolls over on 1 Oct).
const octFirstThisYear = new Date(NOW.getFullYear(), 9, 1)
const CURRENT_PERIOD_END_YEAR = NOW >= octFirstThisYear ? NOW.getFullYear() + 1 : NOW.getFullYear()

function twoDigitYear (year) {
  return String(year).slice(-2)
}

function formatOctPeriod (endYear) {
  return `Oct ${twoDigitYear(endYear - 1)} – Sep ${twoDigitYear(endYear)}`
}

// Paid/in-progress orgs are in the current cycle or (occasionally) the next one.
function currentOrUpcomingPeriod () {
  const endYear = CURRENT_PERIOD_END_YEAR + (rand() < 0.5 ? 0 : 1)
  return formatOctPeriod(endYear)
}

// Unpaid orgs, when a period is shown at all, show a lapsed (past) cycle.
function pastPeriod () {
  const endYear = CURRENT_PERIOD_END_YEAR - 1 - Math.floor(rand() * 3)
  return formatOctPeriod(endYear)
}

// Deterministic v4-style UUID (e.g. f7bcdd5d-3af0-4a96-8245-4cbf3a11cf09).
function randomHex (n) {
  let s = ''
  for (let i = 0; i < n; i++) s += Math.floor(rand() * 16).toString(16)
  return s
}
function randomUuid () {
  const variant = '89ab'[Math.floor(rand() * 4)]
  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${variant}${randomHex(3)}-${randomHex(12)}`
}

// --- Organisations (exactly 287, all registered on/before today) -----------
const TOTAL_ORGS = 287
const organisations = []
for (let i = 1; i <= TOTAL_ORGS; i++) {
  const id = randomUuid()
  // Registered some time in the last ~3 years (all in the past).
  const registeredDate = dateDaysAgo(15 + Math.floor(rand() * 1080))
  const apiCodeCount = 1 + Math.floor(rand() * 3) // 1–3 active API codes
  // ~65% paid, the rest unpaid — a single org is nudged to "in progress" below.
  const paymentStatus = rand() < 0.65 ? 'paid' : 'unpaid'
  organisations.push({ id, registeredDate, apiCodeCount, paymentStatus })
}

// Exactly one org (of the unpaid ones) is "in progress".
const unpaidOrgs = organisations.filter((o) => o.paymentStatus === 'unpaid')
unpaidOrgs[Math.floor(rand() * unpaidOrgs.length)].paymentStatus = 'in progress'

// Organisation name and payment period both key off the final payment status:
// paid/in-progress orgs have a known name and a current (or upcoming) payment
// period. Unpaid orgs with a lapsed period were known to us when they last
// paid, so their name is known too; unpaid orgs with no period on record at
// all mostly have no name on file either.
for (const org of organisations) {
  if (org.paymentStatus === 'paid' || org.paymentStatus === 'in progress') {
    org.organisationName = generateOrgName()
    org.paymentPeriod = currentOrUpcomingPeriod()
  } else if (rand() < 0.25) {
    org.organisationName = generateOrgName()
    org.paymentPeriod = pastPeriod()
  } else {
    org.organisationName = rand() < 0.25 ? generateOrgName() : null
    org.paymentPeriod = null
  }
}

// A handful of extra unpaid orgs, never having had a payment period recorded
// (so no lapsed period to show), registered within a typical demo date range.
// IDs are deliberately low-sorting so they surface in the (id-sorted, capped)
// registrations table used to demo this period.
const EXTRA_UNPAID_NO_PERIOD = [
  { id: '00000000-89ab-4000-8000-000000000001', registeredDate: new Date(2025, 8, 5), organisationName: null },
  { id: '00000000-89ab-4000-8000-000000000002', registeredDate: new Date(2025, 10, 12), organisationName: 'Deepdale Salvage Ltd' },
  { id: '00000000-89ab-4000-8000-000000000003', registeredDate: new Date(2026, 0, 20), organisationName: null },
  { id: '00000000-89ab-4000-8000-000000000004', registeredDate: new Date(2026, 2, 3), organisationName: null },
  { id: '00000000-89ab-4000-8000-000000000005', registeredDate: new Date(2026, 3, 15), organisationName: null },
  { id: '00000000-89ab-4000-8000-000000000006', registeredDate: new Date(2026, 5, 22), organisationName: null }
]
for (const extra of EXTRA_UNPAID_NO_PERIOD) {
  organisations.push({
    id: extra.id,
    registeredDate: extra.registeredDate,
    apiCodeCount: 1 + Math.floor(rand() * 3),
    paymentStatus: 'unpaid',
    paymentPeriod: null,
    organisationName: extra.organisationName
  })
}

// Only organisations registered before 27 Apr 2026 may have an unknown name —
// anything registered on/after that date is backfilled with a name.
const NAME_UNKNOWN_CUTOFF = new Date(2026, 3, 27)
for (const org of organisations) {
  if (!org.organisationName && org.registeredDate >= NAME_UNKNOWN_CUTOFF) {
    org.organisationName = generateOrgName()
  }
}

// Organisations whose registration date falls within the period.
function listRegisteredInPeriod (from, to) {
  return organisations
    .filter((o) => o.registeredDate >= from && o.registeredDate <= to)
    .slice()
    .sort((a, b) => a.registeredDate - b.registeredDate || a.id.localeCompare(b.id))
}

module.exports = {
  organisations,
  listRegisteredInPeriod
}
