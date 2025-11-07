# Firebase Database Setup Guide

This guide will help you set up Firebase Firestore to store your expense data in the cloud instead of localStorage.

## Benefits of Using Firebase

- ✅ **Cloud Storage**: Your data is stored in the cloud, not just on your device
- ✅ **Sync Across Devices**: Access your expenses from any device
- ✅ **Backup**: Your data is automatically backed up
- ✅ **Free Tier**: Firebase has a generous free tier for personal use

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "My Spend Tracker")
4. Click **Continue**
5. Disable Google Analytics (optional, for personal use you don't need it)
6. Click **Create project**
7. Wait for the project to be created, then click **Continue**

## Step 2: Enable Firestore Database

1. In your Firebase project, click on **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Select **"Start in test mode"** (for personal use, this is fine)
4. Choose a location closest to you
5. Click **Enable**

## Step 3: Get Your Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to **"Project Overview"**
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>` to add a web app
5. Register your app with a nickname (e.g., "Spend Tracker Web")
6. Click **Register app**
7. Copy the `firebaseConfig` object that appears

## Step 4: Configure Your App

1. Open `firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. Save the file

## Step 5: Set Up Firestore Security Rules (Important!)

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Replace the rules with this (allows read/write for your app):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{expenseId} {
      allow read, write: if request.auth == null || 
        resource.data.userId == request.auth.uid || 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

**Note**: For personal use without authentication, you can use test mode rules temporarily, but for production, consider adding authentication.

3. Click **Publish**

## Step 6: Test Your Setup

1. Open your app in a browser
2. Add an expense
3. Go to Firebase Console → Firestore Database
4. You should see a new collection called `expenses` with your data

## Migration from localStorage

If you already have data in localStorage, it will continue to work. The app will:
- Use Firebase if configured
- Fall back to localStorage if Firebase is not configured or fails

To migrate existing data:
1. The app will automatically use localStorage until Firebase is set up
2. Once Firebase is configured, new expenses will be saved to Firebase
3. Old localStorage data will remain but won't sync

## Firebase Free Tier Limits

- **Storage**: 1 GB
- **Reads**: 50,000/day
- **Writes**: 20,000/day
- **Deletes**: 20,000/day

For personal expense tracking, this is more than enough!

## Troubleshooting

### "Firebase SDK not loaded"
- Make sure the Firebase SDK scripts are loaded before `firebase-config.js`
- Check your internet connection

### "Permission denied"
- Check your Firestore security rules
- Make sure you've published the rules

### Data not syncing
- Check browser console for errors
- Verify your Firebase config is correct
- Make sure Firestore is enabled in your Firebase project

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

