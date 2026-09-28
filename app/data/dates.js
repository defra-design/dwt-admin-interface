//
// Shared date helpers for the prototype.
//
// Extracted from the original inline validation in the Service Metrics route so
// the Regulators period/month filters can reuse the same GOV.UK "Dates" pattern
// validation (https://design-system.service.gov.uk/patterns/dates/).
//

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// GOV.UK abbreviates months in tables (May stays as-is).
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// "27 March 2026" from numeric parts.
function formatDate (day, month, year) {
  return `${day} ${MONTHS[month - 1]} ${year}`
}

// "27 March 2026" from a Date object.
function formatDateObj (date) {
  return formatDate(date.getDate(), date.getMonth() + 1, date.getFullYear())
}

// "27 Mar 2026" from a Date object — compact form for tables.
function formatDateShortObj (date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
}

// 12-hour local time, following the GOV.UK style guide: 9:15am, 1pm, midday,
// midnight — not 09:15, 13:00 or 1730hrs.
// https://www.gov.uk/guidance/style-guide/a-to-z
function formatTime12h (date) {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  if (hours === 0 && minutes === 0) return 'midnight'
  if (hours === 12 && minutes === 0) return 'midday'
  const suffix = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 || 12
  if (minutes === 0) return `${hour12}${suffix}`
  return `${hour12}:${String(minutes).padStart(2, '0')}${suffix}`
}

// "22 September 2026 at 10:15am" — date then time, GOV.UK style guide.
function formatDateTimeObj (date) {
  return `${formatDateObj(date)} at ${formatTime12h(date)}`
}

// Validate three day/month/year strings as a real date.
// Returns { error: string|null, date: Date|null }.
function validateDateParts (day, month, year) {
  day = (day || '').trim()
  month = (month || '').trim()
  year = (year || '').trim()

  if (!day || !month || !year) {
    return { error: 'Enter a date including a day, month and year', date: null }
  }

  const dayNum = Number(day)
  const monthNum = Number(month)
  const yearNum = Number(year)

  if (
    !Number.isInteger(dayNum) || !Number.isInteger(monthNum) || !Number.isInteger(yearNum) ||
    monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || year.length !== 4
  ) {
    return { error: 'Enter a real date', date: null }
  }

  // Reject dates that do not exist, e.g. 31 February.
  const probe = new Date(yearNum, monthNum - 1, dayNum)
  if (
    probe.getFullYear() !== yearNum ||
    probe.getMonth() !== monthNum - 1 ||
    probe.getDate() !== dayNum
  ) {
    return { error: 'Enter a real date', date: null }
  }

  return { error: null, date: probe }
}

// Read + validate one govukDateInput (namePrefix `prefix`) from a request body.
// Returns { error, date, values:{day,month,year} }.
function parseDateInput (body, prefix) {
  const values = {
    day: (body[`${prefix}-day`] || '').trim(),
    month: (body[`${prefix}-month`] || '').trim(),
    year: (body[`${prefix}-year`] || '').trim()
  }
  const { error, date } = validateDateParts(values.day, values.month, values.year)
  return { error, date, values }
}

// Default period: the last 12 months ending today.
function defaultPeriod () {
  const to = new Date()
  const from = new Date(to.getFullYear() - 1, to.getMonth(), to.getDate())
  return {
    from,
    to,
    values: {
      from: { day: from.getDate(), month: from.getMonth() + 1, year: from.getFullYear() },
      to: { day: to.getDate(), month: to.getMonth() + 1, year: to.getFullYear() }
    }
  }
}

module.exports = {
  MONTHS,
  formatDate,
  formatDateObj,
  formatDateShortObj,
  formatTime12h,
  formatDateTimeObj,
  validateDateParts,
  parseDateInput,
  defaultPeriod
}
