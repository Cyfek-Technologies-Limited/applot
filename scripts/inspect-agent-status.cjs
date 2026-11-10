// Read-only operational diagnostics. Never prints credentials or CV/profile data.
require('dotenv').config({ path: ['.env.development.local', '.env.local', '.env'], quiet: true })
const { Client } = require('pg')
const url = new URL(process.env.DATABASE_URL)
if (['prefer', 'require', 'verify-ca'].includes(url.searchParams.get('sslmode'))) url.searchParams.set('sslmode', 'verify-full')
const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 15000 })
;(async () => {
  console.log(JSON.stringify({ configuration: { browserServiceConfigured: !!process.env.APPLICATION_BROWSER_WS_URL, aiGatewayConfigured: !!process.env.AI_GATEWAY_API_KEY } }))
  await client.connect()
  console.log(JSON.stringify({ statuses: (await client.query('SELECT "submissionStatus", COUNT(*)::int AS count FROM application WHERE "archivedAt" IS NULL GROUP BY "submissionStatus"')).rows }))
  console.log(JSON.stringify({ recentOutcomes: (await client.query('SELECT source, "submissionStatus", "submissionMessage", "submissionAttemptedAt" FROM application WHERE "appliedBy" = \'AGENT\' ORDER BY "createdAt" DESC LIMIT 12')).rows }))
  console.log(JSON.stringify({ recentRuns: (await client.query('SELECT status, message, "createdAt" FROM agent_run ORDER BY "createdAt" DESC LIMIT 5')).rows }))
})().catch(error => { console.error(JSON.stringify({ error: error.code || error.name })); process.exitCode = 1 }).finally(() => client.end())
