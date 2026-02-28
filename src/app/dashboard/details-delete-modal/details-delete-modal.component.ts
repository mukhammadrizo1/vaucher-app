import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentDetails } from '../../app';

@Component({
  selector: 'app-details-delete-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details-delete-modal.component.html',
  styleUrl: './details-delete-modal.component.scss'
})
export class DetailsDeleteModalComponent {
  @Input() document: DocumentDetails | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onClose() {
    this.close.emit();
  }
}

