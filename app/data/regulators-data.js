//
// Mocked data for the Regulators reporting section.
//
// Everything is generated ONCE at module load from a seeded PRNG, so the
// numbers are deterministic (stable across reloads/restarts) and every report
// reconciles with every other one. Replace this whole module with real queries
// against the reporting database when integrating for real.
//
// Key invariant: for any period, (orgs reporting) + (orgs not reporting) =
// (orgs registered as at the period end). % reporting = reporting / registered.
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
const pick = (arr) => arr[Math.floor(rand() * arr.length)]

// "Now", captured once so generation and period filters stay aligned.
const NOW = new Date()
function dateDaysAgo (n) {
  return new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n)
}

// --- EWC waste codes -------------------------------------------------------
// Shaped to match the Receipt API GET /reference-data/ewc-codes response:
// a six-digit `code` (no spaces) and an `isHazardous` boolean.
const wasteCodes = [
  { code: '200301', isHazardous: false, description: 'Mixed municipal waste' },
  { code: '170101', isHazardous: false, description: 'Concrete' },
  { code: '150101', isHazardous: false, description: 'Paper and cardboard packaging' },
  { code: '191212', isHazardous: false, description: 'Other wastes from mechanical treatment of waste' },
  { code: '170405', isHazardous: false, description: 'Iron and steel' },
  { code: '020106', isHazardous: false, description: 'Animal faeces, urine and manure' },
  { code: '160601', isHazardous: true, description: 'Lead batteries' },
  { code: '130205', isHazardous: true, description: 'Mineral-based engine oils' }
]

// --- Organisations (exactly 287, all registered on/before today) -----------
const NAME_PLACES = [
  'Ashford', 'Barton', 'Calder', 'Denby', 'Eastgate', 'Foxton', 'Garforth',
  'Hartwell', 'Ingleby', 'Kelsall', 'Langton', 'Marsden', 'Northwood',
  'Oakfield', 'Pickering', 'Quarrydale', 'Redmoor', 'Sandholme', 'Thornbury',
  'Upton', 'Vale', 'Westbrook', 'Yardley', 'Brookend', 'Clifton'
]
const NAME_TYPES = [
  'Recycling', 'Waste Services', 'Skips', 'Environmental', 'Salvage',
  'Aggregates', 'Metals', 'Reclamation', 'Resource Management', 'Haulage'
]
const NAME_SUFFIXES = ['Ltd', 'Ltd', 'Ltd', 'plc', 'Group', '& Sons', 'Holdings']
const PERMIT_LETTERS = 'ABCDEFGHJKLMNPRSTUWXYZ'

function randomPermit () {
  const l = () => PERMIT_LETTERS[Math.floor(rand() * PERMIT_LETTERS.length)]
  const d = () => Math.floor(rand() * 10)
  return `EPR/${l()}${l()}${d()}${d()}${d()}${d()}${l()}${l()}`
}

const TOTAL_ORGS = 287
const organisations = []
for (let i = 1; i <= TOTAL_ORGS; i++) {
  const id = `ORG-${String(i).padStart(4, '0')}`
  const name = `${pick(NAME_PLACES)} ${pick(NAME_TYPES)} ${pick(NAME_SUFFIXES)}`
  // Registered some time in the last ~3 years (all in the past).
  const registeredDate = dateDaysAgo(15 + Math.floor(rand() * 1080))
  organisations.push({ id, name, permitNumber: randomPermit(), registeredDate })
}

// --- Movement receipts -----------------------------------------------------
// ~78% of orgs report at least one receipt; the rest report none. Receipt dates
// fall within the last ~18 months so period filters are meaningful.
const receipts = []
let receiptSeq = 0
for (const org of organisations) {
  if (rand() >= 0.78) continue // this org reports nothing
  const count = 1 + Math.floor(rand() * rand() * 40) // skew towards small counts
  for (let j = 0; j < count; j++) {
    receiptSeq++
    receipts.push({
      id: `RCP-${String(receiptSeq).padStart(6, '0')}`,
      orgId: org.id,
      date: dateDaysAgo(Math.floor(rand() * 540)),
      wasteCode: pick(wasteCodes).code,
      quantityTonnes: Math.round((0.5 + rand() * 25) * 10) / 10
    })
  }
}

// --- Indexes ---------------------------------------------------------------
const orgById = new Map(organisations.map((o) => [o.id, o]))
const receiptsByOrg = new Map()
for (const r of receipts) {
  if (!receiptsByOrg.has(r.orgId)) receiptsByOrg.set(r.orgId, [])
  receiptsByOrg.get(r.orgId).push(r)
}
const wasteCodeDesc = new Map(wasteCodes.map((w) => [w.code, w.description]))

// --- Derivation helpers ----------------------------------------------------
function inPeriod (date, from, to) {
  return date >= from && date <= to
}

function registeredAsAt (asAt) {
  return organisations.filter((o) => o.registeredDate <= asAt)
}

function receiptsForOrg (orgId, from, to) {
  const all = receiptsByOrg.get(orgId) || []
  if (!from || !to) return all
  return all.filter((r) => inPeriod(r.date, from, to))
}

function movementsForOrg (orgId, from, to) {
  return receiptsForOrg(orgId, from, to).length
}

// Set of org ids with >= 1 receipt in the period.
function reportingOrgIds (from, to) {
  const ids = new Set()
  for (const r of receipts) {
    if (inPeriod(r.date, from, to)) ids.add(r.orgId)
  }
  return ids
}

// Headline metrics for the dashboard.
// `registeredBase` (orgs registered as at the period end) is the universe for
// the reporting / not-reporting / % figures. `registeredInPeriod` counts orgs
// whose registration date falls within the period (shown as its own metric).
function metrics (from, to) {
  const registered = registeredAsAt(to)
  const registeredInPeriod = organisations.filter(
    (o) => o.registeredDate >= from && o.registeredDate <= to
  ).length
  const reportingIds = reportingOrgIds(from, to)
  const reporting = registered.filter((o) => reportingIds.has(o.id)).length
  const notReporting = registered.length - reporting
  const pct = registered.length ? Math.round((reporting / registered.length) * 1000) / 10 : 0
  return {
    registeredBase: registered.length,
    registeredInPeriod,
    reporting,
    notReporting,
    pctReporting: pct
  }
}

// Report 1: registered orgs with no receipt in the period.
function listNotReporting (from, to) {
  const reportingIds = reportingOrgIds(from, to)
  return registeredAsAt(to)
    .filter((o) => !reportingIds.has(o.id))
    .sort((a, b) => a.id.localeCompare(b.id))
}

// Report 2: registered orgs that reported, with their movement count.
function listReporting (from, to) {
  const reportingIds = reportingOrgIds(from, to)
  return registeredAsAt(to)
    .filter((o) => reportingIds.has(o.id))
    .map((o) => ({ ...o, movements: movementsForOrg(o.id, from, to) }))
    .sort((a, b) => b.movements - a.movements || a.id.localeCompare(b.id))
}

// Movements grouped by EWC waste code (optionally limited to a set of org ids).
function wasteCodeBreakdown (from, to, orgIds) {
  const counts = new Map()
  for (const r of receipts) {
    if (!inPeriod(r.date, from, to)) continue
    if (orgIds && !orgIds.has(r.orgId)) continue
    counts.set(r.wasteCode, (counts.get(r.wasteCode) || 0) + 1)
  }
  return wasteCodes
    .map((w) => ({ code: w.code, description: w.description, movements: counts.get(w.code) || 0 }))
    .filter((row) => row.movements > 0)
    .sort((a, b) => b.movements - a.movements)
}

// Org detail: an org's receipts in a period grouped by EWC waste code, with the
// movement count and summed tonnes per code.
function orgWasteCodeSummary (orgId, from, to) {
  const totals = new Map() // code -> { movements, tonnes }
  for (const r of receiptsForOrg(orgId, from, to)) {
    const e = totals.get(r.wasteCode) || { movements: 0, tonnes: 0 }
    e.movements += 1
    e.tonnes += r.quantityTonnes
    totals.set(r.wasteCode, e)
  }
  return wasteCodes
    .filter((w) => totals.has(w.code))
    .map((w) => ({
      code: w.code,
      description: w.description,
      movements: totals.get(w.code).movements,
      tonnes: Math.round(totals.get(w.code).tonnes * 10) / 10
    }))
    .sort((a, b) => b.movements - a.movements)
}

// Search by org id, permit number, or name (case-insensitive contains).
function findOrganisations (query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return []
  return organisations.filter((o) =>
    o.id.toLowerCase().includes(q) ||
    o.permitNumber.toLowerCase().includes(q) ||
    o.name.toLowerCase().includes(q)
  )
}

function getOrganisation (id) {
  return orgById.get(id)
}

module.exports = {
  wasteCodes,
  organisations,
  receipts,
  wasteCodeDesc,
  registeredAsAt,
  receiptsForOrg,
  movementsForOrg,
  reportingOrgIds,
  metrics,
  listNotReporting,
  listReporting,
  wasteCodeBreakdown,
  orgWasteCodeSummary,
  findOrganisations,
  getOrganisation
}
