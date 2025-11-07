// Firebase Configuration
// Replace these values with your Firebase project credentials
// Get them from: https://console.firebase.google.com/ → Project Settings → General → Your apps

const firebaseConfig = {
  apiKey: "AIzaSyC_o4t0pxzepBj5RUhuUUGw7rtQ2gHEiuc",
  authDomain: "spend-9beb0.firebaseapp.com",
  projectId: "spend-9beb0",
  storageBucket: "spend-9beb0.firebasestorage.app",
  messagingSenderId: "48858522985",
  appId: "1:48858522985:web:53c0ee99f227d8a94a09f8",
  measurementId: "G-MCQTGMBYHT"
};

// Initialize Firebase (will be done after SDK loads)
let db = null;
let initialized = false;

function initFirebase() {
  if (initialized) return Promise.resolve();
  
  return new Promise((resolve, reject) => {
    // Check if config is still using placeholder values
    if (firebaseConfig.apiKey === 'YOUR_API_KEY' || 
        firebaseConfig.projectId === 'YOUR_PROJECT_ID') {
      reject(new Error('Firebase not configured. Please update firebase-config.js with your credentials.'));
      return;
    }

    if (typeof firebase === 'undefined') {
      reject(new Error('Firebase SDK not loaded'));
      return;
    }

    try {
      // Check if Firebase is already initialized
      let app;
      try {
        app = firebase.app();
      } catch (e) {
        // Firebase not initialized, initialize it
        app = firebase.initializeApp(firebaseConfig);
      }
      
      db = firebase.firestore();
      initialized = true;
      console.log('Firebase initialized successfully');
      resolve();
    } catch (error) {
      console.error('Firebase initialization error:', error);
      reject(error);
    }
  });
}

// Export for use in tracker.js
window.firebaseConfig = {
  init: initFirebase,
  getDb: () => db,
  isInitialized: () => initialized
};

