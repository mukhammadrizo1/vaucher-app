import { Component, Input, Output, EventEmitter, signal, PLATFORM_ID, Inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DocumentDetails } from '../../app';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-details-view-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details-view-modal.component.html',
  styleUrl: './details-view-modal.component.scss'
})
export class DetailsViewModalComponent {
  @Input() document: DocumentDetails | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  
  isGenerating = signal(false);
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private documentService: DocumentService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  @ViewChild('documentContainer') documentContainer!: ElementRef;

  formatNumber(num: number): string {
    return this.documentService.formatNumber(num);
  }

  extractINN(requisites: string): string {
    const innMatch = requisites.match(/ИНН\s+(\d+)/i);
    return innMatch ? innMatch[1] : '';
  }

  extractPhone(requisites: string): string {
    const phoneMatch = requisites.match(/Тел[.:]\s*([\d\s\-()]+)/i);
    return phoneMatch ? phoneMatch[1].trim() : '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateString;
    }
  }

  async downloadDocx() {
    if (!this.isBrowser || !this.document) return;
    
    this.isGenerating.set(true);
    try {
      await this.documentService.downloadDocx(this.document);
    } catch (error: any) {
      alert(error.message || 'Ошибка при создании DOCX');
    } finally {
      this.isGenerating.set(false);
    }
  }

  onEdit() {
    this.edit.emit();
  }

  onDelete() {
    this.delete.emit();
  }

  onClose() {
    this.close.emit();
  }
}

