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
4. With those server values exported locally, run `npm run seed:firebase` once to create the read-only demo documents.
5. Deploy normally. Netlify reads `netlify.toml`, builds the Astro site, and exposes the authenticated endpoints at `/api/dashboard`, `/api/projects`, and `/api/community`.

The client configuration is public by design. Never commit the Firebase Admin service-account credentials or place them in `PUBLIC_*` variables.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Astro site only. |
| `npm run dev:netlify` | Run Astro and Netlify Functions locally. |
| `npm run build` | Build the production static site. |
| `npm run seed:firebase` | Seed Firestore demo data with server credentials. |
