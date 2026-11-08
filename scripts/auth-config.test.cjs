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
test('invalid and credential-bearing auth URLs are rejected', () => {
  for (const value of ['https://not a hostname', 'ftp://example.com', 'https://user:password@example.com', 'https://example.com?token=private']) {
    assert.throws(() => config.normalizeAuthUrl(value, 'BETTER_AUTH_URL'), /BETTER_AUTH_URL must/)
  }
})
test('trusted origins normalize hostnames and remove paths', () => {
  const origins = config.resolveTrustedOrigins({ NODE_ENV: 'production', VERCEL_URL: 'preview.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'https://applot-eta.vercel.app/' })
  assert.deepEqual(Array.from(origins), ['https://preview.vercel.app', 'https://applot-eta.vercel.app'])
})
