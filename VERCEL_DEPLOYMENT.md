# Deploying Luma to Vercel

The project now has a Vercel-compatible frontend build and a serverless Express handler at `api/index.ts`. The existing WebDev development and production commands remain available.

## Vercel project settings

Import the repository into Vercel with these settings:

- **Framework preset:** Vite
- **Build command:** `pnpm build:vercel`
- **Output directory:** `dist/public`
- **Install command:** `pnpm install --frozen-lockfile`
- **Node.js version:** 22.x

`vercel.json` already contains these settings and routes the single-page application fallback while leaving `/api/*` available to the serverless handler.

## Environment variables

Configure these variables in Vercel for **Production, Preview, and Development** as appropriate:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string reachable from Vercel |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | Manus OAuth application ID |
| `VITE_OAUTH_PORTAL_URL` | Browser OAuth portal URL used by the frontend |
| `OAUTH_SERVER_URL` | OAuth backend base URL |
| `OWNER_OPEN_ID` | Project owner identifier |
| `OWNER_NAME` | Project owner display name |
| `BUILT_IN_FORGE_API_URL` | Manus built-in API base URL, if used by fallback metadata/search features |
| `BUILT_IN_FORGE_API_KEY` | Server-side Manus API credential |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend Manus API URL, if used by the client |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend Manus API credential, if used by the client |
| `RAWG_API_KEY` | RAWG game metadata API key |
| `TMDB_API_KEY` | TMDB API key fallback |
| `TMDB_READ_ACCESS_TOKEN` | TMDB bearer token used by server-side movie/series requests |

Do not commit values for these variables to Git. The RAWG and TMDB credentials must be entered directly in the Vercel project settings.

## OAuth callback

After Vercel gives the project a URL, register this callback with the OAuth provider:

```text
https://YOUR-VERCEL-DOMAIN.vercel.app/api/oauth/callback
```

The deployed app must also use the correct production value for `VITE_OAUTH_PORTAL_URL`, and the OAuth provider must allow the deployed origin.

## Database and cookies

The database must be publicly reachable from Vercel or through an approved network path. Use TLS for the database connection where supported. Production cookies are secure and cross-site compatible; use the final HTTPS domain when testing login.

## Local verification

Run:

```bash
pnpm check
pnpm test
pnpm build:vercel
```

The full WebDev build remains available through `pnpm build`.
