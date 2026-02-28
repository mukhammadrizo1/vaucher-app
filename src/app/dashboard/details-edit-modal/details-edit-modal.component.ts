import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentDetails, TableRowData } from '../../app';

@Component({
  selector: 'app-details-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './details-edit-modal.component.html',
  styleUrl: './details-edit-modal.component.scss'
})
export class DetailsEditModalComponent implements OnInit {
  @Input() document: DocumentDetails | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<DocumentDetails>();

  // Form data
  formData = signal<DocumentDetails>({
    id: '',
    contractNumber: '',
    date: '',
    companyName: '',
    position: '',
    fullName: '',
    documentBasis: '',
    table: [],
    requisites: '',
    total: 0,
    contractorNumber: '',
    orderNumber: '',
    deliveryNumber: '',
    invoiceNumber: '',
    phoneNumber: '',
    contract: '',
    notes: '',
    rowBgColor: '#fafafa',
    notesBgColor: '#ffffff'
  });

  nextRowId = signal(1);

  ngOnInit() {
    if (this.document) {
      this.formData.set({
        ...this.document,
        table: this.document.table.map(row => ({ ...row }))
      });
      const maxId = Math.max(...this.document.table.map(r => r.id), 0);
      this.nextRowId.set(maxId + 1);
    }
  }

  addTableRow() {
    const currentRows = this.formData().table;
    this.formData.update(data => ({
      ...data,
      table: [...currentRows, { id: this.nextRowId(), sum: 0, count: 0 }]
    }));
    this.nextRowId.update(id => id + 1);
    this.updateTotal();
  }

  removeTableRow(id: number) {
    const currentRows = this.formData().table;
    if (currentRows.length > 1) {
      this.formData.update(data => ({
        ...data,
        table: currentRows.filter(row => row.id !== id)
      }));
      this.updateTotal();
    }
  }

  updateRowSum(id: number, value: string) {
    const numValue = parseInt(value) || 0;
    this.formData.update(data => ({
      ...data,
      table: data.table.map(row => 
        row.id === id ? { ...row, sum: numValue } : row
      )
    }));
    this.updateTotal();
  }

  updateRowCount(id: number, value: string) {
    const numValue = parseInt(value) || 0;
    this.formData.update(data => ({
      ...data,
      table: data.table.map(row => 
        row.id === id ? { ...row, count: numValue } : row
      )
    }));
    this.updateTotal();
  }

  updateTotal() {
    const total = this.formData().table.reduce((sum, row) => sum + (row.sum * row.count), 0);
    this.formData.update(data => ({ ...data, total }));
  }

  onSave() {
    this.save.emit(this.formData());
  }

  onClose() {
    this.close.emit();
  }
}

