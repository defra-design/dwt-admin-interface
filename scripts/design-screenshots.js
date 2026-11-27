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

const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const screens = require('../app/data/design-index')
const { DIRECTORY, fileName } = require('../app/data/design-screenshots')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const onlyNew = process.argv.includes('--new')

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
      // A desktop-sized window. Only the top of long pages is captured.
      execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
        `--user-data-dir=${profile}`, '--window-size=1280,900',
        `--screenshot=${png}`, BASE_URL + variant.href
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
