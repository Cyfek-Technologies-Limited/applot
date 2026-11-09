import 'server-only'
import { chromium, type Browser, type Page } from 'playwright'
import type { Profile } from '@/lib/generated/prisma/client'
import { decryptResume } from '@/lib/resume-storage'
import { answerFor } from './form-answers'

export type SubmissionResult = {
  status: 'SUBMITTED' | 'NEEDS_INPUT' | 'HUMAN_REQUIRED' | 'UNSUPPORTED' | 'FAILED' | 'UNKNOWN'
  message: string
  questions?: string[]
}

const hosts = ['jobs.lever.co', 'jobs.eu.lever.co', 'boards.greenhouse.io', 'job-boards.greenhouse.io', 'boards.eu.greenhouse.io', 'job-boards.eu.greenhouse.io', 'jobs.ashbyhq.com', 'apply.workable.com']
const listingHosts = ['himalayas.app', 'remotive.com', 'jobicy.com', 'remoteok.com', 'www.arbeitnow.com', 'arbeitnow.com']
function safeUrl(value: string): URL | undefined {
  try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password && !url.port) return url } catch { /* invalid URL */ }
}
export function supportedApplicationUrl(value: string): boolean {
  const url = safeUrl(value)
  return !!url && hosts.includes(url.hostname)
}
export function resolvableListingUrl(value: string): boolean {
  const url = safeUrl(value)
  return !!url && listingHosts.includes(url.hostname)
}

// Read public listing links before attaching any candidate information. Never
// treat an aggregator's "applied" tracker as an employer submission confirmation.
export async function openApplicationForm(page: Page, value: string): Promise<SubmissionResult | undefined> {
  const response = await page.goto(applicationUrl(value), { waitUntil: 'domcontentloaded', timeout: 25000 })
  if (!response?.ok()) return { status: 'FAILED', message: 'The job listing could not be opened. No application was sent.' }
  if (!supportedApplicationUrl(page.url())) {
    const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => ({ url: (node as HTMLAnchorElement).href, text: node.textContent ?? '' })))
    const applyLinks = links.filter(link => /apply|application/i.test(link.text) && supportedApplicationUrl(link.url))
    const destinations = [...new Set(applyLinks.map(link => applicationUrl(link.url)))]
    if (destinations.length !== 1) return { status: 'UNSUPPORTED', message: new URL(value).hostname === 'himalayas.app'
      ? 'Himalayas provided its listing page, not the employer application form. No public supported application link was found; nothing was submitted. This listing needs a direct employer link or a connected Himalayas account.'
      : 'No supported employer application form was found on this listing. Nothing was submitted.' }
    const employer = await page.goto(destinations[0], { waitUntil: 'domcontentloaded', timeout: 25000 })
    if (!employer?.ok() || !supportedApplicationUrl(page.url())) return { status: 'FAILED', message: 'The employer form could not be opened. No application was sent.' }
  }
  // Workable initially shows the description and opens the form from Apply.
  if (!await page.locator('input[type="email"], input[type="file"]').count()) {
    const apply = page.getByRole('button', { name: /^apply(?: for this job| now)?$/i }).first()
    if (await apply.count()) await apply.click()
  }
}

function applicationUrl(value: string): string {
  const url = new URL(value)
  if (/lever\.co$/.test(url.hostname) && !url.pathname.endsWith('/apply')) url.pathname = url.pathname.replace(/\/$/, '') + '/apply'
  return url.toString()
}

// Exported separately so the complete fill/submit/confirmation flow can be
// exercised against local fixture forms without sending real applications.
export async function fillAndSubmit(page: Page, profile: Profile, coverLetter: string, answers: Record<string, string>): Promise<SubmissionResult> {
  let form = page.locator('form').filter({ has: page.locator('input[type="email"], input[name="email"], input[type="file"]') }).first()
  if (!await form.count()) {
    // Ashby renders an application container rather than a native <form>.
    form = page.locator('div').filter({ has: page.locator('input[type="email"]') }).filter({ has: page.getByRole('button', { name: /^(?:submit(?: application)?|apply(?: now)?)$/i }) }).last()
  }
  if (!await form.count()) return { status: 'UNSUPPORTED', message: 'This employer form is not supported yet. No application was sent.' }
  const formText = await form.innerText()
  if (/use (?:only )?my own words|(?:use of AI|AI.generated (?:content|answers)).{0,100}disqualif/i.test(formText)) return { status: 'HUMAN_REQUIRED', message: 'This employer requires answers written without AI assistance. The agent has not submitted an application.' }
  const questions: string[] = []
  const controls = form.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select, [role="combobox"]')
  const count = await controls.count()
  if (count > 100) return { status: 'UNSUPPORTED', message: 'This form has too many fields to process automatically.' }
  for (let i = 0; i < count; i++) {
    const control = controls.nth(i)
    const info = await control.evaluate(element => {
      const input = element as HTMLInputElement
      const group = element.closest('fieldset')
      const label = input.labels?.[0]?.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('placeholder') || input.name || input.id
      return { label: label || 'Unlabeled field', type: input.type, required: input.required || element.getAttribute('aria-required') === 'true', role: element.getAttribute('role'), value: input.value, disabled: input.disabled, tag: element.tagName, group: group?.querySelector('legend')?.textContent?.trim() }
    })
    if (info.disabled) continue
    if (info.type === 'file') {
      if (/cover.?letter/i.test(info.label)) {
        await control.setInputFiles({ name: 'cover-letter.txt', mimeType: 'text/plain', buffer: Buffer.from(coverLetter) })
      } else if (/resume|cv/i.test(info.label) || await form.locator('input[type="file"]').count() === 1) {
        if (!profile.resumeData) questions.push('Upload your CV again to attach the original document.')
        else await control.setInputFiles({ name: profile.resumeFileName, mimeType: profile.resumeMimeType || 'application/octet-stream', buffer: decryptResume(profile.resumeData) })
      } else if (info.required) questions.push(info.label)
      continue
    }
    if (!await control.isVisible()) continue
    const label = info.group && /radio|checkbox/.test(info.type) ? info.group : info.label
    const answer = answerFor(label, profile, coverLetter, answers)
    if (info.type === 'checkbox') {
      if (answer && /^(yes|true|agree|accept)$/i.test(answer)) await control.check()
      else if (info.required && !await control.isChecked()) questions.push(label)
    } else if (info.type === 'radio') {
      if (answer && [info.value, info.label].some(value => value?.toLowerCase() === answer.toLowerCase())) await control.check()
      else if (info.required && !answer) questions.push(label)
    } else if (info.tag === 'SELECT') {
      if (answer) {
        try { await control.selectOption({ label: answer }) }
        catch { if (info.required) questions.push(label) }
      } else if (info.required && !info.value) questions.push(label)
    } else if (info.role === 'combobox') {
      if (answer) {
        try {
          await control.click()
          if (info.tag === 'INPUT') await control.fill(answer)
          const exact = new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
          await page.getByRole('option', { name: exact }).first().click()
        } catch {
          await page.keyboard.press('Escape')
          if (info.required) questions.push(label)
        }
      } else if (info.required) questions.push(label)
    } else if (answer) await control.fill(answer)
    else if (info.required && !info.value) questions.push(label)
  }
  // Native required checks also cover unresolved radio groups and pattern limits.
  const invalid = await form.locator(':invalid').filter({ visible: true }).evaluateAll(elements => elements.map(el => (el as HTMLInputElement).labels?.[0]?.textContent?.trim() || el.getAttribute('name') || 'Required field'))
  questions.push(...invalid)
  if (questions.length) return { status: 'NEEDS_INPUT', message: 'Add the missing answers in Applot so the agent can submit this application.', questions: [...new Set(questions)] }
  if (await page.locator('iframe[src*="recaptcha/api2/bframe"], iframe[src*="hcaptcha"]').filter({ visible: true }).count()) return { status: 'HUMAN_REQUIRED', message: 'The employer requires human verification. No application was sent.' }
  const submit = form.getByRole('button', { name: /^(?:submit(?: application)?|apply(?: now| for this job)?|send application)$/i }).first()
  if (!await submit.count()) return { status: 'UNSUPPORTED', message: 'This employer uses an unsupported submission flow. No application was sent.' }
  const confirmation = page.getByText(/^(?:application submitted|your application (?:has been (?:received|submitted)|was submitted)|thank you for (?:applying|your (?:interest|application))|thanks for applying)[!.]?$/i).first()
  if (await confirmation.isVisible()) return { status: 'UNKNOWN', message: 'A confirmation was present before submission. Check this application before retrying.' }
  // Once the click starts, a timeout is ambiguous and must never trigger an automatic retry.
  try {
    await submit.click()
    await confirmation.waitFor({ state: 'visible', timeout: 15000 })
    return { status: 'SUBMITTED', message: 'The employer displayed an application submission confirmation.' }
  } catch {
    return { status: 'UNKNOWN', message: 'Submission was attempted, but no confirmation was received. It will not be retried automatically to avoid duplicates.' }
  }
}

export async function submitApplication(url: string, profile: Profile, letter: string, answers: Record<string, string> = {}): Promise<SubmissionResult> {
  if (!supportedApplicationUrl(url) && !resolvableListingUrl(url)) return { status: 'UNSUPPORTED', message: 'This employer application website is not supported yet. No application was sent.' }
  if (!profile.resumeData) return { status: 'NEEDS_INPUT', message: 'Upload your CV again so the agent can attach the original file.', questions: ['Upload your original CV'] }
  let browser: Browser | undefined
  try {
    browser = process.env.APPLICATION_BROWSER_WS_URL
      ? await chromium.connectOverCDP(process.env.APPLICATION_BROWSER_WS_URL, { timeout: 15000 })
      : await chromium.launch({ headless: true })
    const context = await browser.newContext({ acceptDownloads: false, serviceWorkers: 'block' })
    const page = await context.newPage()
    page.setDefaultTimeout(5000)
    const timeout = setTimeout(() => void context.close().catch(() => undefined), 60000)
    try {
      // Only known ATS/service hosts receive requests; never navigate to arbitrary
      // aggregator redirects or send a candidate's CV to an unrecognized host.
      await context.route('**/*', route => {
        const requestUrl = new URL(route.request().url())
        const allowed = ['lever.co', 'greenhouse.io', 'ashbyhq.com', 'workable.com', 'workablecdn.com', 'google.com', 'gstatic.com', 'hcaptcha.com', 'cloudflare.com', 'cloudfront.net'].some(host => requestUrl.hostname === host || requestUrl.hostname.endsWith(`.${host}`)) || listingHosts.includes(requestUrl.hostname)
        // Listing pages are read-only: they must never receive a CV or a form POST.
        if (listingHosts.includes(requestUrl.hostname) && !['GET', 'HEAD'].includes(route.request().method())) return route.abort()
        return requestUrl.protocol === 'https:' && allowed ? route.continue() : route.abort()
      })
      const blocked = await openApplicationForm(page, url)
      if (blocked) return blocked
      await page.locator('input[type="email"], input[type="file"]').first().waitFor({ state: 'attached', timeout: 10000 })
      return await fillAndSubmit(page, profile, letter, answers)
    } finally {
      clearTimeout(timeout)
      await context.close().catch(() => undefined)
    }
  } catch {
    return { status: 'FAILED', message: 'The application browser could not prepare this form. Check the browser service configuration; no submission was confirmed.' }
  } finally { await browser?.close().catch(() => undefined) }
}
