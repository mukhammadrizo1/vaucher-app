# Database Migration Guide: Adding Договор and Примечания Columns

This guide will help you migrate your existing Firebase Realtime Database to include the new `contract` (Договор) and `notes` (Примечания) fields.

## What Changed

Two new columns have been added to the dashboard table:
1. **Договор** - Added after "СУММА ДОГОВОРA" column
2. **Примечания** - Added at the end of the table

These fields are now part of the `DocumentDetails` interface and can be edited in the document edit modal.

## Migration Steps

### Option 1: Using the Migration Script (Recommended)

This is the safest and fastest method, especially if you have many records.

1. **Export your Firebase data:**
   - Go to [Firebase Console](https://console.firebase.google.com/project/korzinkavaucher/database)
   - Navigate to **Realtime Database** → **Data** tab
   - Click the three dots menu (⋮) in the top right
   - Select **Export JSON**
   - Save the file as `firebase-export.json` in your project root directory

2. **Run the migration script:**
   ```bash
   node migrate-database.js
   ```

3. **Review the migrated data:**
   - Check `firebase-export-migrated.json` to verify the changes
   - All documents should now have `contract: ""` and `notes: ""` fields

4. **Import back to Firebase:**
   - Go back to Firebase Console → Realtime Database → Data tab
   - Click the three dots menu (⋮) → **Import JSON**
   - Select `firebase-export-migrated.json`
   - Click **Import** and confirm

### Option 2: Manual Migration (For Small Datasets)

If you only have a few records, you can manually add the fields:

1. Go to Firebase Console → Realtime Database → Data tab
2. For each document under `documentDetails`:
   - Click on the document
   - Add a new field: `contract` with value `""` (empty string)
   - Add a new field: `notes` with value `""` (empty string)
   - Save

## Verification

After migration:

1. **Check the dashboard:**
   - The table should now show "Договор" and "Примечания" columns
   - Existing records should show "-" for these fields (empty values)

2. **Test editing:**
   - Click on any document to view details
   - Click "Редактировать" (Edit)
   - You should see "Договор" and "Примечания" fields in the form
   - Enter some test data and save
   - Verify the data appears in the dashboard table

## Troubleshooting

### Issue: Migration script says "firebase-export.json not found"
**Solution:** Make sure you exported the data from Firebase and saved it as `firebase-export.json` in the project root directory.

### Issue: Import fails in Firebase
**Solution:** 
- Make sure you're importing to the correct database
- Check that the JSON file is valid (you can validate it at jsonlint.com)
- Try importing a smaller subset first to test

### Issue: New columns show "-" for all records
**Solution:** This is expected for existing records. The fields are empty by default. You can edit each document to add the values.

### Issue: Can't see the new columns in dashboard
**Solution:**
- Make sure you've rebuilt the application: `npm run build` or restart your dev server
- Clear your browser cache
- Check browser console for any errors

## Notes

- The new fields are optional (marked with `?` in TypeScript)
- Existing documents without these fields will still work (they'll show "-" in the table)
- New documents created after this update will automatically include these fields
- The migration script adds empty strings (`""`) as default values, which you can edit later

## Support

If you encounter any issues during migration, check:
1. Browser console for errors
2. Firebase Console for database errors
3. The migration script output for any warnings
