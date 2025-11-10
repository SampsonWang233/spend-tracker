# Cross-Device Data Sync

Your expense tracker now uses a **fixed userId** (`personal`) so all your devices (desktop, mobile, tablet) can share the same data in Firebase.

## How It Works

- All devices use the same userId: `personal`
- All expenses are stored in Firebase with this userId
- When you add an expense on your phone, it appears on your desktop (and vice versa)
- Data syncs in real-time across all devices

## If You Have Existing Data on Different Devices

If you already have expenses stored with different userIds, you have two options:

### Option 1: Use the Same userId (Recommended)

1. **On each device**, open the browser console
2. Run this command to set the same userId:
   ```javascript
   localStorage.setItem('expenseTracker_userId', 'personal');
   location.reload();
   ```
3. The app will now show all data from Firebase with userId `personal`

### Option 2: Merge Data Manually

If you have important data on different devices:

1. **On Device 1** (e.g., desktop):
   - Open Firebase Console → Firestore Database
   - Note the userId used in your expenses
   - Export or note down the expenses

2. **On Device 2** (e.g., mobile):
   - Set userId to match Device 1:
     ```javascript
     localStorage.setItem('expenseTracker_userId', 'SAME_USER_ID_FROM_DEVICE_1');
     location.reload();
     ```
   - Or manually add the expenses from Device 1

## Using a Custom userId

If you want to use a different userId (e.g., for multiple users or separate accounts):

1. **Via URL parameter**:
   - Add `?userId=mycustomid` to your URL
   - Example: `https://yoursite.github.io/?userId=mycustomid`
   - This will set and save the custom userId

2. **Via browser console**:
   ```javascript
   localStorage.setItem('expenseTracker_userId', 'mycustomid');
   location.reload();
   ```

## Verify It's Working

1. **On your desktop**: Add a test expense
2. **On your mobile**: Refresh the page - the expense should appear
3. **Check console**: Look for `👤 Current userId: personal` on both devices

## Troubleshooting

### Data still not syncing?

1. **Check userId on both devices**:
   - Open browser console
   - Look for: `👤 Current userId: ...`
   - Both should show the same userId

2. **Check Firebase Console**:
   - Go to Firestore Database
   - Check the `userId` field in your expenses
   - All should have the same userId

3. **Clear and reset**:
   ```javascript
   // Set the same userId on both devices
   localStorage.setItem('expenseTracker_userId', 'personal');
   localStorage.removeItem('expenseTracker_migratedToFirebase');
   location.reload();
   ```

### Want to start fresh?

If you want to clear all data and start with a clean slate:

1. Go to Firebase Console → Firestore Database
2. Delete all documents in the `expenses` collection
3. Clear localStorage on all devices:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

## Security Note

Since this is a personal expense tracker, using a fixed userId is fine. However, if you want to add multiple users or better security in the future, consider implementing Firebase Authentication.

