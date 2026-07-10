//
// Client-side behaviour for the Waste Tracking Service prototype.
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  initDownloadCsvButtons()
  initCopyFailedScenarios()
})

// ---------------------------------------------------------------------------
// Download a results table as a CSV file.
// ---------------------------------------------------------------------------

function flashStatus (button, message) {
  const status = button.parentNode.querySelector('.app-copy-status')
  if (status) {
    status.textContent = message
    window.setTimeout(() => { status.textContent = '' }, 4000)
  }
}

function tableToCsv (table) {
  const escape = (value) => {
    const v = value.replace(/—/g, '-') // em dash -> hyphen for spreadsheets
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
  }
  return Array.from(table.querySelectorAll('tr'))
    .map((row) =>
      Array.from(row.querySelectorAll('th, td'))
        .map((cell) => escape(cell.textContent.trim()))
        .join(',')
    )
    .join('\r\n')
}

function initDownloadCsvButtons () {
  document.querySelectorAll('[data-download-csv]').forEach((button) => {
    if (button.dataset.csvBound) return
    button.dataset.csvBound = 'true'
    button.addEventListener('click', () => {
      const table = document.querySelector(button.getAttribute('data-download-csv'))
      if (!table) return
      const filename = button.getAttribute('data-filename') || 'report.csv'
      const blob = new Blob([tableToCsv(table)], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      flashStatus(button, 'Downloaded')
    })
  })
}

// ---------------------------------------------------------------------------
// Copy failed PAT scenarios as newline-separated text (PAT Submission Viewer).
// ---------------------------------------------------------------------------

function copyText (text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => copyTextFallback(text))
  }
  return copyTextFallback(text)
}

// Fallback for browsers/contexts where the async Clipboard API is blocked —
// select the text in an off-screen textarea and use the older execCommand.
function copyTextFallback (text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function initCopyFailedScenarios () {
  document.querySelectorAll('[data-copy-failed-text]').forEach((button) => {
    if (button.dataset.copyBound) return
    button.dataset.copyBound = 'true'
    button.addEventListener('click', () => {
      const source = document.getElementById(button.getAttribute('data-copy-failed-text'))
      if (!source) return
      Promise.resolve(copyText(source.textContent)).then(() => flashStatus(button, 'Copied'))
    })
  })
}

