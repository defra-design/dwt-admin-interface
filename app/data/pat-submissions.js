//
// Seed data for the PAT Submission Viewer (build brief: PAT Submission Viewer
// prototype).
//
// Each submission is what the (already-built) PAT endpoint would have
// returned for one call: a set of scenario results collected under one
// Submission ID, associated with a Client ID extracted from the provider's
// token. Mock data only — no API calls, no persistence.
//
// The first three `Waste Mix Ltd` submissions are the three example endpoint
// responses from the brief's Appendix A, taken in order (oldest -> newest) so
// the submission history is populated. A fourth, later `Waste Mix Ltd`
// submission is a clean run — all 14 scenarios pass, including C01/H02 (in
// reality expected-rejection scenarios with no WTID, but shown passing here
// to demonstrate a fully green submission). `SkipTip.com` has a single early
// submission to demonstrate a provider mid-testing.
//

const { formatDate, formatDateObj } = require('./dates')

// Software provider names, keyed by Client ID. No name is available from CDP
// yet (brief §5 — PoC stage only), so this is prototype-only decoration for
// the test data crib sheet; a Client ID with no entry here is shown on its
// own.
const providers = {
  '3ermaqkicip16u9t01f47chq43411': 'Waste Mix Ltd',
  '4hs1k0g4brpog7olmbhe7febv7': 'SkipTip.com'
}

// The 14 canonical PAT scenarios, in canonical order (brief §3 / Appendix B).
// Note there is deliberately no R06.
const CANONICAL_SCENARIOS = [
  'R01', 'R02', 'R03', 'R04', 'R05', 'R07',
  'C01', 'C02', 'B01', 'P01', 'H01', 'H02', 'H03', 'X01'
]

const submissions = [
  {
    submissionId: 'b3f1c2a40a1e4c2d9b3f000000000001',
    clientId: '3ermaqkicip16u9t01f47chq43411',
    submittedAt: '2026-06-10T09:15:00Z',
    results: [
      { scenarioId: 'R01', wasteTrackingId: '2623RVOGJ', status: 'Fail', message: 'No disposal or recovery code provided' },
      { scenarioId: 'R02', wasteTrackingId: '26IYS75K8', status: 'Pass', message: '' },
      { scenarioId: 'R03', wasteTrackingId: '2623RVOGJ', status: 'Pass', message: '' },
      { scenarioId: 'R04', wasteTrackingId: '266HTIGBL', status: 'Pass', message: '' },
      { scenarioId: 'R05', wasteTrackingId: '263UXZM8P', status: 'Fail', message: 'Expected at least one waste item to have multiple disposal or recovery codes for R05' },
      { scenarioId: 'R07', wasteTrackingId: '26IYS75K8', status: 'Fail', message: 'Expected at least one waste item to have at least 2 EWC codes for R07' },
      { scenarioId: 'C02', wasteTrackingId: '26NSIJ6QF', status: 'Pass', message: '' },
      { scenarioId: 'H01', wasteTrackingId: '26HA09SR2', status: 'Fail', message: 'Expected one or more waste items to have multiple hazardous components' },
      { scenarioId: 'H03', wasteTrackingId: '260KA7ZVS', status: 'Pass', message: '' }
    ]
  },
  {
    submissionId: 'b3f1c2a40a1e4c2d9b3f000000000002',
    clientId: '3ermaqkicip16u9t01f47chq43411',
    submittedAt: '2026-06-20T11:40:00Z',
    results: [
      { scenarioId: 'R01', wasteTrackingId: '2616B0L20', status: 'Fail', message: 'Hazardous waste items provided' },
      { scenarioId: 'R02', wasteTrackingId: '26Q1WAJXK', status: 'Pass', message: '' },
      { scenarioId: 'R03', wasteTrackingId: '2616B0L20', status: 'Pass', message: '' },
      { scenarioId: 'R07', wasteTrackingId: '26Q1WAJXK', status: 'Fail', message: 'Expected at least one waste item to have at least 2 EWC codes for R07' },
      { scenarioId: 'C02', wasteTrackingId: '26M84YQOA', status: 'Pass', message: '' },
      { scenarioId: 'B01', wasteTrackingId: '26SEYW0DA', status: 'Pass', message: '' },
      { scenarioId: 'P01', wasteTrackingId: '26PWQINRF', status: 'Fail', message: 'Expected one or more waste items to have multiple POPs components' },
      { scenarioId: 'X01', wasteTrackingId: '26Y7EXOMZ', status: 'Pass', message: '' }
    ]
  },
  {
    submissionId: 'b3f1c2a40a1e4c2d9b3f000000000003',
    clientId: '3ermaqkicip16u9t01f47chq43411',
    submittedAt: '2026-06-30T14:12:00Z',
    results: [
      { scenarioId: 'R01', wasteTrackingId: '26K5L57XF', status: 'Pass', message: '' },
      { scenarioId: 'R02', wasteTrackingId: '26EC7D5IP', status: 'Pass', message: '' },
      { scenarioId: 'R03', wasteTrackingId: '266HTI2JV', status: 'Pass', message: '' },
      { scenarioId: 'R04', wasteTrackingId: '26IYS72C6', status: 'Pass', message: '' },
      { scenarioId: 'R05', wasteTrackingId: '26VQPSC4O', status: 'Pass', message: '' },
      { scenarioId: 'R07', wasteTrackingId: '263UXZN1O', status: 'Pass', message: '' },
      { scenarioId: 'C02', wasteTrackingId: '26SEY4K75', status: 'Pass', message: '' },
      { scenarioId: 'B01', wasteTrackingId: '26UINJ6RM', status: 'Pass', message: '' },
      { scenarioId: 'P01', wasteTrackingId: '26Y7EM820', status: 'Pass', message: '' },
      { scenarioId: 'H01', wasteTrackingId: '2652GYZ7P', status: 'Pass', message: '' },
      { scenarioId: 'H03', wasteTrackingId: '26UINJ6RI', status: 'Pass', message: '' },
      { scenarioId: 'X01', wasteTrackingId: '26HA06SUS', status: 'Pass', message: '' }
    ]
  },
  {
    submissionId: 'b3f1c2a40a1e4c2d9b3f000000000004',
    clientId: '3ermaqkicip16u9t01f47chq43411',
    submittedAt: '2026-07-02T09:30:00Z',
    results: [
      { scenarioId: 'R01', wasteTrackingId: '26PT4WZQ1', status: 'Pass', message: '' },
      { scenarioId: 'R02', wasteTrackingId: '26PT4WZQ2', status: 'Pass', message: '' },
      { scenarioId: 'R03', wasteTrackingId: '26PT4WZQ3', status: 'Pass', message: '' },
      { scenarioId: 'R04', wasteTrackingId: '26PT4WZQ4', status: 'Pass', message: '' },
      { scenarioId: 'R05', wasteTrackingId: '26PT4WZQ5', status: 'Pass', message: '' },
      { scenarioId: 'R07', wasteTrackingId: '26PT4WZQ6', status: 'Pass', message: '' },
      { scenarioId: 'C01', wasteTrackingId: '26PT4WZQ7', status: 'Pass', message: '' },
      { scenarioId: 'C02', wasteTrackingId: '26PT4WZQ8', status: 'Pass', message: '' },
      { scenarioId: 'B01', wasteTrackingId: '26PT4WZQ9', status: 'Pass', message: '' },
      { scenarioId: 'P01', wasteTrackingId: '26PT4WZQA', status: 'Pass', message: '' },
      { scenarioId: 'H01', wasteTrackingId: '26PT4WZQB', status: 'Pass', message: '' },
      { scenarioId: 'H02', wasteTrackingId: '26PT4WZQC', status: 'Pass', message: '' },
      { scenarioId: 'H03', wasteTrackingId: '26PT4WZQD', status: 'Pass', message: '' },
      { scenarioId: 'X01', wasteTrackingId: '26PT4WZQE', status: 'Pass', message: '' }
    ]
  },
  {
    submissionId: 'c4a2d3b51b2f4d3e8a4c000000000004',
    clientId: '4hs1k0g4brpog7olmbhe7febv7',
    submittedAt: '2026-06-25T13:00:00Z',
    results: [
      { scenarioId: 'R01', wasteTrackingId: '27AB12CDE', status: 'Pass', message: '' },
      { scenarioId: 'R02', wasteTrackingId: '27FG34HIJ', status: 'Fail', message: 'Expected multiple waste items but only one was found' },
      { scenarioId: 'R03', wasteTrackingId: '27AB12CDE', status: 'Pass', message: '' }
    ]
  }
]

// --- Formatting helpers ------------------------------------------------

// 12-hour time from a UTC Date, following the GOV.UK style guide:
// 9:15am, 1pm, midday, midnight — not 09:15, 13:00 or 1730hrs.
// https://www.gov.uk/guidance/style-guide/a-to-z
function formatTime12hUtc (d) {
  const hours = d.getUTCHours()
  const minutes = d.getUTCMinutes()
  if (hours === 0 && minutes === 0) return 'midnight'
  if (hours === 12 && minutes === 0) return 'midday'
  const suffix = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 || 12
  if (minutes === 0) return `${hour12}${suffix}`
  return `${hour12}:${String(minutes).padStart(2, '0')}${suffix}`
}

// "10 June 2026 at 9:15am" — date then time, GOV.UK style guide.
function formatSubmittedAtGds (iso) {
  const d = new Date(iso)
  const dateLabel = formatDate(d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear())
  return `${dateLabel} at ${formatTime12hUtc(d)}`
}

// "30 June 2026, 14:12" from an ISO submittedAt string. Kept for v1.
function formatSubmittedAt (iso) {
  const d = new Date(iso)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${formatDateObj(d)}, ${hours}:${minutes}`
}

// --- Lookups -------------------------------------------------------------

function getSubmission (submissionId) {
  const q = String(submissionId || '').trim().toLowerCase()
  return submissions.find((s) => s.submissionId.toLowerCase() === q)
}

// Pass/failed/not submitted counts for an (already scenario-expanded) results
// array — see submissionResults().
function statusCounts (results) {
  return {
    passed: results.filter((r) => r.status === 'Pass').length,
    failed: results.filter((r) => r.status === 'Fail').length,
    notSubmitted: results.filter((r) => r.status === 'Not submitted').length
  }
}

// All 14 canonical scenarios for one submission, filling in "Not submitted"
// for any scenario this submission didn't include a result for (brief §5 —
// C01/H02 are expected-rejection scenarios and typically never appear).
function submissionResults (submission) {
  const byScenario = new Map(submission.results.map((r) => [r.scenarioId, r]))
  return CANONICAL_SCENARIOS.map((scenarioId) =>
    byScenario.get(scenarioId) || { scenarioId, wasteTrackingId: '', status: 'Not submitted', message: '' }
  )
}

// A crib sheet of every seed Submission ID with its Pass/Fail/Not submitted
// counts, for the "can't recall the IDs" helper text on every PAT Submission
// Viewer screen (prototype only). Counts are always derived from the seed
// data, never hardcoded.
function listTestData () {
  return {
    submissions: submissions.map((s) => ({
      submissionId: s.submissionId,
      providerName: providers[s.clientId] || s.clientId,
      submittedAtLabel: formatSubmittedAtGds(s.submittedAt),
      counts: statusCounts(submissionResults(s))
    }))
  }
}

module.exports = {
  submissions,
  formatSubmittedAt,
  formatSubmittedAtGds,
  getSubmission,
  statusCounts,
  submissionResults,
  listTestData
}
