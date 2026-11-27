//
// Where the Design history screenshots live, and their file names. Shared by
// routes.js (to show them) and scripts/design-screenshots.js (to take them).
// One screenshot for each variant in design-index.js: {screen id}--{label}.jpg
//

const path = require('path')
const fs = require('fs')

const DIRECTORY = path.join(__dirname, '..', 'assets', 'images', 'design-history')
const URL_PATH = '/public/images/design-history'

function fileName (screenId, label) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${screenId}--${slug}.jpg`
}

// The address of the screenshot, or null if it has not been taken yet.
function screenshotUrl (screenId, label) {
  const name = fileName(screenId, label)
  return fs.existsSync(path.join(DIRECTORY, name)) ? `${URL_PATH}/${name}` : null
}

module.exports = { DIRECTORY, fileName, screenshotUrl }
