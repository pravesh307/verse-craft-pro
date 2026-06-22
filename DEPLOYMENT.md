# External deployment

This project uses server functions, so deploy it as a server app — not as a static-only site.

Important: this app also depends on Lovable-managed backend and AI secrets. Those managed secrets are not exportable for external hosts, so the most reliable TikTok-friendly setup is to publish in Lovable and connect a custom domain.

## Netlify

- Build command: `npm run build:netlify`
- Publish directory: `dist`
- Node version: `22`
- Add any public build variables and third-party secrets you personally own in Netlify.
- Lovable-managed backend/AI secrets cannot be copied out; replace those integrations before relying on external hosting.

## Cloudflare Workers

- Build command: `npm run build:cloudflare`
- Node version: `22`
- Add any public build variables and third-party secrets you personally own in Cloudflare.
- Lovable-managed backend/AI secrets cannot be copied out; replace those integrations before relying on external hosting.

## Cloudflare Pages

- Build command: `npm run build:cloudflare-pages`
- Output directory: `dist`
- Node version: `22`
- Add any public build variables and third-party secrets you personally own in Cloudflare.
- Lovable-managed backend/AI secrets cannot be copied out; replace those integrations before relying on external hosting.