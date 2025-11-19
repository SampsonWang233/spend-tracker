import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC_o4t0pxzepBj5RUhuUUGw7rtQ2gHEiuc',
  authDomain: 'spend-9beb0.firebaseapp.com',
  projectId: 'spend-9beb0',
  storageBucket: 'spend-9beb0.firebasestorage.app',
  messagingSenderId: '48858522985',
  appId: '1:48858522985:web:53c0ee99f227d8a94a09f8',
  measurementId: 'G-MCQTGMBYHT'
};

let db = null;
let initialized = false;

const hasValidCredentials = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'YOUR_PROJECT_ID'
);

export async function initFirebase() {
  if (!hasValidCredentials) {
    throw new Error('Firebase credentials are not configured.');
  }

  if (initialized) {
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  } else {
    firebase.app();
  }

  db = firebase.firestore();
  initialized = true;
}

export function getDb() {
  return db;
}

export function isInitialized() {
  return initialized;
}

export function canUseFirebase() {
  return hasValidCredentials;
}

export { firebase };

