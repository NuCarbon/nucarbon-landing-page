# Nucarbon

Nucarbon's public site, carbon footprint calculator, project pages and signed-in area (`/app`).

- **Astro 6** with SCSS. Marketing pages are prerendered; project pages and the sitemap render
  on demand from Firestore.
- **Firebase Authentication** (Google sign-in) in the browser, **Firebase Admin + Firestore** on
  the server.
- **Netlify** hosting: Astro SSR through `@astrojs/netlify`; the JSON API lives in Netlify
  Functions v2 under `/api/*`.
- **Google Apps Script** stores contact form submissions in a Google Sheet.

## Setup

Requires Node 22.7 or newer (Netlify builds with Node 24).

```sh
npm install
npm run dev:netlify   # http://localhost:8888, with /api/* functions
```

`npm run dev` starts Astro alone (port 4321) without the API functions.

### Environment variables

| Variable                                                                                                         | Where                                       | Used by                                 |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------- |
| `PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`, `PUBLIC_FIREBASE_APP_ID` | tracked `.env`                              | Browser Firebase SDK (inlined at build) |
| `PUBLIC_GOOGLE_SCRIPT_URL`                                                                                       | tracked `.env`                              | Contact form                            |
| `PUBLIC_FIREBASE_MEASUREMENT_ID`                                                                                 | tracked `.env`                              | Firebase Analytics (off while empty)    |
| `PUBLIC_FEATURE_PROJECTS_CTA`                                                                                    | tracked `.env`                              | Feature flag (`'true'` turns it on)     |
| `FIREBASE_PROJECT_ID`                                                                                            | tracked `.env` locally; Netlify UI deployed | Firebase Admin, seed project guard      |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`                                                                  | `.env.local` (ignored); Netlify UI deployed | Firebase Admin (server only)            |

`PUBLIC_*` values are not secret and end up in the browser bundle. They are inlined at build time,
so changing one in the Netlify UI needs a redeploy. Feature flags (`PUBLIC_FEATURE_*`, read in
`src/data/flags.ts`) default to off. Never put server credentials in a `PUBLIC_*` variable.
Deployed functions and SSR pages read `process.env` at runtime, so every server variable must also
be set in the Netlify UI; `.env` files are only read locally. In Firebase Authentication, enable
Google sign-in and authorize the local and deployed domains.

## Scripts

| Command                                    | Purpose                                                   |
| ------------------------------------------ | --------------------------------------------------------- |
| `npm run dev` / `npm run dev:netlify`      | Astro dev server / Netlify dev with functions             |
| `npm run build`                            | Production build into `dist/`                             |
| `npm run check`                            | `astro check` type checking                               |
| `npm test`                                 | Unit tests (`node --test`, TypeScript via type stripping) |
| `npm run format` / `npm run format:check`  | Prettier                                                  |
| `npm run seed -- --project <id> [--apply]` | Seed the launch content into Firestore (see below)        |

## Code map

| Path                 | Contents                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/pages`          | Routes: marketing, `/calculadora` (+ `/como-funciona`), `/projetos`, `/app`, `/entrar`, `/checkout`, `sitemap-projetos.xml` |
| `src/components`     | Astro components by area (`sections`, `calculator`, `projects`, `app`, `layout`, `ui`, …)                                   |
| `src/lib`            | Isomorphic code (browser, SSR and Node tests): formatting, calculator rules, contribution pricing, URL safety               |
| `src/server`         | Server-only code: HTTP helpers and auth, Firebase Admin, Firestore schema validation and repository, checkout               |
| `src/scripts`        | Browser-only code: auth, API client, calculator controller, checkout session storage                                        |
| `src/types/app.ts`   | Domain types and API contracts shared by server and browser                                                                 |
| `netlify/functions`  | API handlers only (`api-*.ts`); shared logic stays in `src/server`                                                          |
| `scripts/seed`       | Seed fixtures; `scripts/seed.mjs` is the CLI                                                                                |
| `google-apps-script` | Contact form backend, deployed manually                                                                                     |
| `tests`              | `node --test` suites                                                                                                        |

Files in `src/lib` and `src/server` are loaded directly by Node in tests and by the seed script:
value imports there use explicit `.ts` extensions and cannot use `astro:*` or `import.meta.env`.

## API

All endpoints require a Firebase ID token (`Authorization: Bearer <token>`); identity comes only
from the verified token. Responses are JSON with `cache-control: no-store`; errors are
`{ "error": string }`.

| Endpoint                 | Methods                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `/api/dashboard`         | `GET` footprint, verified metrics, supported and suggested projects                            |
| `/api/community`         | `GET` latest community posts                                                                   |
| `/api/calculator-result` | `GET` saved answers and footprint; `POST { answers }` saves a calculation                      |
| `/api/checkouts`         | `GET ?id=` reads an order; `POST` creates one; `POST ?id=` `{ action: 'confirm' }` confirms it |

The server recalculates footprints and contribution totals; client totals are never trusted.
Registering a contribution does not collect money or record verified compensation.

## Firestore

Browser access is denied by [`firestore.rules`](./firestore.rules); all reads and writes go
through the server with Firebase Admin. Documents are validated on write and on read by
[`src/server/schema.ts`](./src/server/schema.ts); list endpoints skip (and log) invalid records.

| Path                                           | Purpose                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `projects/{uuid}`                              | Project content, publication flag, price in cents, and Firestore coordinates and timestamps |
| `authors/{uuid}`                               | Community author names                                                                      |
| `posts/{uuid}`                                 | Community posts and reactions                                                               |
| `users/{firebaseUid}`                          | Saved calculator answers, footprint, and any verified impact metrics                        |
| `users/{firebaseUid}/supportedProjects/{uuid}` | Projects the user supports (`status: 'active'`, `projectId` equal to the document ID)       |
| `users/{firebaseUid}/orders/{uuid}`            | Contribution selections and their status; the client-generated key is the order ID          |

Only published projects appear on the site. Enum fields (`biome`, `status`, metric and reaction
types) and calculator answers are stored as numeric codes: never renumber or reuse one.

## Seeding

`scripts/seed/fixtures.mjs` holds the launch content: three projects, two community authors and
two posts. The seed creates missing documents and fills only absent fields of existing ones; it
never overwrites a value, validates every resulting document and checks that no other project
uses a fixture slug.

```sh
npm run seed -- --project <firebaseProjectId>          # dry run: prints the plan
npm run seed -- --project <firebaseProjectId> --apply  # applies it in one transaction
```

`--project` must equal `FIREBASE_PROJECT_ID`, so the target is always named explicitly.

## Contact form (Google Apps Script)

[`google-apps-script/Code.gs`](./google-apps-script/Code.gs) receives the form fields `nome`,
`email`, `assunto` and `mensagem`, validates them, and appends a row (date, name, e-mail, subject,
message) to the `Contatos` sheet. It replies `{ message, statusCode }`, which the form displays.
Deploy changes manually:

1. Open the Apps Script project at [script.google.com](https://script.google.com) and replace its
   `Code.gs` with this file. Keep `SUBJECTS` in sync with the `assunto` options in
   `src/components/sections/Contact.astro`.
2. **Deploy → Manage deployments → Edit → Version: New version** (execute as yourself, access:
   anyone). Editing the existing deployment keeps its URL.
3. If the URL changes, update `PUBLIC_GOOGLE_SCRIPT_URL` in `.env` and redeploy the site.

## Analytics

Funnel analytics use Firebase Analytics (GA4) through the `firebase` web SDK, behind the LGPD
consent banner (`src/components/layout/ConsentBanner.astro`, rendered by every layout).

- **Where it sends:** only on `nucarbon.com.br` and `www.nucarbon.com.br`, outside `astro dev`,
  and only when `PUBLIC_FIREBASE_MEASUREMENT_ID` is set (it is empty in `.env`; set it in the
  Netlify UI and redeploy). Everywhere else `track()` logs `[analytics] <event> <params>` with
  `console.debug` and drops the event.
- **Loading:** `src/scripts/analytics.ts` imports `firebase/analytics` dynamically when the page is
  idle; events tracked before that wait in a queue (max 50). Blocked or unsupported browsers make
  it a silent no-op.
- **Consent mode:** consent is set before `initializeAnalytics`, with everything denied until the
  visitor clicks Aceitar, which grants `analytics_storage` only. `ad_storage`, `ad_user_data` and
  `ad_personalization` always stay denied, and Google signals and ad personalization are off.
  `LOAD_BEFORE_CONSENT` in `src/lib/analytics.ts` selects advanced mode (`true`: cookieless pings
  before a choice) or basic mode (`false`: nothing loads until Aceitar); its comment explains the
  LGPD trade-off.
- **Stored choice:** `nucarbon:consent` in localStorage, `{ choice, version, updatedAt }`. It is
  asked again after 12 months or when `CONSENT_VERSION` changes. "Preferências de cookies" in the
  footer (any `[data-consent-open]` element) reopens the banner.
- **Privacy:** no calculator answers or user ids are sent, only aggregates. Shared result codes are
  collapsed out of `page_path`.

Event names and params are typed in `AnalyticsEvents` (`src/lib/analytics.ts`); call
`track(name, params)` from `src/scripts/analytics.ts`. Links to `/calculadora` are tracked by one
delegated click listener: the nearest `data-track-location` ancestor gives `location` (`header`,
`footer`, …, else `unknown`), and links inside `[data-shared-result]` count as
`shared_result_cta_click`.

| Event                        | Params                                                 | When                                                          |
| ---------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| `calculator_view`            | `entry` (`direct` \| `project`), `ref?`                | The calculator opens (`ref` from `?ref=`, sanitized)          |
| `calculator_start`           | `step_id`                                              | The visitor starts the first step                             |
| `calculator_step_complete`   | `step_id`, `step_index` (1-based)                      | A step is completed                                           |
| `calculator_back`            | `step_id`, `step_index`                                | Back from a step                                              |
| `calculator_complete`        | `total_tonnes` (2 decimals), `largest_category`/`none` | The result is shown                                           |
| `calculator_restart`         | none                                                   | The visitor starts over from the result                       |
| `calculator_result_restored` | `source` (`draft` \| `account`)                        | A saved result is shown instead of step 1                     |
| `share_open`                 | `surface` (`calculator_result`)                        | The share modal opens                                         |
| `share_click`                | `method`                                               | A share option is chosen                                      |
| `share_complete`             | `method`                                               | Observable completion only: native, Instagram, copy, download |
| `shared_result_view`         | `share_version`, `total_tonnes`, `largest_category`    | A shared result page (`/calculadora/resultado/<code>`) opens  |
| `shared_result_cta_click`    | `location`                                             | A calculator link inside a shared result                      |
| `calculator_cta_click`       | `location`, `page_path`                                | A calculator link on any other page                           |
| `login_prompt_shown`         | `context` (`calculator_result`)                        | The login modal opens after a result                          |

**Funnel** (GA4 Explore → Funnel exploration): `calculator_view` → `calculator_start` →
`calculator_step_complete` with `step_index` 1…6 → `calculator_complete` → `share_open` →
`share_click` / `share_complete`. **Viral loop:** `shared_result_view` →
`shared_result_cta_click` → `calculator_view` with `ref = shared_result`.

Register these in GA4 (Admin → Custom definitions) so the params show up in reports:

- Event-scoped custom dimensions: `step_id`, `step_index`, `method`, `location`,
  `largest_category`, `ref`, `entry`, `source`, `surface`, `context`, `share_version`,
  `page_path`.
- Custom metric (standard unit): `total_tonnes`.

## Before deploying

```sh
npm run format:check
npm run check
npm test
npm run build
npm run seed -- --project <productionProjectId>   # dry run against production, if content changed
```

After a deploy, confirm that `curl -sI https://nucarbon.com.br/projetos` returns the security
headers from `netlify.toml` and that `/api/dashboard` answers 401 without a token.

Analytics: with `PUBLIC_FIREBASE_MEASUREMENT_ID` set, check that the consent banner appears, that
events arrive in GA4 DebugView (with the Google Analytics Debugger extension) and that the
custom definitions above are registered.
