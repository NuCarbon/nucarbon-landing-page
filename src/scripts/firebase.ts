// Browser Firebase app. Throws while loading when the PUBLIC_FIREBASE_* variables are
// missing; auth.ts loads this module dynamically and treats that as "signed out".
import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

function requireConfig() {
  if (Object.values(config).some((value) => !value)) {
    throw new Error('A autenticação ainda não foi configurada.');
  }
  return config;
}

const app = getApps()[0] ?? initializeApp(requireConfig());

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });
