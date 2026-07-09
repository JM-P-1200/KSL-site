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
- Submission and newsletter forms: Netlify Forms

## Deployment

The repository is configured for Netlify with security headers and static asset caching. Create a new site from this repository and deploy with no build command; the publish directory is `.`.

Before connecting a custom domain, add its absolute URL to canonical and social metadata and submit a domain-specific `sitemap.xml`.
