# applot

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_ARLneiTzI1GH2AhwefCJa1y65N3D)

## Getting Started

Copy `.env.example` to `.env.local`, set `DATABASE_URL` to a running PostgreSQL
database, and set `BETTER_AUTH_SECRET` to a random secret of at least 32 characters.
Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
Keep credentials in `.env.local`, which is ignored by Git.

Set `AI_GATEWAY_API_KEY` in `.env.local` to enable AI extraction of uploaded CVs
using the same AI Gateway model as job matching. Uploads fill empty profile fields
for review; profile answers are saved only when the user clicks Save profile.
If AI extraction is unavailable, local extraction fills details recognized in
common CV layouts, including contact details, role titles, skills, and summary.
Set `PRIVACY_CONTACT_EMAIL` to publish the privacy request email on `/privacy`.
CV uploads support PDF, DOCX, ODT, RTF, TXT, and Markdown files up to 4MB.
Older Word `.doc` files must be saved as `.docx`; scanned PDFs need searchable text.

Initialize a new development database and generate the client:

```bash
npx prisma db push
npx prisma generate
```

Restart Next.js after changing environment variables. Local auth supports the
port selected by Next.js (including 3001). Leave `BETTER_AUTH_URL` empty locally,
or set it to the exact origin you use. Google OAuth redirect URIs must use that
same port. In production, set `BETTER_AUTH_URL` to the public HTTPS origin.

### Job discovery and automatic applications

The agent searches Remotive, Jobicy, Remote OK, Arbeitnow, Himalayas, and the
configured employer boards on Greenhouse and Ashby. Live checks verified the
default Canonical, GitLab, Linear, and Zapier feeds on 8 November 2026. Each feed
is interleaved before ranking, and duplicate company/title/location matches are
removed. A failed source does not stop other feeds.

Current residence determines remote country eligibility. On-site searches use
preferred cities, falling back to current location. A listing marked only
"Remote" is not assumed to accept candidates worldwide. Explicit country and
timezone restrictions are checked; uncertain eligibility is excluded. The
timezone check currently recognizes a limited set of countries with one
year-round UTC offset. Keep the current location accurate, including country.

For Nigerian domestic jobs, get a country-specific key from
[Jooble Nigeria](https://ng.jooble.org/api/about), then configure
`JOOBLE_API_KEY` and `JOOBLE_COUNTRY=ng`. Jooble keys for other countries do not
grant Nigerian coverage. Additional employer slugs can be configured with
`GREENHOUSE_BOARDS`, `ASHBY_BOARDS`, and `LEVER_BOARDS`. Lever has no default
boards because the tested companies returned 404. The Muse is optional via
`THE_MUSE_API_KEY`; its unauthenticated endpoint did not return JSON during live
checks. A reputable source does not guarantee every individual posting.

For an existing database, apply the additive update and regenerate:

```bash
node node_modules/prisma/build/index.js db execute --file prisma/updates/20261108_automatic_applications.sql
node node_modules/prisma/build/index.js generate
node node_modules/playwright/cli.js install chromium
```

Restart Next.js and upload the original CV again. Earlier uploads saved only
text, which cannot replace an employer's required attachment. New attachments
are encrypted using AES-256-GCM. Set a stable `RESUME_ENCRYPTION_KEY`, or the
application falls back to `BETTER_AUTH_SECRET`. Rotating the encryption secret
requires a new CV upload. Do not commit actual secrets.

**Find & apply automatically** prepares and submits eligible applications in
the same run using saved profile details, the original CV, and a tailored cover
letter. Standard Lever, Greenhouse, and Ashby application forms are supported;
custom layouts are not guaranteed. A visible employer confirmation is required
before marking an application applied. Missing screening answers can be entered
inside Applot and retried on the next run. Human verification and employers
requiring answers without AI assistance are flagged rather than bypassed.
Uncertain submissions are not retried automatically. Review employer emails
before manually updating an uncertain record. Opening a listing never counts
as a submission.

Daily limits count attempted application records on a UTC calendar day. Runs
have a 210-second submission budget, process at most ten queued applications,
and use a database lease to prevent simultaneous runs for one user. Enable
Autopilot in the profile for scheduled runs. Set `CRON_SECRET` on Vercel; the
existing cron runs at 08:00 UTC daily. Large installations need a dedicated job
worker/scheduler: the bounded cron batch reports deferred users and cannot
process an unlimited user base in one serverless invocation.

Local development uses installed Chromium. For serverless hosting, configure
`APPLICATION_BROWSER_WS_URL` with a trusted Chromium CDP browser service; local
browser binaries are not included in the deployment. That provider handles CVs
and profile information during applications. Keep its credentials server-side.

Validate without sending real applications:

```bash
npm run test:agent
node scripts/check-job-sources.cjs
```

The browser tests use local fixtures only. Live source/form checks are read-only;
successful real employer submissions have not been verified in development.

### Google sign-in setup

Create a **Web application** OAuth client in Google Cloud Console and set these
server-side environment variables in `.env` (and in your deployment):

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

Add `http://localhost:3000/api/auth/callback/google` to the OAuth client's
authorized redirect URIs for local development. For deployment, add
`<BETTER_AUTH_URL>/api/auth/callback/google` as an authorized redirect URI and
set `BETTER_AUTH_URL` to your app's public origin. The Google option appears on
the sign-up and sign-in pages once both credentials are configured.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
