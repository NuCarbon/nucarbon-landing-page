// Browser Firebase auth. Throws while loading when the PUBLIC_FIREBASE_* variables are
// missing; auth.ts loads this module dynamically and treats that as "signed out".
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { firebaseApp } from './firebase-app';

export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });
