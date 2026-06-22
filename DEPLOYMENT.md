# External deployment

This project uses server functions, so deploy it as a server app — not as a static-only site.

## Netlify

- Build command: `npm run build:netlify`
- Publish directory: `dist`
- Node version: `22`
- Add these backend environment variables from your local `.env` / hosting secrets:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `LOVABLE_API_KEY`

## Cloudflare Workers

- Build command: `npm run build:cloudflare`
- Node version: `22`
- Add the same backend environment variables/secrets listed above.

## Cloudflare Pages

- Build command: `npm run build:cloudflare-pages`
- Output directory: `dist`
- Node version: `22`
- Add the same backend environment variables/secrets listed above.