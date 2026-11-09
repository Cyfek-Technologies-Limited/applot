const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const config = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/auth-config.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: config, URL })

test('deployment hostname without a scheme becomes HTTPS', () => {
  assert.equal(config.resolveAuthBaseURL({ NODE_ENV: 'production', BETTER_AUTH_URL: 'applot-eta.vercel.app' }), 'https://applot-eta.vercel.app')
})
test('complete URLs keep one scheme and blank values fall back', () => {
  assert.equal(config.resolveAuthBaseURL({ BETTER_AUTH_URL: ' https://applot-eta.vercel.app/ ' }), 'https://applot-eta.vercel.app')
  assert.equal(config.resolveAuthBaseURL({ BETTER_AUTH_URL: ' ', VERCEL_PROJECT_PRODUCTION_URL: 'https://applot-eta.vercel.app' }), 'https://applot-eta.vercel.app')
  assert.equal(config.resolveAuthBaseURL({ VERCEL_URL: 'preview.vercel.app' }), 'https://preview.vercel.app')
})
test('localhost supports HTTP ports and dynamic development ports', () => {
  assert.equal(config.resolveAuthBaseURL({ BETTER_AUTH_URL: 'localhost:3001' }), 'http://localhost:3001')
  assert.equal(config.resolveAuthBaseURL({ NODE_ENV: 'development' }).allowedHosts[0], 'localhost:*')
})

test('development stays dynamic when a fixed localhost or deployment URL is configured', () => {
  for (const value of ['http://localhost:3000', 'https://applot-eta.vercel.app']) {
    const base = config.resolveAuthBaseURL({ NODE_ENV: 'development', BETTER_AUTH_URL: value })
    assert.ok(base.allowedHosts.includes('localhost:*'))
    assert.ok(base.allowedHosts.includes('127.0.0.1:*'))
  }
  const origins = config.resolveTrustedOrigins({ NODE_ENV: 'development' })
  assert.ok(origins.includes('http://localhost:*'))
  assert.ok(origins.includes('http://127.0.0.1:*'))
  assert.equal(config.resolveTrustedOrigins({ NODE_ENV: 'production' }).some(origin => origin.includes('localhost')), false)
})

test('Better Auth accepts local port 3002 but rejects unrelated origins', async () => {
  const { betterAuth } = await import('better-auth')
  const env = { NODE_ENV: 'development', BETTER_AUTH_URL: 'http://localhost:3000' }
  const auth = betterAuth({
    secret: 'test-only-auth-secret-at-least-32-characters',
    baseURL: config.resolveAuthBaseURL(env),
    trustedOrigins: config.resolveTrustedOrigins(env),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
  })
  const signIn = (origin) => auth.handler(new Request('http://localhost:3002/api/auth/sign-in/email', {
    method: 'POST', headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@example.com', password: 'fixture-password' }),
  }))
  const local = await signIn('http://localhost:3002')
  assert.equal(local.status, 401) // Normal credentials rejection, not an origin failure.
  assert.notEqual((await local.json()).code, 'INVALID_ORIGIN')
  const foreign = await signIn('https://unrelated.example')
  assert.equal(foreign.status, 403)
  assert.equal((await foreign.json()).code, 'INVALID_ORIGIN')
})
test('invalid and credential-bearing auth URLs are rejected', () => {
  for (const value of ['https://not a hostname', 'ftp://example.com', 'https://user:password@example.com', 'https://example.com?token=private']) {
    assert.throws(() => config.normalizeAuthUrl(value, 'BETTER_AUTH_URL'), /BETTER_AUTH_URL must/)
  }
})
test('trusted origins normalize hostnames and remove paths', () => {
  const origins = config.resolveTrustedOrigins({ NODE_ENV: 'production', VERCEL_URL: 'preview.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'https://applot-eta.vercel.app/' })
  assert.deepEqual(Array.from(origins), ['https://preview.vercel.app', 'https://applot-eta.vercel.app'])
})
