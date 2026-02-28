import {onRequest} from 'firebase-functions/v2/https';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
if (!global.firebaseAdminInitialized) {
  try {
    initializeApp();
    global.firebaseAdminInitialized = true;
  } catch (e) {
    // Already initialized
  }
}

// Import the request handler from the built Angular SSR server
// This will be available after building the Angular app
let reqHandler;

try {
  // Try to import the built server
  // The server.ts exports reqHandler which is compatible with Firebase Functions
  const serverPath = join(__dirname, '../dist/vaucher/server/server.mjs');
  const serverModule = await import(serverPath);
  
  // The reqHandler is exported from server.ts using createNodeRequestHandler
  reqHandler = serverModule.reqHandler;
  
  if (!reqHandler) {
    throw new Error('reqHandler not found in server module');
  }
} catch (error) {
  console.error('Error importing server module:', error);
  console.error('Make sure you have built the Angular app: npm run build');
  // Fallback handler
  reqHandler = (req, res) => {
    res.status(500).json({ 
      error: 'Server not built', 
      message: 'Please run: npm run build before deploying' 
    });
  };
}

// Export the Cloud Function for SSR and API routes
export const ssr = onRequest(
  {
    memory: '1GiB',
    timeoutSeconds: 60,
    maxInstances: 10,
    cors: true,
  },
  reqHandler
);

