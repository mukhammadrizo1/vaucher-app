# Firebase Setup Guide (Free Tier - No Blaze Plan Required)

Your application is now configured to use **Firebase Realtime Database** (free tier) instead of Firebase Functions, which means you don't need the Blaze plan!

## ✅ What's Already Done

1. ✅ Application refactored to use Firebase Realtime Database client-side SDK
2. ✅ All API calls replaced with Firebase service
3. ✅ Application deployed to Firebase Hosting
4. ✅ Firebase configuration updated

## 📋 Setup Steps

### 1. Enable Firebase Realtime Database

1. Go to [Firebase Console](https://console.firebase.google.com/project/korzinkavaucher/overview)
2. Click on **"Realtime Database"** in the left menu
3. Click **"Create Database"**
4. Choose a location (select the closest to your users)
5. Choose **"Start in test mode"** (we'll update rules next)

### 2. Set Up Database Security Rules

1. In Realtime Database, go to the **"Rules"** tab
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

**Note:** These rules allow anyone to read/write. For production, you should add authentication. For now, this works for testing.

### 3. Get Your Firebase Configuration (Optional)

The app will auto-detect Firebase config from Firebase Hosting, but if you need to manually configure:

1. Go to Project Settings → General
2. Scroll down to "Your apps"
3. If you don't have a web app, click "Add app" → Web
4. Copy the `firebaseConfig` object
5. Update `src/app/services/firebase.service.ts` with your actual config

The database URL should be: `https://korzinkavaucher-default-rtdb.firebaseio.com`

## 🎉 You're Done!

Your application is now live at: **https://korzinkavaucher.web.app**

The app will:
- ✅ Store all document data in Firebase Realtime Database (free tier)
- ✅ Work without any server-side code
- ✅ Work without Blaze plan
- ✅ Sync data in real-time across all users

## 📝 Notes

- **Free Tier Limits:**
  - 1 GB storage
  - 10 GB/month bandwidth
  - 100 concurrent connections
  - This should be plenty for most use cases!

- **Data Structure:**
  - All documents are stored under `/documentDetails` in Realtime Database
  - Data is stored as an array of document objects

- **Local Development:**
  - The app will still work locally using Firebase Realtime Database
  - Make sure you're logged into Firebase CLI: `firebase login`

## 🔒 Security (For Production)

For production, you should update the database rules to require authentication:

```json
{
  "rules": {
    "documentDetails": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

Then add Firebase Authentication to your app.

