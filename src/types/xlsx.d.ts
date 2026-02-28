declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [sheet: string]: WorkSheet };
  }

  export interface WorkSheet {
    [cell: string]: CellObject | any;
  }

  export interface CellObject {
    t?: 'b' | 'n' | 'e' | 's' | 'd' | 'z';
    v?: string | number | boolean | Date;
    w?: string;
    f?: string;
    r?: string;
    h?: string;
    c?: Comment[];
    z?: string;
    l?: Hyperlink;
    s?: any;
  }

  export interface Comment {
    a?: string;
    t?: string;
    h?: number;
    w?: number;
  }

  export interface Hyperlink {
    Target: string;
    Tooltip?: string;
  }

  export interface WritingOptions {
    bookType?: string;
    bookSST?: boolean;
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string';
    cellDates?: boolean;
    cellStyles?: boolean;
    sheet?: string;
    compression?: boolean;
  }

  export interface ParsingOptions {
    type?: 'base64' | 'binary' | 'buffer' | 'file' | 'array' | 'string';
    raw?: boolean;
    codepage?: number;
    cellDates?: boolean;
    cellFormula?: boolean;
    cellHTML?: boolean;
    cellStyles?: boolean;
    cellText?: boolean;
    cellNF?: boolean;
    cellZipped?: boolean;
    dateNF?: string;
    defval?: any;
    sheetStubs?: boolean;
    sheetRows?: number;
    bookDeps?: boolean;
    bookFiles?: boolean;
    bookProps?: boolean;
    bookSheets?: boolean;
    bookVBA?: boolean;
    password?: string;
    WTF?: boolean;
  }

  export function read(data: any, opts?: ParsingOptions): WorkBook;
  export function readFile(filename: string, opts?: ParsingOptions): WorkBook;
  export function write(workbook: WorkBook, opts?: WritingOptions): any;
  export function writeFile(workbook: WorkBook, filename: string, opts?: WritingOptions): void;
  export const utils: {
    sheet_to_json<T = any>(worksheet: WorkSheet, opts?: any): T[];
    json_to_sheet<T = any>(data: T[], opts?: any): WorkSheet;
    book_new(): WorkBook;
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name: string): void;
  };

  const XLSX: {
    read: typeof read;
    readFile: typeof readFile;
    write: typeof write;
    writeFile: typeof writeFile;
    utils: {
      sheet_to_json<T = any>(worksheet: WorkSheet, opts?: any): T[];
      json_to_sheet<T = any>(data: T[], opts?: any): WorkSheet;
      book_new(): WorkBook;
      book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name: string): void;
    };
  };

  export default XLSX;
}

