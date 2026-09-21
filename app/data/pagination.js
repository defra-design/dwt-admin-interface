//
// Pagination helper for version 2 case lists.
// 25 rows per page, matching MOJ pagination guidance for long tables.
// https://design-patterns.service.justice.gov.uk/components/pagination/
//

const PAGE_SIZE = 25

function hrefForPage (path, query, page) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query || {})) {
    if (key === 'page') continue
    if (value === undefined || value === null) continue
    const text = String(value).trim()
    if (!text) continue
    params.set(key, text)
  }
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return path + (qs ? `?${qs}` : '')
}

function pageItems (current, totalPages, href) {
  if (totalPages <= 1) return []

  const items = []
  const addPage = (n) => {
    items.push({ text: String(n), href: href(n), selected: n === current })
  }
  const addDots = () => {
    const last = items[items.length - 1]
    if (last && last.type !== 'dots') items.push({ type: 'dots' })
  }

  if (totalPages <= 7) {
    for (let n = 1; n <= totalPages; n++) addPage(n)
    return items
  }

  const rangeStart = Math.max(2, current - 1)
  const rangeEnd = Math.min(totalPages - 1, current + 1)

  addPage(1)
  if (rangeStart > 2) addDots()
  for (let n = rangeStart; n <= rangeEnd; n++) addPage(n)
  if (rangeEnd < totalPages - 1) addDots()
  addPage(totalPages)
  return items
}

function paginate (items, page, { path, query, itemName }) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  let current = parseInt(page, 10)
  if (!Number.isInteger(current) || current < 1) current = 1
  if (current > totalPages) current = totalPages

  const start = total === 0 ? 0 : (current - 1) * PAGE_SIZE
  const pageRows = items.slice(start, start + PAGE_SIZE)
  const from = total === 0 ? 0 : start + 1
  const to = start + pageRows.length
  const href = (p) => hrefForPage(path, query, p)

  const pagination = {
    items: pageItems(current, totalPages, href),
    results: {
      count: total,
      from,
      to,
      text: itemName
    }
  }
  if (current > 1) pagination.previous = { text: 'Previous', href: href(current - 1) }
  if (current < totalPages && total > 0) pagination.next = { text: 'Next', href: href(current + 1) }

  return { rows: pageRows, pagination, total }
}

module.exports = {
  PAGE_SIZE,
  paginate
}
