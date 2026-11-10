// Connectivity check only: no employer pages, profile data, or submissions.
require('dotenv').config({ path: ['.env.development.local', '.env.local', '.env'], quiet: true })
;(async () => {
  let browser
  const started = Date.now()
  try {
    const endpoint = process.env.APPLICATION_BROWSER_WS_URL
    console.log(JSON.stringify({ remote: !!endpoint, protocol: endpoint ? new URL(endpoint).protocol : 'local' }))
    const { chromium } = require('playwright')
    browser = endpoint ? await chromium.connectOverCDP(endpoint, { timeout: 15000 }) : await chromium.launch({ headless: true })
    const context = await browser.newContext({ serviceWorkers: 'block' })
    const page = await context.newPage()
    await page.setContent('<p>Applot browser connectivity check</p>')
    console.log(JSON.stringify({ connected: true, contextCreated: true, elapsedMs: Date.now() - started }))
    await context.close()
  } catch (error) {
    const message = String(error.message)
    console.log(JSON.stringify({ connected: false, elapsedMs: Date.now() - started, error: error.name,
      unauthorized: /401|403|unauthorized|authentication/i.test(message),
      invalidEndpoint: /invalid url|unexpected server response|not found|404|400|does not look like a DevTools/i.test(message),
      missingBrowser: /executable doesn't exist|cannot find module|browsers.json/i.test(message),
      timeout: /timeout/i.test(message), connectionRefused: /ECONNREFUSED/i.test(message),
      accessDenied: /EACCES|EPERM/i.test(message),
    }))
    process.exitCode = 1
  } finally { await browser?.close().catch(() => {}) }
})()
