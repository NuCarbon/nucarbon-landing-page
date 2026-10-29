// Browser Firebase app shared by auth and analytics. Throws while loading when the
// PUBLIC_FIREBASE_* variables are missing; callers load this module dynamically and
// treat that as "not configured".
import { getApps, initializeApp } from 'firebase/app';

const required = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

/** Google Analytics stream id; analytics stays off while it is empty. */
export const measurementId: string | undefined =
  import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID || undefined;

function requireConfig() {
  if (Object.values(required).some((value) => !value)) {
    throw new Error('A autenticação ainda não foi configurada.');
  }
  return { ...required, measurementId };
}

export const firebaseApp = getApps()[0] ?? initializeApp(requireConfig());
