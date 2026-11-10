const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file) {
  const exports = {}
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(source, { exports, Request, Response, URL, Error, AbortSignal, crypto: require('node:crypto'), console: { error: () => {} } })
  return exports
}
const { handleAgentRequest } = load('lib/agent-http.ts')
const { requestAgentRun } = load('lib/agent-request.ts')
const request = () => new Request('https://applot.example/api/agent/run', { method: 'POST', headers: { origin: 'https://applot.example' } })

test('a Playwright module-loading failure returns JSON rather than escaping to the page', async () => {
  const response = await handleAgentRequest(request(), async () => { throw new Error('Cannot find module playwright-core/browsers.json') })
  assert.equal(response.status, 500)
  const result = await response.json()
  assert.equal(result.ok, false)
  assert.equal(typeof result.reference, 'string')
  assert.equal(result.message.includes('browsers.json'), false)
})
test('an expired session returns 401 and never runs the agent', async () => {
  let ran = false
  const response = await handleAgentRequest(request(), async () => ({ getSession: async () => null, run: async () => { ran = true } }))
  assert.equal(response.status, 401)
  assert.equal(ran, false)
})
test('database failures during authentication return a recoverable JSON response', async () => {
  const response = await handleAgentRequest(request(), async () => ({ getSession: async () => { throw Object.assign(new Error('unavailable'), { code: 'P1001' }) }, run: async () => ({ message: '' }) }))
  assert.equal(response.status, 503)
})

test('browser setup and connectivity failures return useful errors without secrets', async () => {
  for (const code of ['APPLICATION_BROWSER_CONFIG', 'APPLICATION_BROWSER_UNAVAILABLE']) {
    const response = await handleAgentRequest(request(), async () => ({ getSession: async () => ({ user: { id: 'fixture-user' } }), run: async () => { throw Object.assign(new Error('secret-token'), { code }) } }))
    assert.equal(response.status, 503)
    const result = await response.json()
    assert.equal(result.ok, false)
    assert.match(result.message, /No applications were attempted/)
    assert.equal(result.message.includes('secret-token'), false)
  }
})
test('successful authenticated requests run only for the session user', async () => {
  let user
  const response = await handleAgentRequest(request(), async () => ({ getSession: async () => ({ user: { id: 'fixture-user' } }), run: async id => { user = id; return { message: 'Completed' } } }))
  assert.equal(response.status, 200)
  assert.equal(user, 'fixture-user')
})
test('cross-origin requests never load application dependencies', async () => {
  let loaded = false
  const response = await handleAgentRequest(new Request('https://applot.example/api/agent/run', { method: 'POST', headers: { origin: 'https://other.example' } }), async () => { loaded = true })
  assert.equal(response.status, 403)
  assert.equal(loaded, false)
})
test('timeouts, non-JSON gateways, and malformed responses stay in the client UI', async () => {
  for (const fetcher of [async () => { throw new Error('network failure') }, async () => new Response('Gateway timeout', { status: 504 }), async () => Response.json({ unexpected: true })]) {
    const result = await requestAgentRun(fetcher)
    assert.equal(result.ok, false)
    assert.match(result.message, /may still be finishing/)
  }
})
test('the client preserves useful server errors and completed run responses', async () => {
  const error = await requestAgentRun(async () => Response.json({ ok: false, message: 'Sign in again', reference: 'fixture' }, { status: 401 }))
  assert.equal(error.ok, false)
  assert.equal(error.reference, 'fixture')
  const result = await requestAgentRun(async () => Response.json({ ok: true, message: 'Completed' }))
  assert.equal(result.ok, true)
})
