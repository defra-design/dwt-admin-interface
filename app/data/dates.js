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

// "27 March 2026" from numeric parts.
function formatDate (day, month, year) {
  return `${day} ${MONTHS[month - 1]} ${year}`
}

// "27 March 2026" from a Date object.
function formatDateObj (date) {
  return formatDate(date.getDate(), date.getMonth() + 1, date.getFullYear())
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

// Read + validate a from/to period (namePrefixes `period-from` / `period-to`).
// Returns { from, to, values, errors:{from,to,range}, errorList }.
function parsePeriod (body) {
  const fromField = parseDateInput(body, 'period-from')
  const toField = parseDateInput(body, 'period-to')

  const errors = {}
  if (fromField.error) errors.from = fromField.error
  if (toField.error) errors.to = toField.error

  // Range check only when both dates are individually valid.
  if (!errors.from && !errors.to && fromField.date > toField.date) {
    errors.range = 'The “from” date must be the same as or before the “to” date'
  }

  const errorList = []
  if (errors.from) errorList.push({ text: `From date: ${errors.from}`, href: '#period-from-day' })
  if (errors.to) errorList.push({ text: `To date: ${errors.to}`, href: '#period-to-day' })
  if (errors.range) errorList.push({ text: errors.range, href: '#period-from-day' })

  return {
    from: fromField.date,
    to: toField.date,
    values: { from: fromField.values, to: toField.values },
    errors,
    errorList,
    hasErrors: errorList.length > 0
  }
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
  validateDateParts,
  parseDateInput,
  parsePeriod,
  defaultPeriod
}
