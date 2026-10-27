# Nucarbon

Astro site with public project pages, Firebase Authentication, Firestore, and Netlify Functions. Public pages render from Firestore on demand; account data is served only after Firebase token verification.

## Local setup

```sh
npm install
npm run dev:netlify
```

Set `PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`, and `PUBLIC_FIREBASE_APP_ID` for the browser. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` for server functions. Enable Google sign-in in Firebase Authentication and authorize the local and deployed domains. Keep server credentials out of `PUBLIC_*` variables.

## Firestore

The application uses one set of root collections:

| Path | Purpose |
| --- | --- |
| `projects/{uuid}` | Project content, publication flag, price in cents, and Firestore coordinates and timestamps |
| `authors/{uuid}` | Community author names |
| `posts/{uuid}` | Community posts and reactions |
| `users/{firebaseUid}` | Saved calculator answers, footprint, and any verified impact metrics |
| `users/{firebaseUid}/orders/{uuid}` | Contribution selections and their status |

Only published projects appear in public responses. Project records must contain the fields validated by [`_schema.ts`](./netlify/functions/_schema.ts); the API does not fill missing content with generated copy. Keep unpublished projects private while authoring them. The restrictive [`firestore.rules`](./firestore.rules) deny direct browser access, so all data access goes through Netlify Functions.

Three illustrative project records are in root `projects`. Run `node --env-file=.env --env-file=.env.local --experimental-transform-types scripts/complete-projects.mjs` to preview any missing required fields, then add `--apply` to fill them without changing existing IDs, measurements, publication flags, or prices. The illustrative descriptions and images do not claim verified impacts or certification. Community content is read from the root `authors` and `posts` collections.

Community posts use root `authors` and `posts` documents. Supported projects are stored under `users/{uid}/supportedProjects/{projectId}` with an active status and are shown separately from verified impact and checkout orders.

## Calculator and contribution flow

Calculator answers are kept in browser storage for seven days and saved automatically for signed-in users. The server validates the answers and calculates the footprint. Signing out clears account-associated browser state.

Project prices are stored as integer cents per tonne. The server resolves the project price and saved footprint, validates the chosen quantity, and stores an order under the authenticated user. Registering interest does not collect money or record verified compensation. The checkout page is excluded from indexing.

## Checks

```sh
npm run build
npx astro check
node --experimental-transform-types --test tests/*.test.mjs
```
