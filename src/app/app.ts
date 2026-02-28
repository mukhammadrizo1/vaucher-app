import { Component, signal, ElementRef, ViewChild, AfterViewInit, PLATFORM_ID, Inject, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { FirebaseService } from './services/firebase.service';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  PageBreak,
  convertInchesToTwip,
  TableLayoutType,
  HeightRule,
  TabStopType,
  TabStopPosition,
} from 'docx';

export interface TableRowData {
  id: number;
  sum: number;      // Номинал (сумма на карте)
  count: number;    // Количество
}

interface FormData {
  contractNumber: string;
  contractDate: string;
  companyName: string;
  position: string;
  fullName: string;
  documentBasis: string;
  requisites: string;
  tableRows: TableRowData[];
}

export interface DocumentDetails {
  id: string;                  // ID документа (начинается с 001)
  contractNumber: string;      // Номер договора
  date: string;                // Дата
  companyName: string;         // Наименование фирмы
  position: string;            // Должность
  fullName: string;            // Ф.И.О
  documentBasis: string;       // Устав/доверенность
  table: TableRowData[];       // Таблица
  requisites: string;          // Реквизиты
  total: number;               // Итого
  contractorNumber?: string;   // Номер контрагента
  orderNumber?: string;        // Номер заказа
  deliveryNumber?: string;     // Номер поставки
  invoiceNumber?: string;      // Номер С/Ф
  phoneNumber?: string;        // Телефон контрагента
  contract?: string;           // Договор
  notes?: string;              // Примечания
  rowBgColor?: string;         // Цвет фона строк таблицы
  notesBgColor?: string;       // Цвет фона поля Примечания
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  @ViewChild('documentContainer') documentContainer!: ElementRef;

  isEditing = signal(false);
  isGenerating = signal(false);
  isModalOpen = signal(false);
  isConfirmModalOpen = signal(false);
  showSuccessMessage = signal(false);
  showSendSuccessMessage = signal(false);
  showSendErrorMessage = signal(false);
  private isBrowser: boolean;

  // Default values for the document
  private defaultData: FormData = {
    contractNumber: '1001',
    contractDate: this.getTodayDate(),
    companyName: 'АО «КДБ Банк Узбекистан»',
    position: 'директора',
    fullName: 'Парк Жин Сунг',
    documentBasis: 'доверенности №19/21 от 26.07.2021г',
    requisites: `МФО 01921
ИНН 202160184
Р/сч 19909000600000917424
Адрес: 100047, город Ташкент, Мирабадский район, улица Бухара, дом 123.`,
    tableRows: [
      { id: 1, sum: 1000000, count: 250 },
      { id: 2, sum: 500000, count: 16 }
    ]
  };

  // SAVED data - displayed in document (starts with defaults)
  savedContractNumber = signal(this.defaultData.contractNumber);
  savedContractDate = signal(this.defaultData.contractDate);
  savedCompanyName = signal(this.defaultData.companyName);
  savedPosition = signal(this.defaultData.position);
  savedFullName = signal(this.defaultData.fullName);
  savedDocumentBasis = signal(this.defaultData.documentBasis);
  savedRequisites = signal(this.defaultData.requisites);
  savedTableRows = signal<TableRowData[]>([...this.defaultData.tableRows]);

  // FORM data - edited in modal (temporary until saved)
  formContractNumber = signal('');
  formContractDate = signal('');
  formCompanyName = signal('');
  formPosition = signal('');
  formFullName = signal('');
  formDocumentBasis = signal('');
  formRequisites = signal('');
  formTableRows = signal<TableRowData[]>([]);

  private nextRowId = 1;

  // Computed values for SAVED data (displayed in document)
  formattedDate = computed(() => {
    const date = new Date(this.savedContractDate());
    const day = date.getDate();
    const month = this.getMonthNameRussian(date.getMonth());
    const year = date.getFullYear();
    return { day, month, year };
  });

  savedRequisitesLines = computed(() => {
    return this.savedRequisites().split('\n').filter(line => line.trim());
  });

  // Totals for SAVED data (displayed in document)
  savedTotalDeliveryCost = computed(() => {
    return this.savedTableRows().reduce((sum, row) => sum + this.getRowDeliveryCost(row), 0);
  });

  savedTotalVatAmount = computed(() => {
    return this.savedTableRows().reduce((sum, row) => sum + this.getRowVatAmount(row), 0);
  });

  savedTotalWithVat = computed(() => {
    return Math.round(this.savedTableRows().reduce((sum, row) => sum + this.getRowTotalWithVat(row), 0));
  });

  savedTotalWithVatFormatted = computed(() => {
    return this.formatNumber(this.savedTotalWithVat());
  });

  savedTotalWithVatInWords = computed(() => {
    return this.numberToWordsRussian(Math.round(this.savedTotalWithVat()));
  });

  // Totals for FORM data (displayed in modal)
  formTotalDeliveryCost = computed(() => {
    return this.formTableRows().reduce((sum, row) => sum + this.getRowDeliveryCost(row), 0);
  });

  formTotalVatAmount = computed(() => {
    return this.formTableRows().reduce((sum, row) => sum + this.getRowVatAmount(row), 0);
  });

  formTotalWithVat = computed(() => {
    return Math.round(this.formTableRows().reduce((sum, row) => sum + this.getRowTotalWithVat(row), 0));
  });

  formTotalWithVatFormatted = computed(() => {
    return this.formatNumber(this.formTotalWithVat());
  });

  formTotalWithVatInWords = computed(() => {
    return this.numberToWordsRussian(Math.round(this.formTotalWithVat()));
  });

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private firebaseService: FirebaseService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit() {
    // Component initialized
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private getMonthNameRussian(month: number): string {
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return months[month];
  }

  toggleEdit() {
    this.isEditing.update(v => !v);
    if (this.documentContainer) {
      const container = this.documentContainer.nativeElement;
      container.contentEditable = this.isEditing() ? 'true' : 'false';
    }
  }

  openModal() {
    // Copy saved values to form values
    this.formContractNumber.set(this.savedContractNumber());
    this.formContractDate.set(this.savedContractDate());
    this.formCompanyName.set(this.savedCompanyName());
    this.formPosition.set(this.savedPosition());
    this.formFullName.set(this.savedFullName());
    this.formDocumentBasis.set(this.savedDocumentBasis());
    this.formRequisites.set(this.savedRequisites());
    // Deep copy table rows
    this.formTableRows.set(this.savedTableRows().map(row => ({ ...row })));
    this.nextRowId = Math.max(...this.savedTableRows().map(r => r.id), 0) + 1;
    
    this.isModalOpen.set(true);
  }

  closeModal() {
    // Discard changes - just close
    this.isModalOpen.set(false);
  }

  resetForm() {
    // Clear all form values to empty/default
    this.formContractNumber.set('');
    this.formContractDate.set(this.getTodayDate());
    this.formCompanyName.set('');
    this.formPosition.set('');
    this.formFullName.set('');
    this.formDocumentBasis.set('');
    this.formRequisites.set('');
    this.formTableRows.set([{ id: 1, sum: 0, count: 0 }]);
    this.nextRowId = 2;
  }

  saveForm() {
    // Copy form values to saved values
    this.savedContractNumber.set(this.formContractNumber());
    this.savedContractDate.set(this.formContractDate());
    this.savedCompanyName.set(this.formCompanyName());
    this.savedPosition.set(this.formPosition());
    this.savedFullName.set(this.formFullName());
    this.savedDocumentBasis.set(this.formDocumentBasis());
    this.savedRequisites.set(this.formRequisites());
    // Deep copy table rows
    this.savedTableRows.set(this.formTableRows().map(row => ({ ...row })));
    
    this.closeModal();
    
    // Show success message
    this.showSuccessMessage.set(true);
    setTimeout(() => {
      this.showSuccessMessage.set(false);
    }, 3000);
  }

  // Calculate table row values based on Excel formulas:
  // Цена = Total / (1 + VAT rate) / Count = sum / 1.12
  getRowPrice(row: TableRowData): number {
    if (row.count === 0) return 0;
    return row.sum / 1.12;
  }

  // Стоимость поставки = Цена * Count
  getRowDeliveryCost(row: TableRowData): number {
    return this.getRowPrice(row) * row.count;
  }

  // Сумма (НДС) = Стоимость поставки * VAT rate
  getRowVatAmount(row: TableRowData): number {
    return this.getRowDeliveryCost(row) * 0.12;
  }

  // Стоимость поставки с учётом НДС = Стоимость поставки + НДС
  getRowTotalWithVat(row: TableRowData): number {
    return this.getRowDeliveryCost(row) + this.getRowVatAmount(row);
  }

  // Table row management for FORM
  addTableRow() {
    const currentRows = this.formTableRows();
    this.formTableRows.set([...currentRows, { id: this.nextRowId++, sum: 0, count: 0 }]);
  }

  removeTableRow(id: number) {
    const currentRows = this.formTableRows();
    if (currentRows.length > 1) {
      this.formTableRows.set(currentRows.filter(row => row.id !== id));
    }
  }

  updateRowSum(id: number, value: string) {
    const numValue = parseInt(value) || 0;
    const currentRows = this.formTableRows();
    this.formTableRows.set(currentRows.map(row => 
      row.id === id ? { ...row, sum: numValue } : row
    ));
  }

  updateRowCount(id: number, value: string) {
    const numValue = parseInt(value) || 0;
    const currentRows = this.formTableRows();
    this.formTableRows.set(currentRows.map(row => 
      row.id === id ? { ...row, count: numValue } : row
    ));
  }

  // Format number with spaces (for integers like count)
  formatNumber(num: number): string {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // Format money with 2 decimal places (Russian format: space for thousands, comma for decimals)
  formatMoney(num: number): string {
    const fixed = num.toFixed(2);
    const parts = fixed.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return integerPart + ',' + parts[1];
  }

  // Convert number to Russian words
  numberToWordsRussian(num: number): string {
    if (num === 0) return 'Ноль';

    const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

    const getThousandWord = (n: number): string => {
      if (n === 1) return 'тысяча';
      if (n >= 2 && n <= 4) return 'тысячи';
      return 'тысяч';
    };

    const getMillionWord = (n: number): string => {
      if (n === 1) return 'миллион';
      if (n >= 2 && n <= 4) return 'миллиона';
      return 'миллионов';
    };

    const getBillionWord = (n: number): string => {
      if (n === 1) return 'миллиард';
      if (n >= 2 && n <= 4) return 'миллиарда';
      return 'миллиардов';
    };

    const convertHundreds = (n: number, isFeminine: boolean = false): string => {
      if (n === 0) return '';

      let result = '';

      const h = Math.floor(n / 100);
      const remainder = n % 100;
      const t = Math.floor(remainder / 10);
      const u = remainder % 10;

      if (h > 0) result += hundreds[h] + ' ';

      if (remainder >= 10 && remainder < 20) {
        result += teens[remainder - 10] + ' ';
      } else {
        if (t > 0) result += tens[t] + ' ';
        if (u > 0) {
          if (isFeminine && u === 1) {
            result += 'одна ';
          } else if (isFeminine && u === 2) {
            result += 'две ';
          } else {
            result += units[u] + ' ';
          }
        }
      }

      return result.trim();
    };

    let result = '';

    // Billions
    const billions = Math.floor(num / 1000000000);
    if (billions > 0) {
      result += convertHundreds(billions) + ' ' + getBillionWord(billions % 10 === 0 ? 5 : billions % 10) + ' ';
      num %= 1000000000;
    }

    // Millions
    const millions = Math.floor(num / 1000000);
    if (millions > 0) {
      const lastDigit = millions % 10;
      const lastTwoDigits = millions % 100;
      result += convertHundreds(millions) + ' ' + getMillionWord(lastTwoDigits >= 11 && lastTwoDigits <= 19 ? 5 : lastDigit) + ' ';
      num %= 1000000;
    }

    // Thousands
    const thousands = Math.floor(num / 1000);
    if (thousands > 0) {
      const lastDigit = thousands % 10;
      const lastTwoDigits = thousands % 100;
      result += convertHundreds(thousands, true) + ' ' + getThousandWord(lastTwoDigits >= 11 && lastTwoDigits <= 19 ? 5 : lastDigit) + ' ';
      num %= 1000;
    }

    // Remainder
    if (num > 0) {
      result += convertHundreds(num);
    }

    result = result.trim();
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  getDownloadFilename(extension: string): string {
    const companyName = this.savedCompanyName().replace(/[<>:"/\\|?*]/g, '');
    const contractNumber = this.savedContractNumber();
    const date = new Date(this.savedContractDate());
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}.${month}.${year}`;
    
    return `Договор ${companyName} ${contractNumber} ${dateStr}.${extension}`;
  }

  async downloadPdf() {
    if (!this.isBrowser) return;
    
    this.isGenerating.set(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = this.documentContainer.nativeElement;
      
      const opt = {
        margin: 0,
        filename: this.getDownloadFilename('pdf'),
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async downloadDocx() {
    if (!this.isBrowser) return;
    
    this.isGenerating.set(true);
    try {
      const doc = this.createDocxDocument();
      const blob = await Packer.toBlob(doc);
      saveAs(blob, this.getDownloadFilename('docx'));
    } catch (error) {
      console.error('Error generating DOCX:', error);
      alert('Ошибка при создании документа. Пожалуйста, попробуйте ещё раз.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  sendDetails() {
    if (!this.isBrowser) return;
    this.isConfirmModalOpen.set(true);
  }

  closeConfirmModal() {
    this.isConfirmModalOpen.set(false);
  }

  openEditModalFromConfirm() {
    this.isConfirmModalOpen.set(false);
    this.openModal();
  }

  async confirmSendDetails() {
    if (!this.isBrowser) return;
    
    this.isConfirmModalOpen.set(false);
    this.isGenerating.set(true);
    try {
      // Get existing documents to determine next ID
      const existingDocs = await this.firebaseService.getDocumentDetails();

      // Find the highest ID and generate next one starting from "001"
      let nextIdNumber = 1;
      if (existingDocs.length > 0) {
        const ids = existingDocs
          .map((doc: DocumentDetails) => doc.id)
          .filter((id: string) => id && /^\d+$/.test(id))
          .map((id: string) => parseInt(id, 10));
        
        if (ids.length > 0) {
          const maxId = Math.max(...ids);
          nextIdNumber = maxId + 1;
        }
      }

      // Format ID as 3-digit string (001, 002, etc.)
      const nextId = nextIdNumber.toString().padStart(3, '0');

      // Collect all required data
      const documentDetails: DocumentDetails = {
        id: nextId,                                      // ID документа
        contractNumber: this.savedContractNumber(),      // Номер договора
        date: this.savedContractDate(),                   // Дата
        companyName: this.savedCompanyName(),            // Наименование фирмы
        position: this.savedPosition(),                  // Должность
        fullName: this.savedFullName(),                  // Ф.И.О
        documentBasis: this.savedDocumentBasis(),        // Устав/доверенность
        table: [...this.savedTableRows()],               // Таблица
        requisites: this.savedRequisites(),              // Реквизиты
        total: this.savedTotalWithVat()                  // Итого
      };

      // Save to Firebase Realtime Database
      await this.firebaseService.saveDocumentDetails(documentDetails);
      console.log('Document details saved successfully');

      // Show success notification
      this.showSendSuccessMessage.set(true);
      setTimeout(() => {
        this.showSendSuccessMessage.set(false);
      }, 3000);
    } catch (error) {
      console.error('Error sending details:', error);
      // Show error notification
      this.showSendErrorMessage.set(true);
      setTimeout(() => {
        this.showSendErrorMessage.set(false);
      }, 5000);
    } finally {
      this.isGenerating.set(false);
    }
  }

  private createDocxDocument(): Document {
    const tableRows = this.savedTableRows();
    const date = this.formattedDate();
    
    // Page width calculation: A4 = 8.27 inches, margins: left 0.8", right 0.4"
    // A4 width = 11909 twips, left margin = 1152 twips, right margin = 576 twips
    // Available width adjusted: 10609 twips, reduced by 3% to avoid overflow
    const PAGE_WIDTH = Math.round(10609 * 0.97); // ~10291 twips
    
    // Border style
    const solidBorder = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
    const noBorder = { style: BorderStyle.NIL, size: 0, color: 'FFFFFF' };
    const allBorders = { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder };
    const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

    // Helper to create text run
    const text = (content: string, bold = false, size = 20, italics = false) => 
      new TextRun({ text: content, bold, size, italics, font: 'Times New Roman' });

    // Helper to create paragraph
    const para = (runs: TextRun[], alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT, spacing = 240) =>
      new Paragraph({ children: runs, alignment, spacing: { after: spacing, line: 276 } });

    // Helper to create table cell with borders
    const cell = (content: Paragraph[], options: {
      columnSpan?: number;
      rowSpan?: number;
      borders?: typeof allBorders | typeof noBorders;
      verticalAlign?: typeof VerticalAlign[keyof typeof VerticalAlign];
    } = {}) => new TableCell({
      children: content,
      columnSpan: options.columnSpan,
      rowSpan: options.rowSpan,
      borders: options.borders || allBorders,
      verticalAlign: options.verticalAlign || VerticalAlign.CENTER,
    });

    // Data table column widths (9 columns) - based on A4 image proportions
    // Total must equal PAGE_WIDTH (10609 twips)
    // Proportions: 22.9:13.9:4.9:5.9:10.9:13.9:4.9:14:12.9 = 104.2 parts
    const COL_WIDTHS = [
      2331,  // Col 1: Наименование Продукции (22.9%)
      1415,  // Col 2: Идент. код (13.9%)
      499,   // Col 3: Ед. изм (4.9%)
      601,   // Col 4: Кол-во (5.9%)
      1110,  // Col 5: Цена (10.9%) - nowrap
      1415,  // Col 6: Стоимость поставки (13.9%) - nowrap
      499,   // Col 7: Ставка % (4.9%)
      1425,  // Col 8: Сумма НДС (14%) - nowrap
      1314,  // Col 9: Стоимость с НДС (12.9%) - nowrap
    ]; // Total: 10609 twips = PAGE_WIDTH

    // Helper for nowrap paragraph (keeps text on single line)
    const nowrapPara = (runs: TextRun[], alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.CENTER) =>
      new Paragraph({ children: runs, alignment, spacing: { after: 0, line: 276 }, keepLines: true });

    const createDataTable = (): Table => {
      // Header row 1
      const headerRow1 = new TableRow({
        children: [
          cell([para([text('Наименование Продукции', true, 18)], AlignmentType.CENTER, 0)], { rowSpan: 2 }),
          cell([para([text('Идентификационный код и название по Единому электронному национальному каталогу товаров (услуг)', true, 18)], AlignmentType.CENTER, 0)], { rowSpan: 2 }),
          cell([para([text('Ед. изм', true, 18)], AlignmentType.CENTER, 0)], { rowSpan: 2 }),
          cell([para([text('Кол-во', true, 18)], AlignmentType.CENTER, 0)], { rowSpan: 2 }),
          cell([para([text('Цена', true, 18)], AlignmentType.CENTER, 0)], { rowSpan: 2 }),
          cell([para([text('Стоимость поставки', true, 18)], AlignmentType.CENTER, 0)], { rowSpan: 2 }),
          cell([para([text('НДС', true, 18)], AlignmentType.CENTER, 0)], { columnSpan: 2 }),
          cell([para([text('Стоимость поставки с учётом НДС', true, 18)], AlignmentType.CENTER, 0)], { rowSpan: 2 }),
        ],
      });

      // Header row 2 (only НДС subheaders)
      const headerRow2 = new TableRow({
        children: [
          cell([para([text('Ставка %', true, 18)], AlignmentType.CENTER, 0)]),
          cell([para([text('Сумма', true, 18)], AlignmentType.CENTER, 0)]),
        ],
      });

      // Data rows - use nowrapPara for Цена, Стоимость поставки, Сумма, Стоимость с НДС
      const dataRows = tableRows.map(row => new TableRow({
        children: [
          cell([para([text(`Подарочная карта korzinka.uz на предъявителя номиналом ${this.formatNumber(row.sum)} сум`, false, 18)], AlignmentType.CENTER, 0)]),
          cell([para([text('09800001005000000 - Подарочная карта, ваучер', false, 18)], AlignmentType.CENTER, 0)]),
          cell([para([text('шт.', false, 18)], AlignmentType.CENTER, 0)]),
          cell([para([text(row.count.toString(), false, 18)], AlignmentType.CENTER, 0)]),
          cell([nowrapPara([text(this.formatMoney(this.getRowPrice(row)), false, 18)])]),
          cell([nowrapPara([text(this.formatMoney(this.getRowDeliveryCost(row)), false, 18)])]),
          cell([para([text('12', false, 18)], AlignmentType.CENTER, 0)]),
          cell([nowrapPara([text(this.formatMoney(this.getRowVatAmount(row)), false, 18)])]),
          cell([nowrapPara([text(this.formatNumber(this.getRowTotalWithVat(row)), false, 18)])]),
        ],
      }));

      // Totals row - use nowrapPara for numeric columns
      const totalsRow = new TableRow({
        children: [
          cell([para([text('Итого:', true, 18)], AlignmentType.RIGHT, 0)], { columnSpan: 5 }),
          cell([nowrapPara([text(this.formatMoney(this.savedTotalDeliveryCost()), false, 18)])]),
          cell([para([text('12', false, 18)], AlignmentType.CENTER, 0)]),
          cell([nowrapPara([text(this.formatMoney(this.savedTotalVatAmount()), false, 18)])]),
          cell([nowrapPara([text(this.savedTotalWithVatFormatted(), false, 18)])]),
        ],
      });

      // Total in words row
      const totalWordsRow = new TableRow({
        children: [
          cell([para([text(`Итого: ${this.savedTotalWithVatFormatted()} (${this.savedTotalWithVatInWords()}) сум с учетом НДС.`, true, 18)], AlignmentType.LEFT, 0)], { columnSpan: 9 }),
        ],
      });

      return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: COL_WIDTHS,
        layout: TableLayoutType.FIXED,
        rows: [headerRow1, headerRow2, ...dataRows, totalsRow, totalWordsRow],
      });
    };

    // City/Date - two column table: city on left (20%), date on right (80%) right-aligned
    const cityDateColWidths = [Math.round(PAGE_WIDTH * 0.2), Math.round(PAGE_WIDTH * 0.8)];
    const createCityDateTable = (city: string, dateStr: string) => new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: cityDateColWidths,
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        children: [
          new TableCell({
            children: [para([text(city)], AlignmentType.LEFT, 0)],
            borders: noBorders,
            width: { size: cityDateColWidths[0], type: WidthType.DXA },
          }),
          new TableCell({
            children: [para([text(dateStr)], AlignmentType.RIGHT, 0)],
            borders: noBorders,
            width: { size: cityDateColWidths[1], type: WidthType.DXA },
          }),
        ],
      })],
    });

    // Requisites table with borders - 2 columns, content aligned to top
    const HALF_WIDTH = Math.round(PAGE_WIDTH / 2);
    const createRequisitesTable = () => new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: [HALF_WIDTH, HALF_WIDTH],
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            cell([
              para([text('«Продавец»:', true)], AlignmentType.CENTER, 0),
              para([text('ИП ООО «Anglesey Food»', true)], AlignmentType.CENTER, 0),
              para([text('Адрес: г. Ташкент, ул. Тураб-Тула 57')], AlignmentType.LEFT, 0),
              para([text('ИНН: 202099756')], AlignmentType.LEFT, 0),
              para([text('Р/с: 20208000300578902046')], AlignmentType.LEFT, 0),
              para([text('Банк: Академический Центр банковских услуг АО «Узнацбанк»')], AlignmentType.LEFT, 0),
              para([text('МФО: 00450')], AlignmentType.LEFT, 0),
              para([text('ОКЭД: 47110')], AlignmentType.LEFT, 0),
              para([text('Эл. почта: info@korzinka.uz')], AlignmentType.LEFT, 0),
              para([text('Тел.: 71-231-83-02')], AlignmentType.LEFT, 0),
              para([text('')], AlignmentType.LEFT, 0),
            ], { verticalAlign: VerticalAlign.TOP }),
            cell([
              para([text('«Покупатель»:', true)], AlignmentType.CENTER, 0),
              para([text(this.savedCompanyName(), true)], AlignmentType.CENTER, 0),
              para([text('')], AlignmentType.LEFT, 0),
              ...this.savedRequisitesLines().map(line => para([text(line)], AlignmentType.LEFT, 0)),
            ], { verticalAlign: VerticalAlign.TOP }),
          ],
        }),
        new TableRow({
          children: [
            cell([
              para([text('')], AlignmentType.LEFT, 0),
              para([text('________________________')], AlignmentType.LEFT, 0),
              para([text('М.П.')], AlignmentType.LEFT, 0),
              para([text('')], AlignmentType.LEFT, 0),
            ], { verticalAlign: VerticalAlign.TOP }),
            cell([
              para([text('')], AlignmentType.LEFT, 0),
              para([text('___________________________')], AlignmentType.LEFT, 0),
              para([text('М.П.')], AlignmentType.LEFT, 0),
            ], { verticalAlign: VerticalAlign.TOP }),
          ],
        }),
      ],
    });

    // Signatures table with borders - Передал/Принял and company names CENTER aligned
    const createSignaturesTable = () => new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      columnWidths: [HALF_WIDTH, HALF_WIDTH],
      layout: TableLayoutType.FIXED,
      rows: [new TableRow({
        children: [
          cell([
            para([text('Передал:', true)], AlignmentType.CENTER, 0),
            para([text('')], AlignmentType.CENTER, 0),
            para([text('ИП ООО «Anglesey Food»', true)], AlignmentType.CENTER, 0),
            para([text('')], AlignmentType.LEFT, 0),
            para([text('_________________')], AlignmentType.LEFT, 0),
            para([text('(Шакирходжаев Ф.)', false, 18)], AlignmentType.LEFT, 0),
            para([text('')], AlignmentType.LEFT, 0),
            para([text('М.П.', false, 18)], AlignmentType.LEFT, 0),
          ], { verticalAlign: VerticalAlign.TOP }),
          cell([
            para([text('Принял:', true)], AlignmentType.CENTER, 0),
            para([text('')], AlignmentType.CENTER, 0),
            para([text(this.savedCompanyName(), true)], AlignmentType.CENTER, 0),
            para([text('')], AlignmentType.LEFT, 0),
            para([text('_________________')], AlignmentType.LEFT, 0),
            para([text(`(${this.savedFullName()})`, false, 18)], AlignmentType.LEFT, 0),
            para([text('')], AlignmentType.LEFT, 0),
            para([text('М.П.', false, 18)], AlignmentType.LEFT, 0),
          ], { verticalAlign: VerticalAlign.TOP }),
        ],
      })],
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.5),
              bottom: convertInchesToTwip(0.4),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.4),
            },
          },
        },
        children: [
          // Title
          para([text(`ДОГОВОР КУПЛИ-ПРОДАЖИ ПОДАРОЧНЫХ КАРТ № ${this.savedContractNumber()}`, true, 22)], AlignmentType.CENTER),
          
          // City and Date
          createCityDateTable('г. Ташкент', `«${date.day}» ${date.month} ${date.year} г.`),

          // Empty line after date
          para([text('')]),

          // Intro paragraph
          new Paragraph({
            children: [
              text(this.savedCompanyName() + ',', true),
              text(` именуемый в дальнейшем Покупатель, в лице ${this.savedPosition()} `),
              text(this.savedFullName(), true),
              text(`, действующего на основании ${this.savedDocumentBasis()}, с одной стороны, и `),
              text('ИП ООО ANGLESEY FOOD', true),
              text(', именуемый в дальнейшем «Продавец», в лице Руководителя отдела Korzinka-Biznes Шакирходжаев Ф., действующего на основании доверенности №045B от 04.11.2025г., с другой стороны, совместно именуемые Стороны, а по-отдельности «Сторона», заключили настоящий договор (далее – «Договор») о нижеследующем:'),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 276 },
          }),

          // Section 1
          para([text('1. Понятия, используемые в настоящем договоре:', true, 22)], AlignmentType.CENTER),
          // Hanging indent: left margin 63.8pt = 1276 twips, negative text-indent -63.8pt = hanging 1276 twips
          new Paragraph({ children: [text('А. Подарочная карта от Сети супермаркетов Корзинка (далее – «Подарочная карта») ', false, 20, true), text('– это документ, удостоверяющий право его предъявителя приобрести у Продавца товары на сумму, равную номинальной стоимости подарочной карты.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('B. Товары - ', false, 20, true), text('товары народного потребления, реализуемые Продавцом в сети супермаркетов Корзинка.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('C. Номинальная стоимость (номинал) подарочной карты ', false, 20, true), text('– сумма, указанная на Подарочной карте, на которую предъявитель вправе приобрести товар.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('D. Место приобретения Товара – ', false, 20, true), text('сеть супермаркетов Корзинка, расположенных на территории Республики Узбекистан, за исключением супермаркетов, расположенных по адресам: Республика Каракалпакстан, город Нукус, улица Ерназар Алакуз, дом 162 и Кашкадарьинская обла., г. Шахрисабз, улица Мафтункор, дом 35.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('E. Предъявитель – ', false, 20, true), text('физическое лицо, правомерно владеющее и распоряжающееся Подарочной картой в результате получения такой Подарочной карты от Покупателя, обладающее правом приобретения Товара в розницу для личного, семейного и иного использования, не связанного с предпринимательской деятельностью, в Месте приобретения Товара в обмен на списанные Продавцом средства с предъявленной Подарочной карты на сумму, установленную и не превышающую Номинала Подарочной карты.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('F. Срок предъявления Подарочной карты – ', false, 20, true), text('период времени, установленный до 31.12.2026 года включительно, в течение которого Предъявитель имеет право на получение товара на сумму, эквивалентную сумме средств, указанных и имеющихся в Подарочной карте.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),

          // Section 2
          para([text('2. Предмет договора.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('2.1. В соответствии с настоящим Договором Продавец обязуется передать Покупателю Подарочные карты, подтверждающие право Предъявителя на приобретение Товара в Месте приобретения Товара, а Покупатель обязуется принять и произвести оплату их стоимости в соответствии с условиями настоящего Договора.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('2.2. Продавец передает Покупателю следующие Подарочные карты:')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Main data table
          createDataTable(),

          new Paragraph({ children: [text('2.3. Подарочные карты могут быть представлены Предъявителем к оплате за приобретаемые товары в течение срока их предъявления в Месте приобретения Товара.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('2.4. Не использованные и/или недоиспользованные подарочные карты с истекшими к предъявлению сроками, возврату и/или обмену не подлежат, и денежная компенсация их стоимости (в т.ч. средств, оставшихся на картах) не производится.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('2.5. В случае утери Покупателем (в т.ч. Предъявителем) подарочной карты, подарочная карта восстановлению не подлежит. Передача товара по поврежденным подарочным картам, или в подлинности, которых у Продавца возникли сомнения, не осуществляется.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Section 3
          para([text('3. Сумма договора и порядок расчётов.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text(`Общая сумма настоящего договора составляет: `), text(`${this.savedTotalWithVatFormatted()} (${this.savedTotalWithVatInWords()}) сум`, true), text(' с учетом НДС. Покупатель обязуется оплатить Подарочные карты путем 100% предоплаты. Сумма предварительной оплаты подлежит оплате Покупателем на расчетный счет Продавца в течение 10 (десяти) банковских дней с даты заключения сторонами настоящего Договора.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Section 4
          para([text('4. Срок действия договора.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('Настоящий Договор вступает в силу с момента его подписания и действует до полного исполнения Сторонами своих обязательств и завершения всех взаиморасчетов по настоящему Договору.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Section 5
          para([text('5. Передача подарочных карт.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('5.1. Подарочные карты будут предоставлены Покупателю в течение 10 (десяти) банковских дней с момента поступления суммы предоплаты на расчетный счет Продавца.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.2. Покупатель самостоятельно забирает подарочные карты с офиса Продавца (самовывоз), после получения уведомления Продавца о готовности товара к отгрузке, с указанием даты, времени и места отгрузки, направленного не позднее 3 (трёх) календарных дней до окончания срока поставки. Представитель Покупателя при получении подарочных карт должен предъявить документ, удостоверяющий личность, и правильно оформленную доверенность в соответствии с действующим законодательством Республики Узбекистан.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.3. Принятие подарочных карт Покупателем подтверждается подписанием Акта приема-передачи (Приложение № 1).')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.4. Право собственности на подарочные карты, а также риск случайной гибели или повреждения подарочных карт переходят от Продавца к Покупателю с даты подписания Акта приема-передачи (Приложение № 1).')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.5. В случаях утраты, кражи, порчи подарочной карты, не позволяющих её идентифицировать, такая подарочная карта не восстанавливается, не обменивается на новую, денежные средства, равные номинальной стоимости подарочной карты, возврату Предъявителю (в т.ч. Покупателю) не подлежат.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.6. В течение срока действия Подарочные карты могут предъявляться к оплате многократно, до тех пор, пока номинал подарочной карты не будет истрачен полностью.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Section 6
          para([text('6. Права и обязанности сторон.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('6.1. Продавец обязан:', true)], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('* Передать Покупателю подарочные карты, указанные в п. 2.2. настоящего Договора, в установленные настоящим договором сроки. Факт передачи Подарочных карт подтверждается подписанием Сторонами акта приема-передачи Подарочных карт, который составляется по Форме согласно Приложению № 1, являющемся неотъемлемой частью настоящего Договора.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('* Принимать к оплате подарочные карты во всех Местах приобретения товара, в течение всего срока их предъявления.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('* По истечении срока на предъявление Подарочной карты, Продавец вправе отказать Предъявителю (в т.ч. Покупателю) в покупке Товаров посредством Подарочной карты. При этом денежные средства, равные номинальной стоимости подарочной карты, возврату и/или компенсации Предъявителю (в т.ч. Покупателю) не подлежат.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('* В случае выявления подарочных карт ненадлежащего качества в момент приема-передачи подарочных карт от Продавца к Покупателю, за свой счет и своими силами заменить подарочные карты ненадлежащего качества в течение 3 (трёх) банковских дней.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('6.2. Продавец имеет право:', true)], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('* Требовать своевременной оплаты за предоставленные Покупателю подарочные карты.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('* По истечении 5 (пяти) календарных дней после приема-передачи подарочных карт от Продавца к Покупателю, Продавец вправе не рассматривать претензии со стороны Покупателя относительно количества, качества и номинальной стоимости переданных подарочных карт.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('6.3. Покупатель обязан:', true)], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('* Оплатить и принять от Продавца подарочные карты в соответствии с условиями настоящего Договора.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('* Подписать и передать Продавцу в обмен на переданные Покупателю Подарочные карты Акт приема-передачи Подарочных карт, составляемый по форме, установленной настоящим Договором (Приложение № 1).')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('* При принятии Подарочных карт от Продавца согласно условиям настоящего Договора, осуществить проверку и приемку Подарочных карт по количеству, качеству и номинальной стоимости. По истечении 5 (пяти) календарных дней после приемки товара претензии по количеству, качеству и номинальной стоимости Подарочных карт Продавцом не принимаются.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('6.4. Покупатель имеет право требовать своевременного выполнения обязательств по настоящему Договору.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Section 7
          para([text('7. Ответственность сторон.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('В случае неисполнения или ненадлежащего исполнения иных обязательств, предусмотренных настоящим Договором, Стороны несут ответственность в соответствии с действующим законодательством Республики Узбекистан.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Section 8
          para([text('8. Порядок разрешения споров.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('8.1. Споры, возникающие между сторонами, решаются путем переговоров между сторонами. Подтверждением проведения переговоров является направленное претензионное письмо, оформленное в соответствии с действующим законодательством Республики Узбекистан. Стороны устанавливают предварительный претензионный порядок разрешения споров. Срок ответа на претензию составляет 19 (девятнадцать) календарных дней с даты направления претензии Стороной. В случае отсутствия ответа на претензионное письмо со стороны получателя, это является достаточным основанием для признания отсутствия заинтересованности в проведении переговоров.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('8.2. В случае возникновения разногласий все вопросы решаются путем двусторонних переговоров, а при невозможности прийти к согласию - в Ташкентском межрайонном экономическом суде. Предсудебная процедура обязательна.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Section 9 - Anti-corruption clause
          para([text('9. Антикоррупционная оговорка', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('9.1. Стороны соблюдают все применимые нормы антикоррупционного законодательства. Стороны признают и подтверждают, что каждая из них проводит политику полной нетерпимости к взяточничеству и коррупции, предполагающую полный запрет коррупционных действий и совершения выплат за содействие / выплат, целью которых является упрощение формальностей в связи с хозяйственной деятельностью, обеспечение более быстрого решения тех или иных вопросов. Стороны, их аффилированные лица, работники, а также посредники и представители, которые прямо или косвенно участвуют в исполнении обязательств Сторонами (в том числе агенты, комиссионеры, таможенные брокеры и иные третьи лица) не принимают, не выплачивают, не предлагают выплатить и не разрешают (санкционируют) выплату/получение каких-либо денежных средств или передачу каких-либо ценностей (в том числе нематериальных) прямо или косвенно, любым лицам, с целью оказания влияния на действия или решения с намерением получить какие-либо неправомерные преимущества, в том числе в обход установленного законодательством порядка, или преследующие иные неправомерные цели. Положения настоящего пункта являются заверениями об обстоятельствах, имеющими для Сторон существенное значение. Стороны полагаются на такие заверения при заключении Договора.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('9.2. В случае нарушения одной из Сторон обязательств по соблюдению требований, предусмотренных настоящим пунктом, Сторона вправе немедленно отказаться от Договора в одностороннем внесудебном порядке, направив письменное уведомление о расторжении. Договор считается расторгнутым по истечении 10 (десяти) календарных дней с даты получения другой Стороной соответствующего письменного уведомления.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('9.3. В случае возникновения у Стороны подозрений, что произошло или может произойти нарушение каких-либо положений настоящего пункта, соответствующая Сторона обязуется как можно скорее уведомить другую Сторону о своих подозрениях в письменной форме. Стороны соглашаются, что будут использовать следующие адреса для уведомления о нарушении/угрозе нарушения настоящего пункта: Адрес электронной почты ИП ООО «Anglesey Food»: compliance@korzinka.uz. Адрес электронной почты ' + this.savedCompanyName() + ': ___________________')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Section 10 - Other conditions
          para([text('10. Прочие условия', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('10.1. Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств по настоящему Договору, если неисполнение является следствием обстоятельств, которые обе Стороны не могли предотвратить разумными мерами. К обстоятельствам непреодолимой силы относятся события, на которые обе стороны не могут оказать влияния и за возникновение которых не несут ответственности: как, например, наводнение, землетрясение, пожар, аварии, другие стихийные бедствия, а также забастовки, правительственные постановления или распоряжения государственных органов.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('10.2. Стороны гарантируют обеспечение конфиденциальности в отношении информации, передаваемой друг другу.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('10.3. Уступка прав требований по Договору допускается только после получения письменного согласия другой стороны.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('10.4. Стороны гарантируют друг другу, что на дату подписания настоящего договора нет каких-либо запретов или ограничений, препятствующих исполнению настоящего Договора.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('10.5. Любые изменения и дополнения к настоящему договору имеют силу только в том случае, если они оформлены в письменном виде и подписаны обеими Сторонами. В случае изменения Налогового Кодекса Республики Узбекистан, с учетом изменений будет составлено дополнительное соглашение.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('10.6. Настоящий договор может быть расторгнут досрочно, по обоюдному письменному согласию сторон, а также по иным основаниям, предусмотренным действующим законодательством Республики Узбекистан. Сторона, решившая расторгнуть настоящий Договор, должна направить письменное уведомление не позднее 20 (двадцати) банковских дней до предполагаемой даты расторжения.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('10.7. Покупатель настоящим заявляет, что он прочитал, понял и будет соблюдать Кодекс поведения для бизнес-партнеров ИП ООО «Anglesey Food», размещенный на официальном сайте ИП ООО «Anglesey Food» по ссылке https://korzinka.uz/page/business-partners-code, за исключением случаев, когда Покупатель утверждает и заверяет, что его политика, внутренние правила и процедуры подразумевают и обеспечивают более высокие стандарты добросовестности, прозрачности и защиты социальной и экологической среды.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('10.8. Покупатель уведомлен о возможности осуществления связи для соблюдения требований, предоставленных ИП ООО Anglesey Food. В случае возникновения серьезных жалоб и вопросов, связанных с этическим поведением сотрудников ИП ООО Anglesey Food (например, подозрения в коррупции, мошенничестве, домогательствах и т.д.), Покупателю следует обращаться непосредственно на электронную почту: compliance@korzinka.uz. Все сообщенные случаи будут рассмотрены в соответствии с внутренними нормативными актами и применимым законодательством Республики Узбекистан.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('10.9. Порядок использования подарочных карт указан на подарочных картах.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('10.10. Во всем, что не предусмотрено настоящим Договором, Стороны руководствуются законодательством Республики Узбекистан.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),

          // Section 11 - Requisites
          para([text('АДРЕСА И ИНЫЕ РЕКВИЗИТЫ СТОРОН.', true, 20)], AlignmentType.CENTER),
          createRequisitesTable(),

          // Page break before Appendix
          new Paragraph({ children: [new PageBreak()] }),

          // Appendix 1
          para([text('Приложение №1', true, 22)], AlignmentType.RIGHT),
          new Paragraph({ children: [text(`к Договору купли-продажи №${this.savedContractNumber()}`, true)], alignment: AlignmentType.RIGHT, spacing: { line: 276 } }),
          new Paragraph({ children: [text(`от «${date.day}» ${date.month} ${date.year} г.`, true)], alignment: AlignmentType.RIGHT, spacing: { line: 276 } }),
          para([text('АКТ', true, 22)], AlignmentType.CENTER, 0),
          para([text('приема-передачи Подарочных карт', true, 22)], AlignmentType.CENTER, 0),
          createCityDateTable('г. Ташкент', '«___» ___________ 2026 г.'),

          // Empty line after date
          para([text('')]),

          // First-line indent: 35.4pt = 708 twips
          new Paragraph({
            children: [
              text(this.savedCompanyName() + ', ', true),
              text(`именуемый в дальнейшем Покупатель, в лице ${this.savedPosition()} `),
              text(this.savedFullName(), true),
              text(`, действующего на основании ${this.savedDocumentBasis()}, с одной стороны, и `),
              text('ИП ООО ANGLESEY FOOD', true),
              text(', именуемый в дальнейшем «Продавец», в лице Руководителя отдела Korzinka-Biznes Шакирходжаев Ф., действующего на основании доверенности №045B от 04.11.2025г., с другой стороны, совместно именуемые Стороны, а по-отдельности «Сторона», заключили настоящий Акт о нижеследующем:'),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 276 },
            indent: { firstLine: 708 },
          }),
          para([text('')]),

          new Paragraph({
            children: [
              text('1. ', true),
              text(`В соответствии с Договором купли-продажи `),
              text(`№ ${this.savedContractNumber()} от «${date.day}» ${date.month} ${date.year} г.`, true),
              text(' (далее – «Договор») Продавец передал, а Покупатель принял следующие Подарочные карты:'),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 276 },
            indent: { firstLine: 708 },
          }),
          para([text('')]),

          // Second data table
          createDataTable(),
          para([text('')]),

          new Paragraph({ children: [text('2. ', true), text('Подарочные карты соответствуют требованиям, предъявляемым к качеству и количеству, установленным в Договоре. Претензий у сторон по исполнению условий Договора не имеется.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { firstLine: 708 } }),
          new Paragraph({ children: [text('3. ', true), text('Настоящий Акт составлен в 2 (двух) экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { firstLine: 708 } }),
          para([text('')]),

          // Signatures
          createSignaturesTable(),
        ],
      }],
    });

    return doc;
  }
}

