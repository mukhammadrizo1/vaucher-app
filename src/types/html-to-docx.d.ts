declare module 'html-to-docx' {
  interface HtmlToDocxOptions {
    table?: {
      row?: {
        cantSplit?: boolean;
      };
    };
    footer?: boolean;
    header?: boolean;
    pageNumber?: boolean;
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    orientation?: 'portrait' | 'landscape';
    font?: string;
    fontSize?: number;
  }

  export default function htmlToDocx(
    htmlString: string,
    headerHTMLString: string | null,
    options?: HtmlToDocxOptions,
    footerHTMLString?: string | null
  ): Promise<Buffer>;
}

