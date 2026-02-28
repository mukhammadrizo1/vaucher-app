/**
 * Migration script to add 'contract' and 'notes' fields to existing Firebase data
 * 
 * Usage:
 * 1. Export your Firebase Realtime Database data:
 *    - Go to Firebase Console → Realtime Database → Data tab
 *    - Click the three dots menu (⋮) → Export JSON
 *    - Save the file as 'firebase-export.json' in this directory
 * 
 * 2. Run this script:
 *    node migrate-database.js
 * 
 * 3. The script will create 'firebase-export-migrated.json' with the new fields
 * 
 * 4. Import the migrated data back to Firebase:
 *    - Go to Firebase Console → Realtime Database → Data tab
 *    - Click the three dots menu (⋮) → Import JSON
 *    - Select 'firebase-export-migrated.json'
 *    - Confirm the import
 */

const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'firebase-export.json');
const outputFile = path.join(__dirname, 'firebase-export-migrated.json');

console.log('Starting database migration...\n');

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error('❌ Error: firebase-export.json not found!');
  console.error('\nPlease export your Firebase data first:');
  console.error('1. Go to Firebase Console → Realtime Database → Data tab');
  console.error('2. Click the three dots menu (⋮) → Export JSON');
  console.error('3. Save as "firebase-export.json" in this directory\n');
  process.exit(1);
}

try {
  // Read the exported data
  console.log('Reading firebase-export.json...');
  const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
  
  let migratedCount = 0;
  let totalCount = 0;
  
  // Function to migrate a document
  function migrateDocument(doc) {
    if (!doc || typeof doc !== 'object') {
      return doc;
    }
    
    totalCount++;
    const migrated = { ...doc };
    
    // Add 'contract' field if it doesn't exist
    if (!('contract' in migrated)) {
      migrated.contract = '';
      migratedCount++;
    }
    
    // Add 'notes' field if it doesn't exist
    if (!('notes' in migrated)) {
      migrated.notes = '';
      migratedCount++;
    }
    
    return migrated;
  }
  
  // Migrate the data structure
  let migratedData;
  
  if (data.documentDetails) {
    // If data is structured as { documentDetails: { ... } }
    if (Array.isArray(data.documentDetails)) {
      // Array format
      migratedData = {
        ...data,
        documentDetails: data.documentDetails.map(migrateDocument)
      };
    } else if (typeof data.documentDetails === 'object') {
      // Object format (key-value pairs)
      migratedData = {
        ...data,
        documentDetails: Object.keys(data.documentDetails).reduce((acc, key) => {
          acc[key] = migrateDocument(data.documentDetails[key]);
          return acc;
        }, {})
      };
    } else {
      migratedData = data;
    }
  } else if (Array.isArray(data)) {
    // If data is directly an array
    migratedData = data.map(migrateDocument);
  } else if (typeof data === 'object' && data !== null) {
    // If data is an object with document keys
    migratedData = Object.keys(data).reduce((acc, key) => {
      acc[key] = migrateDocument(data[key]);
      return acc;
    }, {});
  } else {
    console.warn('⚠️  Warning: Unknown data format. Data will be copied as-is.');
    migratedData = data;
  }
  
  // Write the migrated data
  console.log('Writing migrated data to firebase-export-migrated.json...');
  fs.writeFileSync(outputFile, JSON.stringify(migratedData, null, 2), 'utf-8');
  
  console.log('\n✅ Migration completed successfully!');
  console.log(`   - Total documents processed: ${totalCount}`);
  console.log(`   - Documents migrated: ${migratedCount}`);
  console.log(`   - Output file: ${outputFile}\n`);
  console.log('Next steps:');
  console.log('1. Review firebase-export-migrated.json to verify the changes');
  console.log('2. Go to Firebase Console → Realtime Database → Data tab');
  console.log('3. Click the three dots menu (⋮) → Import JSON');
  console.log('4. Select "firebase-export-migrated.json"');
  console.log('5. Confirm the import\n');
  
} catch (error) {
  console.error('❌ Error during migration:', error.message);
  console.error(error.stack);
  process.exit(1);
}
