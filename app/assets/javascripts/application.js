//
// Client-side behaviour for the Waste Tracking Service prototype.
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//

window.GOVUKPrototypeKit.documentReady(() => {
  initCopyFailedScenarios()
  initCopyButtons()
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

// ---------------------------------------------------------------------------
// Generic "copy to clipboard" button (Software providers: API key reveal
// page, version 3). Left separate from initCopyFailedScenarios above rather
// than reusing its attribute name, so v1/v2's "copy failed scenarios" button
// is untouched.
// ---------------------------------------------------------------------------

function initCopyButtons () {
  document.querySelectorAll('[data-copy-target]').forEach((button) => {
    if (button.dataset.copyBound) return
    button.dataset.copyBound = 'true'
    // A copy button can sit inside a wrapper that is `hidden` in the HTML, so
    // it only appears when JavaScript is available to make it work.
    const hiddenWrapper = button.closest('[hidden]')
    if (hiddenWrapper) hiddenWrapper.hidden = false
    button.addEventListener('click', () => {
      const source = document.getElementById(button.getAttribute('data-copy-target'))
      if (!source) return
      // A button with `data-copy-message` (Credentials created page) keeps its
      // message on screen and names what was copied. Without it, the older
      // "Copied" message that disappears after a few seconds is used, so
      // earlier versions behave as before.
      const message = button.getAttribute('data-copy-message')
      Promise.resolve(copyText(source.textContent)).then(() => {
        if (button.getAttribute('data-copy-done-label')) {
          showCopiedLabel(button, message)
        } else if (message) {
          showCopyStatus(button, message)
        } else {
          flashStatus(button, 'Copied')
        }
      })
    })
  })
}

// Copy feedback on the button itself (Credentials created page, version 6). The
// label changes to the `data-copy-done-label` text for four seconds, then goes
// back, as in the MoJ and GOV.UK Design System copy buttons. The message goes in
// a visually hidden live region, so nothing appears beside the button and the
// buttons next to it do not move.
function showCopiedLabel (button, message) {
  if (!button.dataset.copyOriginalHtml) button.dataset.copyOriginalHtml = button.innerHTML
  window.clearTimeout(button.copyResetTimer)
  button.textContent = button.getAttribute('data-copy-done-label')
  const status = button.parentNode.querySelector('.app-copy-status')
  if (status) {
    status.textContent = ''
    window.setTimeout(() => { status.textContent = message || button.getAttribute('data-copy-done-label') }, 100)
  }
  button.copyResetTimer = window.setTimeout(() => {
    button.innerHTML = button.dataset.copyOriginalHtml
    if (status) status.textContent = ''
  }, 4000)
}

// Persistent copy feedback. Only one value is on the clipboard at a time, so
// copying clears the message next to any other copy button. The message is
// cleared and then set again, after a short pause, so a screen reader announces
// it even when the same button is pressed twice.
function showCopyStatus (button, message) {
  document.querySelectorAll('[data-copy-message]').forEach((other) => {
    const otherStatus = other.parentNode.querySelector('.app-copy-status')
    if (otherStatus) otherStatus.textContent = ''
  })
  const status = button.parentNode.querySelector('.app-copy-status')
  if (status) window.setTimeout(() => { status.textContent = message }, 100)
}

