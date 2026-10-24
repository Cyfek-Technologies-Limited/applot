# applot

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_ARLneiTzI1GH2AhwefCJa1y65N3D)

## Getting Started

### Google sign-in

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
