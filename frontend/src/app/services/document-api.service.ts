import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { DocumentDetails } from '../app';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentApiService {
  private readonly baseUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  /**
   * Get all document records
   */
  getDocuments$(): Observable<DocumentDetails[]> {
    return this.http.get<DocumentDetails[]>(this.baseUrl);
  }

  async getDocumentDetails(): Promise<DocumentDetails[]> {
    return firstValueFrom(this.getDocuments$());
  }

  /**
   * Get a single document record by ID
   */
  getDocumentById$(id: string): Observable<DocumentDetails> {
    return this.http.get<DocumentDetails>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  async getDocumentById(id: string): Promise<DocumentDetails> {
    return firstValueFrom(this.getDocumentById$(id));
  }

  /**
   * Create and save a new document
   */
  saveDocumentDetails$(document: DocumentDetails): Observable<DocumentDetails> {
    return this.http.post<DocumentDetails>(this.baseUrl, document);
  }

  async saveDocumentDetails(document: DocumentDetails): Promise<DocumentDetails> {
    return firstValueFrom(this.saveDocumentDetails$(document));
  }

  /**
   * Update an existing document by ID
   */
  updateDocumentDetails$(id: string, document: DocumentDetails): Observable<DocumentDetails> {
    return this.http.put<DocumentDetails>(`${this.baseUrl}/${encodeURIComponent(id)}`, document);
  }

  async updateDocumentDetails(id: string, document: DocumentDetails): Promise<DocumentDetails> {
    return firstValueFrom(this.updateDocumentDetails$(id, document));
  }

  /**
   * Delete a document by ID
   */
  deleteDocumentDetails$(id: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  async deleteDocumentDetails(id: string): Promise<{ success: boolean; message?: string }> {
    return firstValueFrom(this.deleteDocumentDetails$(id));
  }
}
