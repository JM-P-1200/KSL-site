# KSL

KSL is a dependency-free directory for discovering AI and no-code website builders.

## Local development

Requires Node.js 18 or newer.

```bash
npm run check
npm run serve
```

Open `http://127.0.0.1:4173`. The local server is required because directory and article data are loaded from JSON.

## Content

- Directory entries: `data/projects.json`
- Field notes: `data/blogs.json`
- Submission and newsletter forms: Vercel Function at `api/submit.js`

## Vercel deployment

Import the repository into Vercel. The included `vercel.json` supplies security headers, clean URLs, and caching; Vercel will serve the static pages and detect the API function automatically.

Add these environment variables in **Project Settings → Environment Variables**:

- `RESEND_API_KEY` — API key from Resend
- `SUBMISSION_EMAIL` — inbox that receives submissions
- `SUBMISSION_FROM` — optional verified sender, such as `KSL <hello@yourdomain.com>`

Redeploy after adding environment variables. Until they are configured, forms return a clear configuration message instead of discarding submissions.

Before connecting a custom domain, add its absolute URL to canonical and social metadata and submit a domain-specific `sitemap.xml`.
