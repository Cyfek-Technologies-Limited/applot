const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const cache = new Map()
function load(file) {
  const absolute = path.resolve(file)
  if (cache.has(absolute)) return cache.get(absolute)
  const exports = {}
  cache.set(absolute, exports)
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(source, { exports, process, Buffer, URL, Intl, AbortSignal, console, setTimeout, clearTimeout, require: name => {
    if (name === 'server-only') return {}
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
    if (name.startsWith('.')) return load(path.resolve(path.dirname(absolute), name) + '.ts')
    return require(name)
  } }, { filename: absolute })
  return exports
}

const { matchesLocation, countryCode } = load('lib/jobs/location.ts')
const { answerFor } = load('lib/jobs/form-answers.ts')
const { canonicalJobUrl } = load('lib/jobs/identity.ts')
const candidate = { location: 'Lagos, Nigeria', preferredLocations: [], remoteOnly: true }
const job = (location, remote = true) => ({ location, remote })

test('job URL de-duplication preserves real job identifiers', () => {
  assert.notEqual(canonicalJobUrl('https://example.com/careers?gh_jid=123'), canonicalJobUrl('https://example.com/careers?gh_jid=456'))
  assert.equal(canonicalJobUrl('https://jobs.lever.co/company/id/apply?utm_source=feed'), canonicalJobUrl('https://jobs.lever.co/company/id'))
})

test('remote eligibility follows residence and does not assume remote means worldwide', () => {
  assert.equal(countryCode('Lagos, Nigeria'), 'NG')
  assert.equal(matchesLocation(job('Remote - US only'), candidate), false)
  assert.equal(matchesLocation(job('Remote'), candidate), false)
  assert.equal(matchesLocation(job('Worldwide'), candidate), true)
  assert.equal(matchesLocation(job('Remote - Africa'), candidate), true)
  assert.equal(matchesLocation(job('Remote - Germany'), candidate), false)
  assert.equal(matchesLocation(job('Remote - Nigeria'), { ...candidate, preferredLocations: ['London'] }), true)
  assert.equal(matchesLocation({ ...job('Worldwide'), allowedCountries: ['US'] }, candidate), false)
  assert.equal(matchesLocation({ ...job('Worldwide'), timezoneRestricted: true }, candidate), false)
  assert.equal(matchesLocation(job('Worldwide - US only'), candidate), false)
  assert.equal(matchesLocation(job('Worldwide except Nigeria'), candidate), false)
  assert.equal(matchesLocation({ ...job('Worldwide'), description: 'Candidates must be based in the United States.' }, candidate), false)
  assert.equal(matchesLocation({ ...job('Worldwide'), allowedOffsets: [0, 1, 2] }, candidate), true)
  assert.equal(matchesLocation({ ...job('Worldwide'), allowedOffsets: [-8, -5] }, candidate), false)
})

test('on-site jobs must match requested cities, and empty locations do not match', () => {
  assert.equal(matchesLocation(job('Lagos, Nigeria', false), { ...candidate, remoteOnly: false }), true)
  assert.equal(matchesLocation(job('Abuja, Nigeria', false), { ...candidate, remoteOnly: false }), false)
  assert.equal(matchesLocation(job('London, UK', false), { ...candidate, remoteOnly: false, preferredLocations: ['London'] }), true)
  assert.equal(matchesLocation(job('London, Canada', false), { ...candidate, remoteOnly: false, preferredLocations: ['London, UK'] }), false)
  assert.equal(matchesLocation(job('Lagos, Nigeria', false), { ...candidate, remoteOnly: false, location: 'Ikeja, Lagos, Nigeria' }), true)
  assert.equal(matchesLocation(job('Worldwide'), { ...candidate, location: '' }), false)
})

test('source isolation and interleaving retain several providers when one feed fails', async () => {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync('lib/jobs/sources.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const extra = { externalId: 'ats-1', source: 'ATS fixture', title: 'Frontend Developer', company: 'Direct employer', location: 'Worldwide', remote: true, url: 'https://jobs.ashbyhq.com/test/job', tags: [], description: '', salary: '' }
  const fetch = async url => ({ ok: true, json: async () => {
    if (url.includes('remotive')) return { jobs: [1, 2, 3].map(id => ({ id, title: 'Frontend Developer', company_name: `Remotive fixture ${id}`, candidate_required_location: 'Worldwide', url: `https://remotive.com/job/${id}`, tags: [], description: '' })) }
    if (url.includes('jobicy')) return { jobs: [{ id: 1, jobTitle: 'Frontend Developer', companyName: 'Jobicy fixture', jobGeo: 'Worldwide', url: 'https://jobicy.com/job/1' }] }
    if (url.includes('remoteok')) return [{ id: '1', position: 'Frontend Developer', company: 'RemoteOK fixture', location: 'United States', url: 'https://remoteok.com/job/1' }]
    return { data: [{ title: 'Broken schema', tags: null }] }
  } })
  const dependencies = { 'server-only': {}, './identity': { canonicalJobUrl }, './location': { matchesLocation }, './additional-sources': { additionalSources: async () => [{ source: 'ATS fixture', jobs: [extra] }] } }
  vm.runInNewContext(source, { exports, fetch, URL, URLSearchParams, AbortSignal, console: { error: () => {} }, require: name => dependencies[name] })
  const jobs = await exports.searchJobs(['Frontend Developer'], candidate)
  assert.equal(jobs.length, 5)
  assert.deepEqual(Array.from(new Set(jobs.slice(0, 3).map(job => job.source))), ['Remotive', 'Jobicy', 'ATS fixture'])
  assert.equal(jobs.some(job => job.source === 'Remote OK'), false)
})

test('form answers use explicit facts and never infer legal or sensitive answers', () => {
  const facts = { fullName: 'Jane Doe', email: 'jane@example.com', location: 'Lagos, Nigeria' }
  assert.equal(answerFor('First name', facts, ''), 'Jane')
  assert.equal(answerFor('Email *', facts, ''), 'jane@example.com')
  assert.equal(answerFor('Do you require sponsorship?', facts, ''), undefined)
  assert.equal(answerFor('Gender', facts, ''), undefined)
  assert.equal(answerFor('What country are you based in?', facts, ''), 'Nigeria')
  assert.equal(answerFor('Do you require sponsorship?', facts, '', { 'Do you require sponsorship?': 'Yes' }), 'Yes')
})

test('CV attachments are encrypted, decrypt correctly, and detect tampering', () => {
  process.env.RESUME_ENCRYPTION_KEY = 'fixture-encryption-key-with-at-least-32-characters'
  const { encryptResume, decryptResume } = load('lib/resume-storage.ts')
  const original = Buffer.from('Test CV attachment')
  const encrypted = encryptResume(original)
  assert.notDeepEqual(Buffer.from(encrypted), original)
  assert.deepEqual(decryptResume(encrypted), original)
  encrypted[15] ^= 1
  assert.throws(() => decryptResume(encrypted))
})

test('only supported HTTPS ATS destinations can receive automatic applications', () => {
  const { supportedApplicationUrl } = load('lib/jobs/submit-application.ts')
  assert.equal(supportedApplicationUrl('https://jobs.lever.co/example/id'), true)
  assert.equal(supportedApplicationUrl('https://job-boards.greenhouse.io/example/jobs/123'), true)
  assert.equal(supportedApplicationUrl('https://jobs.ashbyhq.com/example/id'), true)
  assert.equal(supportedApplicationUrl('https://apply.workable.com/example/j/123/'), true)
  for (const url of ['http://jobs.lever.co/example/id', 'https://jobs.lever.co.evil.example/id', 'http://localhost:3000', 'https://jobs.lever.co:444/id']) assert.equal(supportedApplicationUrl(url), false)
})

test('listing handoff follows one supported apply link and rejects ambiguous or unsafe destinations', async () => {
  const { openApplicationForm, resolvableListingUrl } = load('lib/jobs/submit-application.ts')
  assert.equal(resolvableListingUrl('https://himalayas.app/companies/example/jobs/role'), true)
  assert.equal(resolvableListingUrl('https://himalayas.app.evil.example/jobs/role'), false)
  assert.equal(resolvableListingUrl('https://user:secret@himalayas.app/jobs/role'), false)
  for (const links of [
    [{ url: 'https://jobs.lever.co/example/job', text: 'Apply now' }],
    [{ url: 'https://evil.example/apply', text: 'Apply now' }],
    [{ url: 'https://jobs.lever.co/example/one', text: 'Apply' }, { url: 'https://jobs.lever.co/example/two', text: 'Apply' }],
    [],
  ]) {
    const visited = []
    let current
    const page = {
      goto: async url => { visited.push(url); current = url; return { ok: () => true } },
      url: () => current,
      locator: selector => selector === 'a[href]' ? { evaluateAll: async () => links } : { count: async () => 1 },
    }
    const result = await openApplicationForm(page, 'https://himalayas.app/companies/example/jobs/role')
    if (links.length === 1 && links[0].url.includes('lever.co')) {
      assert.equal(result, undefined)
      assert.equal(visited[1], 'https://jobs.lever.co/example/job/apply')
    } else {
      assert.equal(result.status, 'UNSUPPORTED')
      assert.equal(visited.length, 1)
    }
  }
})

test('agent confirms applied status and does not retry uncertain submissions', async () => {
  for (const status of ['SUBMITTED', 'UNKNOWN']) {
    const rows = []
    let calls = 0
    let leased = false
    const profile = { ...candidate, targetRoles: ['Frontend Developer'], skills: ['React'], dailyLimit: 10, fullName: 'Jane Doe', email: 'jane@example.com', resumeData: new Uint8Array([1]), summary: 'Web developer', yearsExperience: 3 }
    const db = {
      $queryRaw: async () => leased ? [] : (leased = true, [{ userId: 'test-user' }]),
      agentLease: { deleteMany: async () => { leased = false } },
      profile: { findUnique: async () => profile }, agentRun: { create: async () => ({}) },
      application: {
        count: async () => rows.filter(row => row.submissionAttemptedAt).length,
        findMany: async options => options.select ? rows : rows.filter(row => row.status === 'PREPARED' && ['NOT_ATTEMPTED', 'RETRY'].includes(row.submissionStatus)),
        createMany: async ({ data }) => { rows.push(...data.map((row, i) => ({ ...row, id: `id-${i}`, submissionStatus: 'NOT_ATTEMPTED', submissionAnswers: {} }))); return { count: data.length } },
        updateMany: async ({ where, data }) => {
          const eligible = rows.filter(row => (!where.id || row.id === where.id) && (typeof where.submissionStatus === 'string' ? row.submissionStatus === where.submissionStatus : where.submissionStatus?.in?.includes(row.submissionStatus)))
          eligible.forEach(row => Object.assign(row, data)); return { count: eligible.length }
        },
        update: async ({ where, data }) => { Object.assign(rows.find(row => row.id === where.id), data) },
      },
    }
    const exports = {}
    const dependencies = {
      'server-only': {}, '@/lib/db': { prisma: db },
      '@/lib/jobs/sources': { searchJobs: async () => ['one', 'two'].map(id => ({ externalId: `fixture-${id}`, source: 'Fixture', title: 'Frontend Developer', company: 'Test employer', location: 'Worldwide', remote: true, tags: ['React'], description: 'Frontend development', url: `https://jobs.lever.co/example/${id}`, salary: '' })) },
      '@/lib/jobs/location': { matchesLocation },
      '@/lib/jobs/identity': { canonicalJobUrl },
      '@/lib/jobs/submit-application': { supportedApplicationUrl: () => true, submitApplication: async () => { calls++; return { status, message: 'fixture' } } },
      ai: { generateText: async () => { throw new Error('fixture fallback') }, Output: { object: () => ({}) } },
    }
    const source = ts.transpileModule(fs.readFileSync('lib/agent.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    vm.runInNewContext(source, { exports, crypto: require('node:crypto'), Date, Set, console: { error: () => {} }, require: name => dependencies[name] ?? require(name) })
    await exports.runAgentForUser('test-user')
    assert.equal(rows.length, 1)
    assert.equal(rows[0].submissionStatus, status)
    assert.equal(rows[0].status, status === 'SUBMITTED' ? 'APPLIED' : 'PREPARED')
    assert.equal(!!rows[0].appliedAt, status === 'SUBMITTED')
    await exports.runAgentForUser('test-user')
    assert.equal(calls, 1)
    leased = true
    await assert.rejects(exports.runAgentForUser('test-user'), /already running/)
  }
})

test('browser attaches CV, submits once, requests missing answers, and preserves uncertain outcomes', { timeout: 60000, skip: process.env.SKIP_BROWSER_TESTS === '1' }, async () => {
  const { chromium } = require('playwright')
  const { fillAndSubmit, openApplicationForm } = load('lib/jobs/submit-application.ts')
  const { encryptResume } = load('lib/resume-storage.ts')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(2000)
    const profile = { fullName: 'Jane Doe', email: 'jane@example.com', phone: '', location: 'Lagos, Nigeria', resumeFileName: 'cv.txt', resumeMimeType: 'text/plain', resumeData: encryptResume(Buffer.from('Fixture CV')), linkedinUrl: '', portfolioUrl: '', summary: '', workAuthorization: '', noticePeriod: '', salaryExpectation: '' }
    const form = (extra = '', success = true) => `<form onsubmit="event.preventDefault(); window.sent=(window.sent||0)+1; ${success ? "this.outerHTML='<h2>Application submitted!</h2>'" : ''}"><label>Full name<input name="name" required></label><label>Email<input type="email" name="email" required></label><label>Resume<input type="file" required></label>${extra}<button type="submit">Submit application</button></form>`
    // Intercept both pages locally; no employer or job board receives requests.
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: route.request().url().includes('himalayas.app')
      ? '<a href="https://jobs.lever.co/fixture/job">Apply now</a>' : form() }))
    assert.equal(await openApplicationForm(page, 'https://himalayas.app/companies/fixture/jobs/role'), undefined)
    assert.equal(page.url(), 'https://jobs.lever.co/fixture/job/apply')
    assert.equal((await fillAndSubmit(page, profile, 'Cover letter', {})).status, 'SUBMITTED')
    await page.unroute('**/*')
    await page.evaluate(() => { window.sent = 0 })
    await page.setContent(form())
    const result = await fillAndSubmit(page, profile, 'Cover letter', {})
    assert.equal(result.status, 'SUBMITTED')
    assert.equal(await page.evaluate(() => window.sent), 1)

    await page.setContent(form('<label>Notice period<input name="notice" required></label>'))
    const missing = await fillAndSubmit(page, profile, '', {})
    assert.equal(missing.status, 'NEEDS_INPUT')
    assert.ok(missing.questions.includes('Notice period'))
    const answered = await fillAndSubmit(page, profile, '', { 'Notice period': '2 weeks' })
    assert.equal(answered.status, 'SUBMITTED')

    await page.setContent(`<div id="application"><label>Name<input required></label><label>Email<input type="email" required></label><label>Resume<input type="file" required></label><button onclick="document.querySelector('#application').outerHTML='<h2>Application submitted!</h2>'">Submit application</button></div>`)
    assert.equal((await fillAndSubmit(page, profile, '', {})).status, 'SUBMITTED')

    await page.setContent(form('<p>During this application process I agree to use only my own words.</p>'))
    assert.equal((await fillAndSubmit(page, profile, '', {})).status, 'HUMAN_REQUIRED')

    await page.setContent(form('', false))
    const uncertain = await fillAndSubmit(page, profile, '', {})
    assert.equal(uncertain.status, 'UNKNOWN')
  } finally { await browser.close() }
})
