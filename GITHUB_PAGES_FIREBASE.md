# Quick Fix: Firebase Not Working on GitHub Pages

If Firebase works locally but not on your GitHub Pages site, follow these steps:

## Step 1: Add GitHub Pages Domain to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`spend-9beb0`)
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll to **"Your apps"** section
5. Click on your web app
6. Scroll to **"Authorized domains"**
7. Click **"Add domain"**
8. Add: `github.io` (this allows all GitHub Pages sites)
   - Or add your specific domain: `YOUR_USERNAME.github.io`
9. Click **Add**

## Step 2: Update Firestore Security Rules

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Use these rules for personal use (allows public access):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /expenses/{expenseId} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**

## Step 3: Verify Files Are Committed

Make sure `firebase-config.js` is in your repository:

```bash
git status
git add firebase-config.js
git commit -m "Add Firebase config"
git push
```

## Step 4: Test

1. Wait a few minutes for GitHub Pages to update
2. Open your GitHub Pages site
3. Open browser console (F12)
4. Check for errors
5. Try adding an expense
6. Check Firebase Console → Firestore Database

## Common Issues

### Error: "Permission denied"
→ Update Firestore security rules (Step 2)

### Error: "Domain not authorized"
→ Add domain to authorized domains (Step 1)

### Error: "Firebase SDK not loaded"
→ Check that Firebase scripts are loading (check Network tab in browser console)

### Works locally but not deployed
→ Most likely missing authorized domain (Step 1)

## Still Not Working?

1. Check browser console on your deployed site for specific errors
2. Verify your GitHub Pages URL matches what you added to authorized domains
3. Make sure Firestore is enabled in your Firebase project
4. Try clearing browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

