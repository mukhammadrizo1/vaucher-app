import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import htmlToDocx from 'html-to-docx';
import * as XLSX from 'xlsx';

// Get the project root directory
const projectRoot = process.cwd();
const browserDistFolder = join(projectRoot, 'dist/vaucher/browser');
const dataFolder = join(projectRoot, 'data');
const documentDetailsFile = join(dataFolder, 'document-details.json');

// Check if we're in Firebase Functions environment
const isFirebaseFunctions = !!(process.env['FUNCTION_TARGET'] || process.env['K_SERVICE']);

// Firebase Admin SDK for Firestore (when running in Firebase Functions)
let db: any = null;
if (isFirebaseFunctions) {
  try {
    // Dynamic import only in Firebase Functions environment
    // @ts-ignore - firebase-admin is only available in Firebase Functions
    const admin = await import('firebase-admin');
    if (!admin.default.apps.length) {
      admin.default.initializeApp();
    }
    db = admin.default.firestore();
  } catch (e) {
    console.log('Firebase Admin not available:', e);
  }
}

const app = express();
const angularApp = new AngularNodeAppEngine();

// Parse JSON bodies for API requests
app.use(express.json({ limit: '10mb' }));

/**
 * Get document details from Firestore or file system
 */
async function getDocumentDetails(): Promise<any[]> {
  if (isFirebaseFunctions && db) {
    // Use Firestore in Firebase Functions
    const snapshot = await db.collection('documentDetails').get();
    return snapshot.docs.map((doc: any) => doc.data());
  } else {
    // Use file system for local development
    if (!existsSync(documentDetailsFile)) {
      return [];
    }
    const fileData = readFileSync(documentDetailsFile, 'utf-8');
    const documentsList = JSON.parse(fileData);
    return Array.isArray(documentsList) ? documentsList : [];
  }
}

/**
 * Save document details to Firestore or file system
 */
async function saveDocumentDetails(documentsList: any[]): Promise<void> {
  if (isFirebaseFunctions && db) {
    // Use Firestore in Firebase Functions
    const batch = db.batch();
    // Clear existing documents
    const snapshot = await db.collection('documentDetails').get();
    snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
    // Add all documents
    documentsList.forEach((doc: any) => {
      const docRef = db.collection('documentDetails').doc(doc.id || `doc_${Date.now()}`);
      batch.set(docRef, doc);
    });
    await batch.commit();
  } else {
    // Use file system for local development
    if (!existsSync(dataFolder)) {
      mkdirSync(dataFolder, { recursive: true });
    }
    writeFileSync(documentDetailsFile, JSON.stringify(documentsList, null, 2), 'utf-8');
  }
}

/**
 * Initialize document details file if it doesn't exist (local only)
 */
function ensureDocumentDetailsFile() {
  if (!isFirebaseFunctions) {
    if (!existsSync(dataFolder)) {
      mkdirSync(dataFolder, { recursive: true });
    }
    if (!existsSync(documentDetailsFile)) {
      writeFileSync(documentDetailsFile, JSON.stringify([], null, 2), 'utf-8');
    }
  }
}

// Initialize file on server start (local only)
ensureDocumentDetailsFile();

/**
 * API endpoint to save document details
 */
app.post('/api/document-details', async (req, res) => {
  try {
    console.log('POST /api/document-details - Received request');
    ensureDocumentDetailsFile();
    
    // Read existing data
    let documentsList = await getDocumentDetails();

    // Add new document
    const newDocument = req.body;
    console.log('Adding new document:', JSON.stringify(newDocument, null, 2));
    documentsList.push(newDocument);

    // Save back
    await saveDocumentDetails(documentsList);
    console.log(`Document details saved successfully`);

    res.json({ success: true, message: 'Document details saved successfully' });
  } catch (error) {
    console.error('Error saving document details:', error);
    res.status(500).json({ error: 'Failed to save document details', details: error instanceof Error ? error.message : String(error) });
  }
});

/**
 * API endpoint to get all document details
 */
app.get('/api/document-details', async (req, res) => {
  try {
    ensureDocumentDetailsFile();
    
    const documentsList = await getDocumentDetails();
    return res.json(Array.isArray(documentsList) ? documentsList : []);
  } catch (error) {
    console.error('Error reading document details:', error);
    return res.status(500).json({ error: 'Failed to read document details' });
  }
});

/**
 * API endpoint to update document details by ID
 */
app.put('/api/document-details/:id', async (req, res) => {
  try {
    ensureDocumentDetailsFile();
    const { id } = req.params;

    let documentsList = await getDocumentDetails();

    const docIndex = documentsList.findIndex((doc) => doc.id === decodeURIComponent(id));

    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Preserve the ID from the URL parameter to ensure it doesn't change
    const updatedDoc = { ...req.body, id: decodeURIComponent(id) };
    documentsList[docIndex] = updatedDoc;
    await saveDocumentDetails(documentsList);
    return res.json({ success: true, message: 'Document updated successfully' });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({
      error: 'Failed to update document',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * API endpoint to delete document details by ID
 */
app.delete('/api/document-details/:id', async (req, res) => {
  try {
    ensureDocumentDetailsFile();
    const { id } = req.params;

    if (isFirebaseFunctions && db) {
      // Use Firestore in Firebase Functions
      const snapshot = await db.collection('documentDetails').where('id', '==', decodeURIComponent(id)).get();
      if (snapshot.empty) {
        return res.status(404).json({ error: 'Document not found' });
      }
      const batch = db.batch();
      snapshot.docs.forEach((doc: any) => batch.delete(doc.ref));
      await batch.commit();
      return res.json({ success: true, message: 'Document deleted successfully' });
    } else {
      // Use file system for local development
      let documentsList = await getDocumentDetails();
      const initialLength = documentsList.length;
      documentsList = documentsList.filter(
        (doc) => doc.id !== decodeURIComponent(id)
      );

      if (documentsList.length === initialLength) {
        return res.status(404).json({ error: 'Document not found' });
      }

      await saveDocumentDetails(documentsList);
      return res.json({ success: true, message: 'Document deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * API endpoint to generate DOCX from HTML
 */
app.post('/api/generate-docx', async (req, res) => {
  try {
    const { html, filename } = req.body;
    
    if (!html) {
      res.status(400).json({ error: 'HTML content is required' });
      return;
    }

    const docxBuffer = await htmlToDocx(html, null, {
      table: { 
        row: { cantSplit: true }
      },
      footer: false,
      header: false,
      pageNumber: false,
      margins: {
        top: 567,      // ~1cm in twips
        right: 567,    // ~1cm in twips
        bottom: 567,   // ~1cm in twips
        left: 1134,    // ~2cm in twips
      },
      font: 'Times New Roman',
      fontSize: 20,    // 10pt in half-points
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'document.docx')}"`);
    res.send(docxBuffer);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    res.status(500).json({ error: 'Failed to generate DOCX' });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
