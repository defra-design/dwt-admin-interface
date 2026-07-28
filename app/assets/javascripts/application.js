//
// Client-side behaviour for the Waste Tracking Service prototype.
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  initCopyFailedScenarios()
})

function flashStatus (button, message) {
  const status = button.parentNode.querySelector('.app-copy-status')
  if (status) {
    status.textContent = message
    window.setTimeout(() => { status.textContent = '' }, 4000)
  }
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

