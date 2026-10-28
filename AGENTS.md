# AGENTS.md

Guidance for coding agents working on the Nucarbon site. Setup, environment variables, the API
list, the Firestore layout and the deploy checklist are in `README.md`; this file covers the
conventions and invariants that are not obvious from the code.

## Stack

- Astro 6 with `@astrojs/netlify`. Pages are static unless they export `prerender = false`
  (`/projetos`, `/projetos/[slug]`, `/app/projetos` redirect, `sitemap-projetos.xml`).
- SCSS in component `<style lang="scss">` blocks plus `src/styles/{global,app}.scss`.
- Firebase Auth in the browser, `firebase-admin`/Firestore on the server, Netlify Functions v2 for
  `/api/*`.
- Node ≥ 22.7. Tests are plain `node --test` suites run with `--experimental-transform-types`, so
  they import `.ts` sources directly.
- The brand is spelled **Nucarbon** (never "NuCarbon"). UI copy is Brazilian Portuguese; code,
  identifiers and comments are English.

## Commands

```sh
npm run dev            # astro dev
npm run dev:netlify    # netlify dev on :8888 (functions + SSR)
npm run format         # prettier --write .   (format:check in CI/pre-deploy)
npm run check          # astro check — must stay at 0 errors, 0 warnings, 0 hints
npm test               # node --test tests/*.test.mjs
npm run build
npm run seed -- --project <firebaseProjectId> [--apply]
```

Before handing work back, run `format:check`, `check`, `test` and `build`.

**Never run `npm run build` while a dev server is running**: it breaks the running server (CSS and
script 404s) until it is restarted.

## Layering

| Path                | Runs in                                  | Rules                                                                                                                                                         |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/**`        | Server, browser and Node tests           | Value imports use explicit `.ts` extensions. No `astro:*`, no `import.meta.env`, no imports from `server`, `scripts` or `components` (type imports included). |
| `src/server/**`     | Server only (SSR pages, functions, seed) | Reads config from `process.env`. Same `.ts` import rule as `lib`, because tests and the seed load it directly.                                                |
| `src/scripts/**`    | Browser only                             | Never imports from `src/server`.                                                                                                                              |
| `src/types/app.ts`  | Shared                                   | Domain types and API request/response contracts.                                                                                                              |
| `netlify/functions` | Netlify                                  | Only `api-*.ts` handlers. Shared code goes in `src/server`; a `_helper.ts` here would be deployed as a function.                                              |
| `src/data/site.ts`  | Shared                                   | Brand name, nav links (`mainNav`, `footerNav`, `solutionNav`), contact info.                                                                                  |

### Server building blocks (`src/server`)

- `http.ts`: every handler is `export default route({ GET, POST }, { auth, errorMessage })`.
  `route` answers 405 with `Allow` before checking auth, maps `HttpError` to its status and logs
  anything else with `console.error` before returning a generic 500. Use `json()` (adds
  `cache-control: no-store`) and `readJsonBody()` (415/413/400). `requireUser` returns 401 only for
  token errors; Firebase misconfiguration is a 500.
- `ids.ts` (UUID/slug checks), `schema.ts` (`validateDocument`, `isEnumValue`), `repository.ts`
  (`readProjects`, `readProjectBySlug`, `readProjectsByIds`, `readCommunityPosts`; bad records are
  skipped and logged, not 500s), `checkout.ts`, `calculator.ts`.

### Browser building blocks (`src/scripts`)

- `auth.ts`: `authReady`, `currentUser()`, `onUserChange`, `signInWithGoogle`,
  `signInAndSyncDraft`, `signOutUser`, `loginUrl(returnTo)`, `requireSignedIn`.
- `api.ts`: `authorizedFetch` (fresh ID token per call, one retry on 401), `getJson`, `postJson`,
  `ApiError { status }`. Do not hand-roll `fetch` with tokens.
- `dom.ts` (`setText`, `requireElement`, `cloneTemplate`), `user-display.ts` (`renderUser`,
  `renderGuest`), `checkout/storage.ts` (validated reads of the checkout keys).
- Dynamic lists render from a `<template>` holding the real Astro component, filled by a script
  (e.g. `ProjectCard.astro` + `scripts/projects/project-card.ts` `fillProjectCard`). Keep SSR and
  client-rendered cards on the same component.

### Shared logic (`src/lib`)

- `format.ts` is the only place numbers, money, dates and places are formatted (`formatTonnes`,
  `formatMoney(cents)`, `formatPercent`, `formatPlace`, `formatMetric` → `null` for unknown
  metrics, …). Tonnes show 0–2 decimals ("4,8").
- `calculator/`: `answers.ts` (`SUPPORTED_ANSWERS`, `DISTANCE_KM`, `isCalculatorAnswers`,
  `parseAnswers`, used by both client and server validation), `flow.ts`, `calculate.ts`,
  `coefficients.ts`, `categories.ts`, `tips.ts`.
- `checkout/amount.ts` (`calculateAmount`, `QUANTITY_TONNES`, `CONTRIBUTION_PERCENTAGES`),
  `urls.ts` (`safeReturnTo`, `loginPath`), `projects.ts` (`projectPath`, `projectCardView`,
  `setProjectsCacheHeaders`).

## Invariants — do not change

- Page URLs, including the `/app/projetos` → `/projetos` 301, and API paths.
- Landing anchors `#quem-somos #solucoes #creditos-carbono #time #faq #contato` and project-page
  anchors `#sobre #especies #localizacao #impactos #linha-do-tempo #metodologia #documentos`.
- `nucarbon:*` localStorage/sessionStorage keys.
- Firestore enum values and the numeric storage codes in `src/server/calculator.ts` (stored data
  depends on them; never renumber — a test checks they cover `SUPPORTED_ANSWERS`).
- Contact form field names `nome email assunto mensagem` (the Apps Script reads them).
- Emission factors in `lib/calculator/coefficients.ts` are product decisions, not refactor targets.

## Styling

All tokens live in `src/styles/global.scss`. **No raw hex/rgb/`white`, px radii, raw shadows or
raw-px media queries anywhere else.**

- Colors: `--color-primary` (#2e7d32), `-dark`, `-soft`, `-tint`, `--color-on-primary`; neutrals
  `--color-bg`, `--color-surface(-muted)`, `--color-border(-strong)`, `--color-text(-muted|-subtle)`,
  `--color-on-dark(-muted|-line)`; feedback `--color-success*`, `--color-warning*`,
  `--color-danger*`, `--color-overlay`.
- Fonts: `--font-sans` (body), `--font-display` (Kollektif, headings at 700 — the Bold file is
  registered, so no faux bold), `--font-mono`.
- Scales: `--spacing-2xs…2xl`, `--radius-xs…xl|pill|round`, `--shadow-sm|card|raised|header`,
  `--container-max`, `--container-gutter`, `--header-height`, `--z-sticky|header|modal`,
  `--transition-fast|base`.
- Utilities: `.container`, `.page` (clears the fixed header), `.section`, `.surface`, `.eyebrow`,
  `.visually-hidden`.
- Breakpoints (`_breakpoints.scss`): xs 480, sm 600, md 768, lg 900, xl 1120. In components:

  ```scss
  @use '../../styles/mixins' as mx; // relative path from the component
  @include mx.up(md) { … }          // also mx.down(), mx.between()
  ```

  `_mixins.scss` also has `visually-hidden`, `focus-ring`, `surface($radius)` and
  `reduced-motion`.

## Components

Reuse before adding. Primitives in `src/components/ui`:

- `Button`: variants `primary | outline | ghost | primary-inverse | outline-inverse`, sizes
  `sm | md | lg`, `block`. Renders `<a>` when `href` is set; otherwise `<button>` with
  `type="button"` by default — pass `type="submit"` explicitly for forms. Extra attributes pass
  through.
- `Logo` (`tone`, `size`, `href`; parents may set `--logo-color`), `UserAvatar`, `Badge`,
  `IconTile`, `Breadcrumbs` (also emits JSON-LD), `SectionHeader`, `PageHeader`, `FeatureList`
  (`marker: check | dot | arrow`), `Card`, `CTA`, `Accordion` (native `<details>`), `TeamMember`,
  `Skeleton`, `LoadingState`.
- `layout/SiteHead` owns all `<head>` metadata (canonical, OG/Twitter with absolute image URLs,
  `noindex`, favicon, font) for every layout. `Header`, `HeaderAccount`, `Footer` are shared by the
  site, solutions and calculator; do not fork copies.
- Only one `h1` per page (`LoginForm` takes `headingLevel` because the modal is on every page).
- Images go through `astro:assets` (`Image`/`getImage`); inline icons use `currentColor` and
  `aria-hidden="true"`.

### Calculator icons

`src/components/calculator/icons.ts` maps each `IconName` to a Material Symbols Outlined glyph
(FILL 0, wght 400, GRAD 0, **opsz 24**), stored as `{ symbol, path }` and drawn by
`CalculatorIcon.astro` in `viewBox="0 -960 960 960"` with `fill="currentColor"`. No runtime
dependency.

- To add or swap an icon, copy the `d` attribute from
  `https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web/<symbol>/materialsymbolsoutlined/<symbol>_24px.svg`.
  The `material-symbols` npm package ships opsz 48 paths, which do not match.
- `home` → `house` and `house` → `home` are crossed on purpose (detailed house for "Casa grande",
  plain for "Casa pequena").
- A test asserts every entry has a symbol name and contains path data only (no SVG markup).

## Seed data

`scripts/seed.mjs` with fixtures in `scripts/seed/fixtures.mjs` is the content that fills a fresh
production database — it is not demo code to delete. It dry-runs by default, refuses to run unless
`--project` equals `FIREBASE_PROJECT_ID`, validates every document with `validateDocument`, and in
one transaction creates missing docs and fills only absent fields (idempotent).

**Never run `--apply` without explicit approval from a maintainer.**

## Repository rules

- `.env` is intentionally tracked (it holds only public `PUBLIC_*` values and the project id).
  Server credentials belong in the ignored `.env.local`. Never print or commit secret values.
- `google-apps-script/Code.gs` is deployed by hand; changes to it need a manual redeploy.
- Commit only when asked; do not push to `main`.
- The filesystem is case-insensitive: avoid case-only renames.

## Known open items

- Live projects have `pricePerTonneCents: 100`, while fixtures use 7500 (R$ 75/t).
- `treeAbsorption = 0.15` t/tree/year looks high (published figures are ~0.02).
- Seed copy still contains placeholders ("Projeto ilustrativo", "Município não informado").
- Confirm after a deploy that `netlify.toml` security headers reach SSR responses.
- `netlify dev` shows Astro's default 404 page.
- The `AttentionCallout` "!" and the `/app` navigation icons are not yet Material Symbols.
