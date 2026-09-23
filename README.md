# DevSphere Web Club — Final Local + Vercel Build

## Architecture
- React + Vite in `client/`
- Modular components, layouts, public pages and admin pages
- Express 5 local API in `server/index.js`
- Vercel Web Handler functions in `api/` (`.mjs` so the ESM handlers are unambiguous)
- No database: `server/data.js` is the canonical content model
- Local writes use the filesystem
- Vercel writes use the GitHub Contents API
- Vercel-uploaded assets are returned as persistent GitHub raw URLs

## Start locally
From the project root:

```bash
npm install
npm run dev
```

Open the **website** here:

```text
http://localhost:5173
```

The **backend API** is here:

```text
http://localhost:5000
```

The backend health endpoint is:

```text
http://localhost:5000/api/health
```

The content endpoint is:

```text
http://localhost:5000/api/content
```

If you accidentally open `http://localhost:5000/`, the backend redirects to the Vite website at `http://localhost:5173/` during development. This prevents the confusing `{ "message": "Route not found" }` response when the API server is mistaken for the frontend server.

The Vite dev server proxies `/api/*` and `/uploads/*` to Express.

## Production/Vercel
Set:
- `JWT_SECRET`
- `ADMIN_USER`
- `ADMIN_PASSWORD`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `GITHUB_TOKEN`

Optional locally:
- `CORS_ORIGIN=http://localhost:5173`

The root `package.json` builds the Vite app into `client/dist`. Vercel serves the Vite output and maps `/api/*` to the serverless functions in `api/`.

## Important
Do not put `index.html` inside `client/public/`. The Vite entry point is `client/index.html`.

Do not open the backend port as the website during local development. Use port `5173` for the UI and port `5000` for API testing.

## Verification
Run:

```bash
npm install
npm run build
```

Then deploy the repository to Vercel.
