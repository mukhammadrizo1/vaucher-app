# Troubleshooting: Can't Send/Get Details

## Quick Fix Steps

### 1. Enable Realtime Database (If Not Done)

1. Go to: https://console.firebase.google.com/project/korzinkavaucher/database
2. If you see "Create Database", click it
3. Choose location (closest to your users)
4. Choose **"Start in test mode"**
5. Click "Enable"

### 2. Set Database Rules (IMPORTANT!)

1. In Realtime Database, go to **"Rules"** tab
2. Replace the rules with:

```json
{
  "rules": {
    "documentDetails": {
      ".read": true,
      ".write": true
    }
  }
}
```

3. Click **"Publish"**

### 3. Verify Database URL

Make sure your database URL is: `https://korzinkavaucher-default-rtdb.firebaseio.com`

You can check this in:
- Firebase Console → Realtime Database → Data tab
- The URL should be shown at the top

### 4. Check Browser Console

Open your browser's Developer Tools (F12) and check the Console tab for errors:

- Look for "Firebase initialized successfully" message
- Check for any red error messages
- Common errors:
  - `Permission denied` → Database rules need to be updated
  - `Database not found` → Realtime Database not created
  - `Network error` → Check internet connection

### 5. Test Database Connection

After setting up, try:
1. Go to your app: https://korzinkavaucher.web.app
2. Open browser console (F12)
3. Try to send a document
4. Check console for any errors
5. Check Firebase Console → Realtime Database → Data tab to see if data appears

## Common Issues

### Issue: "Permission denied" error
**Solution:** Update database rules (see step 2 above)

### Issue: "Database not found" error  
**Solution:** Create Realtime Database (see step 1 above)

### Issue: Data not appearing
**Solution:** 
- Check database rules allow read/write
- Check browser console for errors
- Verify database URL matches: `https://korzinkavaucher-default-rtdb.firebaseio.com`

### Issue: Can save but can't load
**Solution:**
- Check database rules allow `.read: true`
- Check browser console for errors
- Try refreshing the page

## Still Having Issues?

1. Check browser console for specific error messages
2. Verify Realtime Database is created and rules are published
3. Make sure you're using the correct Firebase project (korzinkavaucher)
4. Try clearing browser cache and reloading

