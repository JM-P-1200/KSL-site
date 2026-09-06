# KSL

KSL is a dependency-free directory for discovering AI and no-code website builders.

## KSL Build Lab

KSL Build Lab is a guided learning workspace that helps ordinary users move from idea to launched website business:

`Discover -> Plan -> Build -> Launch -> Rank -> Market -> Monetize -> Operate -> Scale`

The first vertical slice is implemented with static routes and browser-local demo persistence so it works safely on Vercel without requiring authentication or a database. The future Supabase schema lives in `migrations/001_build_lab_schema.sql`.

### Build Lab routes

- Public landing page: `/build-lab`
- Start or edit demo project: `/build-lab/start`
- Learner dashboard: `/build-lab/dashboard`
- Guided stages: `/build-lab/stages/discover` through `/build-lab/stages/scale`
- Resource library: `/build-lab/resources`
- Demo project workspace: `/build-lab/projects/demo`

### Build Lab architecture

- Curriculum and resource seed content: `data/build-lab.json`
- Browser workspace UI: `build-lab/build-lab.js`
- Shared business rules: `build-lab/core.mjs`
- Future database migration: `migrations/001_build_lab_schema.sql`
- Tests for validation, progress, stage unlocking, demo isolation, and entitlements: `scripts/test-build-lab.mjs`

There is no framework migration. Build Lab reuses the existing static routing, Vercel clean URLs, typography, colors, buttons, panels, and responsive CSS.

### Demo mode and persistence

The MVP stores a single isolated demo project in `localStorage` under `ksl-build-lab-demo-project`. This avoids writing real user or business data before authentication and database ownership rules exist.

When Supabase is added, use the migration as the starting point for:

- profiles
- learning projects
- curriculum stages and tasks
- task and stage progress
- worksheet responses
- resources and categories
- milestones
- subscriptions and entitlements
- learner metrics

The migration includes UUID primary keys, timestamps, relationships, indexes, update triggers, and starter Row Level Security policies.

### Entitlements

Feature access is centralized in `build-lab/core.mjs` through `canAccessResource()`. Current tiers are:

- Free
- Builder
- Business
- Assisted
- Managed

The MVP shows premium prompts but does not implement payment processing.

### Analytics events

Build Lab emits development-safe browser events through `window.dispatchEvent()`:

- `build_lab_viewed`
- `build_lab_started`
- `project_created`
- `stage_started`
- `task_completed`
- `stage_completed`
- `resource_opened`
- `upgrade_clicked`
- `assistance_requested`

Connect these to a future analytics provider inside `emitAnalytics()` in `build-lab/build-lab.js`.

### Adding a stage

1. Add the stage entry to `data/build-lab.json`.
2. Add a matching HTML shell in `build-lab/stages/{stageSlug}.html`.
3. Add resources and reference their IDs from the stage.
4. Run `npm run check` and `npm test`.

### Adding a lesson or resource

Add a resource object to `data/build-lab.json` with:

- `id`
- `title`
- `stage`
- `type`
- `difficulty`
- `access`
- `description`
- `url`

Use the `access` field instead of hardcoding subscription checks in UI code.

## Local development

Requires Node.js 18 or newer.

```bash
npm run check
npm test
npm run serve
```

Open `http://127.0.0.1:4173`. The local server is required because directory, article, and Build Lab data are loaded from JSON.

## Content

- Directory entries: `data/projects.json`
- Field notes: `data/blogs.json`
- Build Lab curriculum and resources: `data/build-lab.json`
- Submission and newsletter forms: Vercel Function at `api/submit.js`

## Vercel deployment

Import the repository into Vercel. The included `vercel.json` supplies security headers, clean URLs, and caching; Vercel will serve the static pages and detect the API function automatically.

Add these environment variables in Project Settings -> Environment Variables:

- `RESEND_API_KEY` - API key from Resend
- `SUBMISSION_EMAIL` - inbox that receives submissions
- `SUBMISSION_FROM` - optional verified sender, such as `KSL <hello@yourdomain.com>`
- `SUPABASE_URL` - future Build Lab database URL
- `SUPABASE_ANON_KEY` - future browser-safe Supabase anon key

Redeploy after adding environment variables. Until they are configured, forms return a clear configuration message instead of discarding submissions.

Before connecting a custom domain, update the absolute URL in canonical metadata, `robots.txt`, and `sitemap.xml`.
