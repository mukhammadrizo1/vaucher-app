import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DocumentDetails } from '../app';

// Firebase configuration - will be initialized from environment or defaults
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private firebase: any = null;
  private database: any = null;
  private isBrowser: boolean;
  private initialized = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Initialize Firebase (only in browser)
   */
  async initialize(): Promise<void> {
    if (!this.isBrowser || this.initialized) {
      return;
    }

    try {
      // Dynamic import of Firebase SDK
      const { initializeApp, getApps } = await import('firebase/app');
      const { getDatabase, ref, get, set } = await import('firebase/database');
      
      // Get Firebase config from environment or use defaults
      const config: FirebaseConfig = this.getFirebaseConfig();
      
      // Initialize Firebase if not already initialized
      if (!getApps().length) {
        initializeApp(config);
      }
      
      this.database = { getDatabase, ref, get, set };
      this.initialized = true;
      
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      throw new Error('Failed to initialize Firebase. Please check your configuration.');
    }
  }

  /**
   * Get Firebase configuration
   * Uses the actual Firebase project configuration
   */
  private getFirebaseConfig(): FirebaseConfig {
    // Try to get from window (Firebase Hosting provides this)
    if (typeof window !== 'undefined' && (window as any).__FIREBASE_DEFAULTS__) {
      const defaults = (window as any).__FIREBASE_DEFAULTS__;
      return {
        apiKey: defaults.apiKey || defaults.config?.apiKey,
        authDomain: defaults.authDomain || defaults.config?.authDomain,
        databaseURL: defaults.databaseURL || defaults.config?.databaseURL || `https://${defaults.projectId || 'korzinkavaucher'}-default-rtdb.firebaseio.com`,
        projectId: defaults.projectId || defaults.config?.projectId || 'korzinkavaucher',
        storageBucket: defaults.storageBucket || defaults.config?.storageBucket || `${defaults.projectId || 'korzinkavaucher'}.firebasestorage.app`,
        messagingSenderId: defaults.messagingSenderId || defaults.config?.messagingSenderId,
        appId: defaults.appId || defaults.config?.appId
      };
    }

    // Use actual Firebase configuration
    return {
      apiKey: "AIzaSyCPGtl32u9QZeKdSynXY1bPeYbL2iuKsyw",
      authDomain: "korzinkavaucher.firebaseapp.com",
      databaseURL: "https://korzinkavaucher-default-rtdb.firebaseio.com",
      projectId: "korzinkavaucher",
      storageBucket: "korzinkavaucher.firebasestorage.app",
      messagingSenderId: "802789803758",
      appId: "1:802789803758:web:121694749aba441f7815ff"
    };
  }

  /**
   * Get all document details
   */
  async getDocumentDetails(): Promise<DocumentDetails[]> {
    if (!this.isBrowser) {
      return [];
    }

    await this.initialize();

    try {
      const db = this.database.getDatabase();
      const dbRef = this.database.ref(db, 'documentDetails');
      const snapshot = await this.database.get(dbRef);
      
      if (!snapshot.exists()) {
        console.log('No documents found in database');
        return [];
      }

      const data = snapshot.val();
      console.log('Data retrieved from Firebase:', data);
      
      // Convert object to array
      if (Array.isArray(data)) {
        return data.filter((doc: any) => doc !== null);
      } else if (typeof data === 'object' && data !== null) {
        return Object.values(data).filter((doc: any) => doc !== null) as DocumentDetails[];
      }
      
      return [];
    } catch (error: any) {
      console.error('Error getting document details:', error);
      console.error('Error details:', error.message, error.code);
      throw new Error(`Failed to load document details: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Save a new document
   */
  async saveDocumentDetails(document: DocumentDetails): Promise<void> {
    if (!this.isBrowser) {
      throw new Error('Firebase operations are only available in the browser');
    }

    await this.initialize();

    try {
      const db = this.database.getDatabase();
      const dbRef = this.database.ref(db, 'documentDetails');
      const snapshot = await this.database.get(dbRef);
      
      let documents: DocumentDetails[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (Array.isArray(data)) {
          documents = data.filter((doc: any) => doc !== null);
        } else if (typeof data === 'object' && data !== null) {
          documents = Object.values(data).filter((doc: any) => doc !== null) as DocumentDetails[];
        }
      }

      // Add new document
      documents.push(document);
      console.log('Saving documents to Firebase:', documents.length, 'total documents');

      // Save back to Firebase
      await this.database.set(dbRef, documents);
      console.log('Document saved successfully');
    } catch (error: any) {
      console.error('Error saving document details:', error);
      console.error('Error details:', error.message, error.code);
      throw new Error(`Failed to save document details: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Update a document by ID
   */
  async updateDocumentDetails(id: string, document: DocumentDetails): Promise<void> {
    if (!this.isBrowser) {
      throw new Error('Firebase operations are only available in the browser');
    }

    await this.initialize();

    try {
      const db = this.database.getDatabase();
      const dbRef = this.database.ref(db, 'documentDetails');
      const snapshot = await this.database.get(dbRef);
      
      if (!snapshot.exists()) {
        throw new Error('Document not found');
      }

      const data = snapshot.val();
      let documents: DocumentDetails[] = [];
      
      if (Array.isArray(data)) {
        documents = data.filter((doc: any) => doc !== null);
      } else if (typeof data === 'object') {
        documents = Object.values(data).filter((doc: any) => doc !== null) as DocumentDetails[];
      }

      const index = documents.findIndex((doc) => doc.id === id);
      if (index === -1) {
        throw new Error('Document not found');
      }

      // Update document
      documents[index] = { ...document, id };

      // Save back to Firebase
      await this.database.set(dbRef, documents);
    } catch (error) {
      console.error('Error updating document:', error);
      throw error instanceof Error ? error : new Error('Failed to update document');
    }
  }

  /**
   * Delete a document by ID
   */
  async deleteDocumentDetails(id: string): Promise<void> {
    if (!this.isBrowser) {
      throw new Error('Firebase operations are only available in the browser');
    }

    await this.initialize();

    try {
      const db = this.database.getDatabase();
      const dbRef = this.database.ref(db, 'documentDetails');
      const snapshot = await this.database.get(dbRef);
      
      if (!snapshot.exists()) {
        throw new Error('Document not found');
      }

      const data = snapshot.val();
      let documents: DocumentDetails[] = [];
      
      if (Array.isArray(data)) {
        documents = data.filter((doc: any) => doc !== null);
      } else if (typeof data === 'object') {
        documents = Object.values(data).filter((doc: any) => doc !== null) as DocumentDetails[];
      }

      const initialLength = documents.length;
      documents = documents.filter((doc) => doc.id !== id);

      if (documents.length === initialLength) {
        throw new Error('Document not found');
      }

      // Save back to Firebase
      await this.database.set(dbRef, documents);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error instanceof Error ? error : new Error('Failed to delete document');
    }
  }
}

