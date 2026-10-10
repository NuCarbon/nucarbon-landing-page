# Nucarbon landing page and member area

Astro public website plus a Firebase-authenticated member experience deployed on Netlify.

## Local development

```sh
npm install
cp .env.example .env.local
npm run dev:netlify
```

Set the public Firebase values in `.env.local`. Enable Google under **Firebase Authentication → Sign-in method** and add the local and production Netlify domains to the authorized domains list.

## Firebase and Netlify setup

1. Create a Firebase project, enable Google authentication, and create a Cloud Firestore database.
2. Deploy [`firestore.rules`](./firestore.rules) to deny direct browser access. All reads go through Netlify Functions.
3. In Netlify, set the `PUBLIC_FIREBASE_*` values for builds, and set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` as protected function environment variables.
4. With those server values exported locally, run `npm run seed:firebase` to create missing schema v2 demo documents. Use Node 22.7+ with support for `--experimental-transform-types`. Preview and validate without credentials or writes using `npm run seed:firebase -- --dry-run`.
5. Deploy normally. Netlify reads `netlify.toml`, builds the Astro site, and exposes the authenticated endpoints at `/api/dashboard`, `/api/projects`, and `/api/community`.

The client configuration is public by design. Never commit the Firebase Admin service-account credentials or place them in `PUBLIC_*` variables.

## Firestore schema v2

The API reads `datasets/demo-v2`. Seed this dataset before deploying the updated API and client together. The seed preserves existing documents and leaves the old `demo/*` documents untouched. It creates demonstration fixtures, **not a migration of existing production records**. Legacy display strings do not contain precise event dates or geographic coordinates; a production migration needs authoritative timestamps and project coordinates rather than inferred values.

| Document path | Stored fields |
| --- | --- |
| `datasets/demo-v2` | `schemaVersion: 2`, footprint with numeric `annualEmissionsTonnes` and `updatedAt: Timestamp`, metrics with numeric type and value |
| `datasets/demo-v2/projects/{uuid}` | Name, numeric biome/status codes, `areaHectares`, `restorationProgress` (0–1), `location: GeoPoint`, `createdAt: Timestamp` |
| `datasets/demo-v2/authors/{uuid}` | Display name |
| `datasets/demo-v2/posts/{uuid}` | `authorId` UUID reference, body text, `createdAt: Timestamp`, numeric `commentCount`, reaction type/count pairs |

New entity IDs should use `crypto.randomUUID()`. Demo IDs are fixed UUIDs for repeatable seeding. Firebase Authentication UIDs are a separate identity and should not be replaced with UUIDs. The current dataset remains shared demonstration data, not per-user impact records.

Persisted enum codes are defined in `src/types/app.ts`; never renumber them. Names and bodies remain text. Labels, icons, units, dates, percentages, and reaction strings are formatted in `src/scripts/app/format.ts`. The API explicitly serializes native `GeoPoint` values to `{ latitude, longitude }` and native `Timestamp` values to Unix milliseconds; it does not expose Firestore internals.

Measurements use fixed canonical units: annual footprint and carbon offsets in tonnes CO₂e, area in hectares, counts as nonnegative integers, and progress as a 0–1 ratio. The schema validator runs before seeding and when serving data. Sample coordinates and dates in `scripts/demo-data.mjs` are illustrative and must be replaced with verified values for real projects.

Run schema, formatting, and calculator checks with `node --experimental-transform-types --test tests/*.test.mjs`.

## Saved calculator results

Completing the calculator automatically saves for signed-in users through `POST /api/calculator-result`. Guests can sign in with Google from the result screen and save the same answers. Save failures display a retry action without discarding the result.

The endpoint validates all answers and recomputes the result on the server. The owner is always the verified Firebase token's UID; the request accepts no user ID or precomputed totals. A single merge into `users/{firebaseUid}` atomically updates `footprint` (numeric annual emissions and native timestamp) and `calculator` (numeric answer codes, weekly distance in km, category emissions in tonnes, tree equivalence, schema/calculation versions, and timestamp). Existing profile fields are preserved. Each save replaces the latest calculation; it does not append history. Increment `calculationVersion` in `netlify/functions/_calculator.ts` when changing the calculation coefficients or method.

The dashboard reads this user's saved footprint and shows an empty state until their first save. Demo projects and impact metrics remain separate. Deploy `firestore.rules` to deny direct browser access and deploy the new function with the client. No demo seed is required to save user calculations.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Astro site only. |
| `npm run dev:netlify` | Run Astro and Netlify Functions locally. |
| `npm run build` | Build the production static site. |
| `npm run seed:firebase` | Seed Firestore demo data with server credentials. |
