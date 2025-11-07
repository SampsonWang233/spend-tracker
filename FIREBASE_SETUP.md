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

## Step 5: Add Authorized Domains (Required for GitHub Pages!)

**This is critical for your app to work on GitHub Pages!**

1. In Firebase Console, click the gear icon ⚙️ next to **"Project Overview"**
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click on your web app (the one you registered)
5. Scroll down to **"Authorized domains"** section
6. Click **"Add domain"**
7. Add your GitHub Pages domain:
   - If your site is `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`, add: `YOUR_USERNAME.github.io`
   - Or add: `github.io` (this allows all GitHub Pages subdomains)
8. Click **Add**
9. Also add `localhost` if you want to test locally (it should already be there)

**Important**: Firebase only allows requests from authorized domains. Without this, your app will work locally but not on GitHub Pages!

## Step 6: Set Up Firestore Security Rules (Important!)

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. For personal use without authentication, use these rules (allows public read/write):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{expenseId} {
      // Allow read and write for all users (personal use)
      allow read, write: if true;
    }
  }
}
```

**OR** for better security (recommended), use user-based rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{expenseId} {
      // Allow if no auth required OR if userId matches
      allow read, write: if request.auth == null || 
        resource.data.userId == request.resource.data.userId;
    }
  }
}
```

**Note**: The first rule (allow all) is simpler for personal use. The second is more secure but requires the userId to match.

3. Click **Publish**

## Step 7: Deploy to GitHub Pages

1. Make sure `firebase-config.js` is committed to your repository:
   ```bash
   git add firebase-config.js
   git commit -m "Add Firebase configuration"
   git push
   ```

2. Verify your GitHub Pages site is deployed and accessible

3. Test your deployed site:
   - Open your GitHub Pages URL (e.g., `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`)
   - Open browser console (F12) to check for errors
   - Try adding an expense
   - Check Firebase Console → Firestore Database to see if data appears

## Step 8: Test Your Setup

1. **Test locally:**
   - Open your app in a browser (file:// or localhost)
   - Add an expense
   - Go to Firebase Console → Firestore Database
   - You should see a new collection called `expenses` with your data

2. **Test on GitHub Pages:**
   - Open your deployed site
   - Check browser console for any errors
   - Try adding an expense
   - Verify data appears in Firestore

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

### Works locally but not on GitHub Pages
- **Most common issue**: Make sure you've added your GitHub Pages domain to Firebase Authorized Domains (Step 5)
- Check that `firebase-config.js` is committed and pushed to GitHub
- Verify your GitHub Pages site is actually deployed
- Check browser console on the deployed site for specific error messages
- Common errors:
  - `FirebaseError: [code=permission-denied]` → Check Firestore security rules
  - `FirebaseError: [code=unavailable]` → Check authorized domains
  - `CORS error` → Add domain to authorized domains

### "Permission denied" on deployed site
- Make sure Firestore security rules allow public access (if using test mode)
- Check that rules are published (not just saved)
- Try the simpler rule: `allow read, write: if true;` for testing

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

