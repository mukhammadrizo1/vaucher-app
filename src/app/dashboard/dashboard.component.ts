import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentDetails } from '../app';
import { DetailsViewModalComponent } from './details-view-modal/details-view-modal.component';
import { DetailsEditModalComponent } from './details-edit-modal/details-edit-modal.component';
import { DetailsDeleteModalComponent } from './details-delete-modal/details-delete-modal.component';
import { FirebaseService } from '../services/firebase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DetailsViewModalComponent,
    DetailsEditModalComponent,
    DetailsDeleteModalComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  documents = signal<DocumentDetails[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  selectedDocument = signal<DocumentDetails | null>(null);
  isViewModalOpen = signal(false);
  isEditModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  
  // Authentication
  isAuthenticated = signal(false);
  showLoginModal = signal(true);
  loginPassword: string = '';
  loginError = signal('');
  
  // Default password - change this to your desired password
  private readonly DASHBOARD_PASSWORD = 'KorzinkaVaucher2026';
  private readonly AUTH_KEY = 'dashboard_authenticated';

  constructor(private firebaseService: FirebaseService) {}
  
  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(10);
  searchTerm = signal('');
  
  // Filtered documents based on search
  filteredDocuments = computed(() => {
    const docs = this.documents();
    const search = this.searchTerm().toLowerCase().trim();
    
    if (!search) {
      return docs;
    }
    
    return docs.filter(doc => {
      const searchLower = search.toLowerCase();
      
      // Search in various fields
      const matchesINN = this.extractINN(doc.requisites).toLowerCase().includes(searchLower);
      const matchesContractorNumber = (doc.contractorNumber || '').toLowerCase().includes(searchLower);
      const matchesCompanyName = (doc.companyName || '').toLowerCase().includes(searchLower);
      const matchesContractNumber = (doc.contractNumber || '').toLowerCase().includes(searchLower);
      const matchesContract = (doc.contract || '').toLowerCase().includes(searchLower);
      const matchesOrderNumber = (doc.orderNumber || '').toLowerCase().includes(searchLower);
      const matchesDeliveryNumber = (doc.deliveryNumber || '').toLowerCase().includes(searchLower);
      const matchesInvoiceNumber = (doc.invoiceNumber || '').toLowerCase().includes(searchLower);
      const matchesPhone = (doc.phoneNumber || this.extractPhone(doc.requisites) || '').toLowerCase().includes(searchLower);
      const matchesNotes = (doc.notes || '').toLowerCase().includes(searchLower);
      const matchesTotal = doc.total.toString().includes(searchLower);
      const matchesDate = this.formatDate(doc.date).toLowerCase().includes(searchLower);
      
      return matchesINN || matchesContractorNumber || matchesCompanyName || 
             matchesContractNumber || matchesContract || matchesOrderNumber || 
             matchesDeliveryNumber || matchesInvoiceNumber || matchesPhone || 
             matchesNotes || matchesTotal || matchesDate;
    });
  });
  
  // Computed pagination values
  totalPages = computed(() => {
    const total = this.filteredDocuments().length;
    const perPage = this.itemsPerPage();
    return Math.ceil(total / perPage) || 1;
  });
  
  paginatedDocuments = computed(() => {
    const docs = this.filteredDocuments();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return docs.slice(startIndex, endIndex);
  });
  
  startIndex = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    return (page - 1) * perPage + 1;
  });
  
  endIndex = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const total = this.filteredDocuments().length;
    return Math.min(page * perPage, total);
  });
  
  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    // Reset to first page when searching
    this.currentPage.set(1);
  }
  
  clearSearch() {
    this.searchTerm.set('');
    this.currentPage.set(1);
  }

  ngOnInit() {
    // Check if user is already authenticated
    this.checkAuthentication();
    
    if (this.isAuthenticated()) {
      this.loadDocuments();
    }
  }

  checkAuthentication() {
    if (typeof window !== 'undefined') {
      const authStatus = localStorage.getItem(this.AUTH_KEY);
      const authTime = localStorage.getItem(this.AUTH_KEY + '_time');
      
      if (authStatus === 'true' && authTime) {
        // Check if authentication is still valid (24 hours)
        const authTimestamp = parseInt(authTime, 10);
        const now = Date.now();
        const hoursSinceAuth = (now - authTimestamp) / (1000 * 60 * 60);
        
        if (hoursSinceAuth < 24) {
          this.isAuthenticated.set(true);
          this.showLoginModal.set(false);
          return;
        } else {
          // Expired, clear auth
          localStorage.removeItem(this.AUTH_KEY);
          localStorage.removeItem(this.AUTH_KEY + '_time');
        }
      }
    }
    
    this.isAuthenticated.set(false);
    this.showLoginModal.set(true);
  }

  onLoginSubmit() {
    const password = this.loginPassword;
    
    if (password === this.DASHBOARD_PASSWORD) {
      // Set authentication
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.AUTH_KEY, 'true');
        localStorage.setItem(this.AUTH_KEY + '_time', Date.now().toString());
      }
      
      this.isAuthenticated.set(true);
      this.showLoginModal.set(false);
      this.loginError.set('');
      this.loginPassword = '';
      this.loadDocuments();
    } else {
      this.loginError.set('Неверный пароль. Попробуйте снова.');
      this.loginPassword = '';
    }
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.AUTH_KEY);
      localStorage.removeItem(this.AUTH_KEY + '_time');
    }
    this.isAuthenticated.set(false);
    this.showLoginModal.set(true);
    this.documents.set([]);
  }

  openDetailModal(doc: DocumentDetails) {
    this.selectedDocument.set(doc);
    this.isViewModalOpen.set(true);
  }

  closeViewModal() {
    this.isViewModalOpen.set(false);
    this.selectedDocument.set(null);
  }

  openEditModal() {
    this.isViewModalOpen.set(false);
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
  }

  openDeleteModal() {
    this.isViewModalOpen.set(false);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
  }

  async loadDocuments() {
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const data = await this.firebaseService.getDocumentDetails();
      // Reverse the array to show most recent documents first
      const documentsArray = Array.isArray(data) ? data : [];
      this.documents.set([...documentsArray].reverse());
      // Reset to first page when loading new documents
      this.currentPage.set(1);
    } catch (error) {
      console.error('Error loading documents:', error);
      this.error.set('Failed to load document details. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  // Pagination methods
  goToPage(page: number) {
    const totalPages = this.totalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage.set(page);
    }
  }
  
  nextPage() {
    const current = this.currentPage();
    const total = this.totalPages();
    if (current < total) {
      this.currentPage.set(current + 1);
    }
  }
  
  previousPage() {
    const current = this.currentPage();
    if (current > 1) {
      this.currentPage.set(current - 1);
    }
  }
  
  onItemsPerPageChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = parseInt(select.value, 10);
    this.itemsPerPage.set(value);
    // Reset to first page when changing items per page
    this.currentPage.set(1);
  }
  
  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, last page, current page, and pages around current
      if (current <= 3) {
        // Near the beginning
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(total);
      } else if (current >= total - 2) {
        // Near the end
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(total);
      }
    }
    
    return pages;
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('ru-RU').format(num);
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

  async saveDocument(updatedDoc: DocumentDetails) {
    try {
      const originalDoc = this.selectedDocument();
      if (!originalDoc || !originalDoc.id) return;

      // Ensure the ID is preserved from the original document
      const docToSave = { ...updatedDoc, id: originalDoc.id };

      await this.firebaseService.updateDocumentDetails(originalDoc.id, docToSave);

      this.closeEditModal();
      await this.loadDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      alert('Ошибка при сохранении документа. Пожалуйста, попробуйте ещё раз.');
    }
  }

  async confirmDelete() {
    const doc = this.selectedDocument();
    if (!doc || !doc.id) return;

    try {
      await this.firebaseService.deleteDocumentDetails(doc.id);

      this.closeDeleteModal();
      this.selectedDocument.set(null);
      await this.loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Ошибка при удалении документа. Пожалуйста, попробуйте ещё раз.');
    }
  }

  async exportToExcel() {
    const docs = this.filteredDocuments();
    if (docs.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      // Load ExcelJS from CDN dynamically (supports cell styling)
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
      
      // Access ExcelJS from window object
      const ExcelJS = (window as any).ExcelJS;
      
      if (!ExcelJS) {
        throw new Error('Failed to load ExcelJS library');
      }

      // Create a new workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Документы');

      // Define columns
      worksheet.columns = [
        { header: '№', key: 'number', width: 5 },
        { header: 'ИНН', key: 'inn', width: 12 },
        { header: 'НОМЕР КОНТРАГЕНТА', key: 'contractorNumber', width: 18 },
        { header: 'Наименование КОНТРАГЕНТА', key: 'companyName', width: 30 },
        { header: 'НОМЕР И ДАТА ДОГОВОРА', key: 'contractDate', width: 25 },
        { header: 'СУММА ДОГОВОРA', key: 'total', width: 18 },
        { header: 'Договор', key: 'contract', width: 15 },
        { header: 'НОМЕР ЗАКАЗА', key: 'orderNumber', width: 15 },
        { header: 'НОМЕР ПОСТАВКИ', key: 'deliveryNumber', width: 15 },
        { header: 'НОМЕР С/Ф', key: 'invoiceNumber', width: 12 },
        { header: 'ТЕЛ НОМЕР КОНТРАГЕНТА', key: 'phoneNumber', width: 20 },
        { header: 'Примечания', key: 'notes', width: 25 }
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Helper function to convert hex color to ARGB format
      const hexToARGB = (hex: string): string => {
        if (!hex || !hex.startsWith('#')) return 'FFFFFFFF';
        const r = hex.substring(1, 3);
        const g = hex.substring(3, 5);
        const b = hex.substring(5, 7);
        return 'FF' + (r + g + b).toUpperCase();
      };

      // Add data rows with styling
      docs.forEach((doc, index) => {
        const row = worksheet.addRow({
          number: index + 1,
          inn: this.extractINN(doc.requisites),
          contractorNumber: doc.contractorNumber || '-',
          companyName: doc.companyName,
          contractDate: `${doc.contractNumber} от ${this.formatDate(doc.date)}`,
          total: doc.total,
          contract: doc.contract || '-',
          orderNumber: doc.orderNumber || '-',
          deliveryNumber: doc.deliveryNumber || '-',
          invoiceNumber: doc.invoiceNumber || '-',
          phoneNumber: doc.phoneNumber || this.extractPhone(doc.requisites) || '-',
          notes: doc.notes || '-'
        });

        // Get row and notes background colors
        const rowBgColor = doc.rowBgColor || '#ffffff';
        const notesBgColor = doc.notesBgColor || rowBgColor;
        const rowARGB = hexToARGB(rowBgColor);
        const notesARGB = hexToARGB(notesBgColor);

        // Apply row background color to all cells
        row.eachCell((cell: any, colNumber: number) => {
          // Column 12 is Примечания (notes)
          if (colNumber === 12) {
            // Apply notes background color to Примечания column
            if (notesBgColor !== '#ffffff') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: notesARGB }
              };
            }
          } else {
            // Apply row background color to other columns
            if (rowBgColor !== '#ffffff') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: rowARGB }
              };
            }
          }
        });
      });

      // Generate Excel file buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // Generate filename with current date
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `Документы_${dateStr}.xlsx`;

      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      alert(`Ошибка при экспорте в Excel: ${error.message || 'Неизвестная ошибка'}. Пожалуйста, попробуйте ещё раз.`);
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        // Check if ExcelJS is available
        if ((window as any).ExcelJS) {
          resolve();
          return;
        }
        // Wait a bit for the script to initialize
        setTimeout(() => {
          if ((window as any).ExcelJS) {
            resolve();
          } else {
            reject(new Error('Script loaded but ExcelJS not available'));
          }
        }, 500);
        return;
      }

      // Check if ExcelJS is already available
      if ((window as any).ExcelJS) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        // Wait a bit for the script to initialize
        setTimeout(() => {
          if ((window as any).ExcelJS) {
            resolve();
          } else {
            reject(new Error('Script loaded but ExcelJS not available'));
          }
        }, 500);
      };
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }
}

