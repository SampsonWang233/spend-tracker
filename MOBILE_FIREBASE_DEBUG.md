# Debugging Firebase on Mobile/GitHub Pages

If your app is using localStorage instead of Firebase on your phone, follow these steps:

## Quick Check: What Storage is Being Used?

1. **On your phone**, open your GitHub Pages site
2. Open browser developer tools (varies by browser):
   - **Chrome Android**: Connect phone to computer, use Chrome DevTools
   - **Safari iOS**: Connect to Mac, use Safari Web Inspector
   - **Or**: Use remote debugging tools
3. Check the **Console** tab for these messages:
   - ✅ `Firebase initialized successfully` = Using Firebase
   - 📦 `Using localStorage for data storage` = Using localStorage (Firebase failed)

## Common Issues & Fixes

### Issue 1: Firebase Not Initializing

**Symptoms**: Console shows `⚠️ Firebase config not found` or `❌ Firebase initialization failed`

**Fixes**:
1. Check that `firebase-config.js` is committed to GitHub
2. Verify Firebase SDK is loading (check Network tab)
3. Make sure your GitHub Pages domain is in Firebase Authorized Domains

### Issue 2: Permission Denied

**Symptoms**: Console shows `❌ Error: permission-denied`

**Fixes**:
1. Go to Firebase Console → Firestore Database → Rules
2. Update rules to:
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

### Issue 3: Domain Not Authorized

**Symptoms**: Console shows CORS errors or `unavailable` errors

**Fixes**:
1. Go to Firebase Console → Project Settings → Your apps
2. Click on your web app
3. Scroll to "Authorized domains"
4. Add: `github.io` (or your specific domain)
5. Click **Add**

### Issue 4: localStorage Data Not Migrating

**Symptoms**: Old data still showing from localStorage

**Fixes**:
1. The app should automatically migrate on first Firebase connection
2. Check console for migration messages
3. If migration didn't happen:
   - Clear browser cache/localStorage
   - Refresh the page
   - Migration will run again

## Manual Migration (If Needed)

If automatic migration didn't work, you can manually clear localStorage:

1. Open browser console on your phone (or desktop version of the site)
2. Run this command:
   ```javascript
   localStorage.removeItem('expenses');
   location.reload();
   ```
3. The app will now use only Firebase data

## Testing Steps

1. **Clear browser data** on your phone (to start fresh)
2. **Open your GitHub Pages site**
3. **Check console** for Firebase initialization messages
4. **Add a test expense**
5. **Check Firebase Console** → Firestore Database to see if it appears
6. **Refresh the page** - expense should still be there (from Firebase)

## Still Not Working?

1. **Check browser console** for specific error messages
2. **Verify Firebase config** is correct in `firebase-config.js`
3. **Test on desktop** first to see if it's a mobile-specific issue
4. **Check network connection** - Firebase needs internet
5. **Try a different browser** on your phone

## Console Messages Guide

- `✅ Firebase initialized successfully` = Good! Using Firebase
- `📦 Using localStorage for data storage` = Firebase failed, using localStorage
- `🔄 Found X months of data in localStorage, migrating...` = Migration in progress
- `✅ Migrated X expenses to Firebase` = Migration successful
- `❌ Firebase initialization failed` = Check config and authorized domains
- `❌ Error: permission-denied` = Update Firestore security rules

