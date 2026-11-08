const { chromium } = require('playwright')
const feeds = [
  { name: 'Greenhouse Canonical', url: 'https://boards-api.greenhouse.io/v1/boards/canonical/jobs', select: data => data.jobs[0]?.absolute_url },
  { name: 'Ashby Linear', url: 'https://api.ashbyhq.com/posting-api/job-board/linear', select: data => data.jobs[0]?.applyUrl },
]
;(async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const feed of feeds) {
      try {
        const data = await (await fetch(feed.url)).json()
        const url = feed.select(data)
        const page = await browser.newPage()
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.locator('input[type="email"], input[type="file"]').first().waitFor({ timeout: 15000 })
        console.log(JSON.stringify({ source: feed.name, forms: await page.locator('form').count(), fields: await page.locator('input,textarea,select,[role="combobox"]').evaluateAll(nodes => nodes.slice(0, 40).map(el => ({ tag: el.tagName, name: el.name, type: el.type, label: el.labels?.[0]?.textContent?.trim(), required: el.required, ariaRequired: el.getAttribute('aria-required'), role: el.getAttribute('role') }))) }))
        await page.close()
      } catch (error) { console.log(JSON.stringify({ source: feed.name, error: error.message })) }
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error.message); process.exitCode = 1 })
