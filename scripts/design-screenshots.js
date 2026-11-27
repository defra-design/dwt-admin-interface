//
// Takes a screenshot of every page linked from the Design history
// (app/data/design-index.js), for the Screenshot column on /design/{screen}.
//
// Run with the prototype running (npm run dev), in a second terminal:
//   npm run screenshots            all screenshots
//   npm run screenshots -- --new   only variants that have no screenshot yet
//
// Mac only: uses Google Chrome (headless) and sips, which comes with macOS.
// Each page opens in a fresh browser, so it shows what someone sees on a
// first visit, with no session data.
//
// A variant with `screenshotJourney` is a page that only exists after a
// journey (such as the copy page after creating credentials). The script goes
// through the steps with its own session, then screenshots the page it ends on.
//   screenshotJourney: {
//     steps: [{ post: '/v5/client-credentials/test/create', form: { clientName: 'Example_Software' } }, { get: '/...' }],
//     expect: '/created'   the address of the last page must include this
//   }
//

const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const screens = require('../app/data/design-index')
const { DIRECTORY, fileName } = require('../app/data/design-screenshots')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const onlyNew = process.argv.includes('--new')

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const cookiesFrom = (response) => response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')

// Goes through the journey and returns the HTML of the page it ends on.
// Sessions are saved to files, so a request straight after another can miss
// the change: wait between requests, and try the journey again if it does not
// end on the expected page.
async function journeyPage (journey) {
  for (let attempt = 0; attempt < 5; attempt++) {
    let cookie = ''
    let url
    let response
    for (const step of journey.steps) {
      url = BASE_URL + (step.post || step.get)
      let options = step.post
        ? { method: 'POST', body: new URLSearchParams(step.form || {}), headers: { 'content-type': 'application/x-www-form-urlencoded' } }
        : { method: 'GET', headers: {} }
      for (let hop = 0; hop < 5; hop++) {
        options.headers.cookie = cookie
        response = await fetch(url, Object.assign({ redirect: 'manual' }, options))
        cookie = cookiesFrom(response) || cookie
        const location = response.headers.get('location')
        if (response.status < 300 || response.status >= 400 || !location) break
        url = new URL(location, url).href
        options = { method: 'GET', headers: {} }
        await wait(300)
      }
      await wait(300)
    }
    if (response.ok && url.includes(journey.expect)) {
      // The base address makes the page's styles and images load from the prototype.
      return (await response.text()).replace('<head>', `<head><base href="${BASE_URL}/">`)
    }
    await wait(1000)
  }
  throw new Error('The journey did not reach ' + journey.expect)
}

async function main () {
  fs.mkdirSync(DIRECTORY, { recursive: true })

  let taken = 0
  let failed = 0
  for (const screen of screens.filter((s) => s.id && Array.isArray(s.variants))) {
    for (const variant of screen.variants) {
      const jpg = path.join(DIRECTORY, fileName(screen.id, variant.label))
      if (onlyNew && fs.existsSync(jpg)) continue
      const png = path.join(os.tmpdir(), 'design-screenshot.png')
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'design-screenshot-'))
      try {
        let pageUrl = BASE_URL + variant.href
        if (variant.screenshotJourney) {
          const html = path.join(profile, 'page.html')
          fs.writeFileSync(html, await journeyPage(variant.screenshotJourney))
          pageUrl = 'file://' + html
        }
        // A desktop-sized window. Only the top of long pages is captured.
        execFileSync(CHROME, [
          '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
          `--user-data-dir=${profile}`, '--window-size=1280,900',
          `--screenshot=${png}`, pageUrl
        ], { stdio: 'ignore', timeout: 30000 })
        // Half size, as a JPEG, to keep the repository small.
        execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '70', '--resampleWidth', '640', png, '--out', jpg], { stdio: 'ignore' })
        taken++
        console.log(`Saved ${path.basename(jpg)}`)
      } catch (error) {
        failed++
        console.log(`Failed ${screen.id}: ${variant.label} (${variant.href})`)
      } finally {
        fs.rmSync(profile, { recursive: true, force: true })
      }
    }
  }
  console.log(`${taken} screenshots saved, ${failed} failed.`)
}

main()
