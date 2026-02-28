import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { saveAs } from 'file-saver';
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
} from 'docx';
import { DocumentDetails, TableRowData } from '../app';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  formatNumber(num: number): string {
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  formatMoney(num: number): string {
    const fixed = num.toFixed(2);
    const parts = fixed.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return integerPart + ',' + parts[1];
  }

  getRowPrice(row: TableRowData): number {
    if (row.count === 0) return 0;
    return row.sum / 1.12;
  }

  getRowDeliveryCost(row: TableRowData): number {
    return this.getRowPrice(row) * row.count;
  }

  getRowVatAmount(row: TableRowData): number {
    return this.getRowDeliveryCost(row) * 0.12;
  }

  getRowTotalWithVat(row: TableRowData): number {
    return this.getRowDeliveryCost(row) + this.getRowVatAmount(row);
  }

  getTotalWithVat(tableRows: TableRowData[]): number {
    return Math.round(tableRows.reduce((sum, row) => sum + this.getRowTotalWithVat(row), 0));
  }

  getTotalDeliveryCost(tableRows: TableRowData[]): number {
    return tableRows.reduce((sum, row) => sum + this.getRowDeliveryCost(row), 0);
  }

  getTotalVatAmount(tableRows: TableRowData[]): number {
    return tableRows.reduce((sum, row) => sum + this.getRowVatAmount(row), 0);
  }

  formatDate(dateString: string): { day: number; month: string; year: number } {
    const date = new Date(dateString);
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    return {
      day: date.getDate(),
      month: months[date.getMonth()],
      year: date.getFullYear()
    };
  }

  getDownloadFilename(extension: string, doc: DocumentDetails): string {
    const companyName = (doc.companyName || '').replace(/[<>:"/\\|?*]/g, '');
    const contractNumber = doc.contractNumber || 'unknown';
    const date = new Date(doc.date);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}.${month}.${year}`;
    
    return `Договор ${companyName} ${contractNumber} ${dateStr}.${extension}`;
  }

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
    const billions = Math.floor(num / 1000000000);
    if (billions > 0) {
      result += convertHundreds(billions) + ' ' + getBillionWord(billions % 10 === 0 ? 5 : billions % 10) + ' ';
      num %= 1000000000;
    }

    const millions = Math.floor(num / 1000000);
    if (millions > 0) {
      const lastDigit = millions % 10;
      const lastTwoDigits = millions % 100;
      result += convertHundreds(millions) + ' ' + getMillionWord(lastTwoDigits >= 11 && lastTwoDigits <= 19 ? 5 : lastDigit) + ' ';
      num %= 1000000;
    }

    const thousands = Math.floor(num / 1000);
    if (thousands > 0) {
      const lastDigit = thousands % 10;
      const lastTwoDigits = thousands % 100;
      result += convertHundreds(thousands, true) + ' ' + getThousandWord(lastTwoDigits >= 11 && lastTwoDigits <= 19 ? 5 : lastDigit) + ' ';
      num %= 1000;
    }

    if (num > 0) {
      result += convertHundreds(num);
    }

    result = result.trim();
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  generateContractHTML(doc: DocumentDetails): string {
    const date = this.formatDate(doc.date);
    const totalWithVat = this.getTotalWithVat(doc.table);
    const totalDeliveryCost = this.getTotalDeliveryCost(doc.table);
    const totalVatAmount = this.getTotalVatAmount(doc.table);
    const totalInWords = this.numberToWordsRussian(totalWithVat);
    const requisitesLines = doc.requisites.split('\n').filter(line => line.trim());

    const tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11pt;">
        <thead>
          <tr>
            <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">Наименование Продукции</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">Идентификационный код и название по Единому электронному национальному каталогу товаров (услуг)</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">Ед. изм</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">Кол-во</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">Цена</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">Стоимость поставки</th>
            <th colspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">НДС</th>
            <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">Стоимость поставки с учётом НДС</th>
          </tr>
          <tr>
            <th style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">Ставка %</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center; background: #f0f0f0;">Сумма</th>
          </tr>
        </thead>
        <tbody>
          ${doc.table.map((row, i) => `
            <tr>
              <td style="border: 1px solid #000; padding: 8px;">Подарочная карта korzinka.uz на предъявителя номиналом ${this.formatNumber(row.sum)} сум</td>
              <td style="border: 1px solid #000; padding: 8px;">09800001005000000 - Подарочная карта, ваучер</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">шт.</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">${row.count}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${this.formatMoney(this.getRowPrice(row))}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${this.formatMoney(this.getRowDeliveryCost(row))}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center;">12</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${this.formatMoney(this.getRowVatAmount(row))}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${this.formatNumber(this.getRowTotalWithVat(row))}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">Итого:</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${this.formatMoney(totalDeliveryCost)}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">12</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${this.formatMoney(totalVatAmount)}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${this.formatNumber(totalWithVat)}</td>
          </tr>
          <tr>
            <td colspan="9" style="border: 1px solid #000; padding: 8px; font-weight: bold;">Итого: ${this.formatNumber(totalWithVat)} (${totalInWords}) сум с учетом НДС.</td>
          </tr>
        </tfoot>
      </table>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 20mm 15mm 15mm 20mm;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            margin: 0;
            padding: 0;
          }
          .contract-title {
            text-align: center;
            font-weight: bold;
            font-size: 14pt;
            margin: 20px 0;
          }
          .city-date {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
          }
          .section-title {
            text-align: center;
            font-weight: bold;
            font-size: 13pt;
            margin: 20px 0 10px 0;
          }
          p {
            text-align: justify;
            margin: 10px 0;
            text-indent: 0;
          }
          .hanging-indent {
            margin-left: 25mm;
            text-indent: -10mm;
            text-align: justify;
          }
          .requisites-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .requisites-table td {
            border: 1px solid #000;
            padding: 8px;
            vertical-align: top;
            width: 50%;
          }
          .signatures-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .signatures-table td {
            border: 1px solid #000;
            padding: 8px;
            vertical-align: top;
            width: 50%;
          }
          .page-break {
            page-break-before: always;
          }
        </style>
      </head>
      <body>
        <div class="contract-title">ДОГОВОР КУПЛИ-ПРОДАЖИ ПОДАРОЧНЫХ КАРТ № ${doc.contractNumber}</div>
        
        <div class="city-date">
          <span>г. Ташкент</span>
          <span>«${date.day}» ${date.month} ${date.year} г.</span>
        </div>

        <p><strong>${doc.companyName}</strong>, именуемый в дальнейшем Покупатель, в лице <strong>${doc.position}</strong> <strong>${doc.fullName}</strong>, действующего на основании ${doc.documentBasis}, с одной стороны, и <strong>ИП ООО ANGLESEY FOOD</strong>, именуемый в дальнейшем «Продавец», в лице Руководителя отдела Korzinka-Biznes Шакирходжаев Ф., действующего на основании доверенности №045B от 04.11.2025г., с другой стороны, совместно именуемые Стороны, а по-отдельности «Сторона», заключили настоящий договор (далее – «Договор») о нижеследующем:</p>

        <div class="section-title">1. Понятия, используемые в настоящем договоре:</div>
        <p class="hanging-indent"><strong>А. Подарочная карта от Сети супермаркетов Корзинка (далее – «Подарочная карта»)</strong> – это документ, удостоверяющий право его предъявителя приобрести у Продавца товары на сумму, равную номинальной стоимости подарочной карты.</p>
        <p class="hanging-indent"><strong>B. Товары -</strong> товары народного потребления, реализуемые Продавцом в сети супермаркетов Корзинка.</p>
        <p class="hanging-indent"><strong>C. Номинальная стоимость (номинал) подарочной карты</strong> – сумма, указанная на Подарочной карте, на которую предъявитель вправе приобрести товар.</p>
        <p class="hanging-indent"><strong>D. Место приобретения Товара –</strong> сеть супермаркетов Корзинка, расположенных на территории Республики Узбекистан, за исключением супермаркетов, расположенных по адресам: Республика Каракалпакстан, город Нукус, улица Ерназар Алакуз, дом 162 и Кашкадарьинская обла., г. Шахрисабз, улица Мафтункор, дом 35.</p>
        <p class="hanging-indent"><strong>E. Предъявитель –</strong> физическое лицо, правомерно владеющее и распоряжающееся Подарочной картой в результате получения такой Подарочной карты от Покупателя, обладающее правом приобретения Товара в розницу для личного, семейного и иного использования, не связанного с предпринимательской деятельностью, в Месте приобретения Товара в обмен на списанные Продавцом средства с предъявленной Подарочной карты на сумму, установленную и не превышающую Номинала Подарочной карты.</p>
        <p class="hanging-indent"><strong>F. Срок предъявления Подарочной карты –</strong> период времени, установленный до 31.12.2026 года включительно, в течение которого Предъявитель имеет право на получение товара на сумму, эквивалентную сумме средств, указанных и имеющихся в Подарочной карте.</p>

        <div class="section-title">2. Предмет договора.</div>
        <p>2.1. В соответствии с настоящим Договором Продавец обязуется передать Покупателю Подарочные карты, подтверждающие право Предъявителя на приобретение Товара в Месте приобретения Товара, а Покупатель обязуется принять и произвести оплату их стоимости в соответствии с условиями настоящего Договора.</p>
        <p>2.2. Продавец передает Покупателю следующие Подарочные карты:</p>
        
        ${tableHTML}

        <p>2.3. Подарочные карты могут быть представлены Предъявителем к оплате за приобретаемые товары в течение срока их предъявления в Месте приобретения Товара.</p>
        <p>2.4. Не использованные и/или недоиспользованные подарочные карты с истекшими к предъявлению сроками, возврату и/или обмену не подлежат, и денежная компенсация их стоимости (в т.ч. средств, оставшихся на картах) не производится.</p>
        <p>2.5. В случае утери Покупателем (в т.ч. Предъявителем) подарочной карты, подарочная карта восстановлению не подлежит. Передача товара по поврежденным подарочным картам, или в подлинности, которых у Продавца возникли сомнения, не осуществляется.</p>

        <div class="section-title">3. Сумма договора и порядок расчётов.</div>
        <p>Общая сумма настоящего договора составляет: <strong>${this.formatNumber(totalWithVat)} (${totalInWords}) сум</strong> с учетом НДС. Покупатель обязуется оплатить Подарочные карты путем 100% предоплаты. Сумма предварительной оплаты подлежит оплате Покупателем на расчетный счет Продавца в течение 10 (десяти) банковских дней с даты заключения сторонами настоящего Договора.</p>

        <div class="section-title">4. Срок действия договора.</div>
        <p>Настоящий Договор вступает в силу с момента его подписания и действует до полного исполнения Сторонами своих обязательств и завершения всех взаиморасчетов по настоящему Договору.</p>

        <div class="section-title">5. Передача подарочных карт.</div>
        <p>5.1. Подарочные карты будут предоставлены Покупателю в течение 10 (десяти) банковских дней с момента поступления суммы предоплаты на расчетный счет Продавца.</p>
        <p>5.2. Покупатель самостоятельно забирает подарочные карты с офиса Продавца (самовывоз), после получения уведомления Продавца о готовности товара к отгрузке, с указанием даты, времени и места отгрузки, направленного не позднее 3 (трёх) календарных дней до окончания срока поставки. Представитель Покупателя при получении подарочных карт должен предъявить документ, удостоверяющий личность, и правильно оформленную доверенность в соответствии с действующим законодательством Республики Узбекистан.</p>
        <p>5.3. Принятие подарочных карт Покупателем подтверждается подписанием Акта приема-передачи (Приложение № 1).</p>
        <p>5.4. Право собственности на подарочные карты, а также риск случайной гибели или повреждения подарочных карт переходят от Продавца к Покупателю с даты подписания Акта приема-передачи (Приложение № 1).</p>
        <p>5.5. В случаях утраты, кражи, порчи подарочной карты, не позволяющих её идентифицировать, такая подарочная карта не восстанавливается, не обменивается на новую, денежные средства, равные номинальной стоимости подарочной карты, возврату Предъявителю (в т.ч. Покупателю) не подлежат.</p>
        <p>5.6. В течение срока действия Подарочные карты могут предъявляться к оплате многократно, до тех пор, пока номинал подарочной карты не будет истрачен полностью.</p>

        <div class="section-title">6. Права и обязанности сторон.</div>
        <p><strong>6.1. Продавец обязан:</strong></p>
        <p>* Передать Покупателю подарочные карты, указанные в п. 2.2. настоящего Договора, в установленные настоящим договором сроки. Факт передачи Подарочных карт подтверждается подписанием Сторонами акта приема-передачи Подарочных карт, который составляется по Форме согласно Приложению № 1, являющемся неотъемлемой частью настоящего Договора.</p>
        <p>* Принимать к оплате подарочные карты во всех Местах приобретения товара, в течение всего срока их предъявления.</p>
        <p>* По истечении срока на предъявление Подарочной карты, Продавец вправе отказать Предъявителю (в т.ч. Покупателю) в покупке Товаров посредством Подарочной карты. При этом денежные средства, равные номинальной стоимости подарочной карты, возврату и/или компенсации Предъявителю (в т.ч. Покупателю) не подлежат.</p>
        <p>* В случае выявления подарочных карт ненадлежащего качества в момент приема-передачи подарочных карт от Продавца к Покупателю, за свой счет и своими силами заменить подарочные карты ненадлежащего качества в течение 3 (трёх) банковских дней.</p>
        <p><strong>6.2. Продавец имеет право:</strong></p>
        <p>* Требовать своевременной оплаты за предоставленные Покупателю подарочные карты.</p>
        <p>* По истечении 5 (пяти) календарных дней после приема-передачи подарочных карт от Продавца к Покупателю, Продавец вправе не рассматривать претензии со стороны Покупателя относительно количества, качества и номинальной стоимости переданных подарочных карт.</p>
        <p><strong>6.3. Покупатель обязан:</strong></p>
        <p>* Оплатить и принять от Продавца подарочные карты в соответствии с условиями настоящего Договора.</p>
        <p>* Подписать и передать Продавцу в обмен на переданные Покупателю Подарочные карты Акт приема-передачи Подарочных карт, составляемый по форме, установленной настоящим Договором (Приложение № 1).</p>
        <p>* При принятии Подарочных карт от Продавца согласно условиям настоящего Договора, осуществить проверку и приемку Подарочных карт по количеству, качеству и номинальной стоимости. По истечении 5 (пяти) календарных дней после приемки товара претензии по количеству, качеству и номинальной стоимости Подарочных карт Продавцом не принимаются.</p>
        <p><strong>6.4. Покупатель имеет право требовать своевременного выполнения обязательств по настоящему Договору.</strong></p>

        <div class="section-title">7. Ответственность сторон.</div>
        <p>В случае неисполнения или ненадлежащего исполнения иных обязательств, предусмотренных настоящим Договором, Стороны несут ответственность в соответствии с действующим законодательством Республики Узбекистан.</p>

        <div class="section-title">8. Порядок разрешения споров.</div>
        <p>8.1. Споры, возникающие между сторонами, решаются путем переговоров между сторонами. Подтверждением проведения переговоров является направленное претензионное письмо, оформленное в соответствии с действующим законодательством Республики Узбекистан. Стороны устанавливают предварительный претензионный порядок разрешения споров. Срок ответа на претензию составляет 19 (девятнадцать) календарных дней с даты направления претензии Стороной. В случае отсутствия ответа на претензионное письмо со стороны получателя, это является достаточным основанием для признания отсутствия заинтересованности в проведении переговоров.</p>
        <p>8.2. В случае возникновения разногласий все вопросы решаются путем двусторонних переговоров, а при невозможности прийти к согласию - в Ташкентском межрайонном экономическом суде. Предсудебная процедура обязательна.</p>

        <div class="section-title">9. Антикоррупционная оговорка</div>
        <p>9.1. Стороны соблюдают все применимые нормы антикоррупционного законодательства. Стороны признают и подтверждают, что каждая из них проводит политику полной нетерпимости к взяточничеству и коррупции, предполагающую полный запрет коррупционных действий и совершения выплат за содействие / выплат, целью которых является упрощение формальностей в связи с хозяйственной деятельностью, обеспечение более быстрого решения тех или иных вопросов. Стороны, их аффилированные лица, работники, а также посредники и представители, которые прямо или косвенно участвуют в исполнении обязательств Сторонами (в том числе агенты, комиссионеры, таможенные брокеры и иные третьи лица) не принимают, не выплачивают, не предлагают выплатить и не разрешают (санкционируют) выплату/получение каких-либо денежных средств или передачу каких-либо ценностей (в том числе нематериальных) прямо или косвенно, любым лицам, с целью оказания влияния на действия или решения с намерением получить какие-либо неправомерные преимущества, в том числе в обход установленного законодательством порядка, или преследующие иные неправомерные цели. Положения настоящего пункта являются заверениями об обстоятельствах, имеющими для Сторон существенное значение. Стороны полагаются на такие заверения при заключении Договора.</p>
        <p>9.2. В случае нарушения одной из Сторон обязательств по соблюдению требований, предусмотренных настоящим пунктом, Сторона вправе немедленно отказаться от Договора в одностороннем внесудебном порядке, направив письменное уведомление о расторжении. Договор считается расторгнутым по истечении 10 (десяти) календарных дней с даты получения другой Стороной соответствующего письменного уведомления.</p>
        <p>9.3. В случае возникновения у Стороны подозрений, что произошло или может произойти нарушение каких-либо положений настоящего пункта, соответствующая Сторона обязуется как можно скорее уведомить другую Сторону о своих подозрениях в письменной форме. Стороны соглашаются, что будут использовать следующие адреса для уведомления о нарушении/угрозе нарушения настоящего пункта: Адрес электронной почты ИП ООО «Anglesey Food»: compliance@korzinka.uz. Адрес электронной почты ${doc.companyName}: ___________________</p>

        <div class="section-title">10. Прочие условия</div>
        <p>10.1. Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств по настоящему Договору, если неисполнение является следствием обстоятельств, которые обе Стороны не могли предотвратить разумными мерами. К обстоятельствам непреодолимой силы относятся события, на которые обе стороны не могут оказать влияния и за возникновение которых не несут ответственности: как, например, наводнение, землетрясение, пожар, аварии, другие стихийные бедствия, а также забастовки, правительственные постановления или распоряжения государственных органов.</p>
        <p>10.2. Стороны гарантируют обеспечение конфиденциальности в отношении информации, передаваемой друг другу.</p>
        <p>10.3. Уступка прав требований по Договору допускается только после получения письменного согласия другой стороны.</p>
        <p>10.4. Стороны гарантируют друг другу, что на дату подписания настоящего договора нет каких-либо запретов или ограничений, препятствующих исполнению настоящего Договора.</p>
        <p>10.5. Любые изменения и дополнения к настоящему договору имеют силу только в том случае, если они оформлены в письменном виде и подписаны обеими Сторонами. В случае изменения Налогового Кодекса Республики Узбекистан, с учетом изменений будет составлено дополнительное соглашение.</p>
        <p>10.6. Настоящий договор может быть расторгнут досрочно, по обоюдному письменному согласию сторон, а также по иным основаниям, предусмотренным действующим законодательством Республики Узбекистан. Сторона, решившая расторгнуть настоящий Договор, должна направить письменное уведомление не позднее 20 (двадцати) банковских дней до предполагаемой даты расторжения.</p>
        <p>10.7. Покупатель настоящим заявляет, что он прочитал, понял и будет соблюдать Кодекс поведения для бизнес-партнеров ИП ООО «Anglesey Food», размещенный на официальном сайте ИП ООО «Anglesey Food» по ссылке https://korzinka.uz/page/business-partners-code, за исключением случаев, когда Покупатель утверждает и заверяет, что его политика, внутренние правила и процедуры подразумевают и обеспечивают более высокие стандарты добросовестности, прозрачности и защиты социальной и экологической среды.</p>
        <p>10.8. Покупатель уведомлен о возможности осуществления связи для соблюдения требований, предоставленных ИП ООО Anglesey Food. В случае возникновения серьезных жалоб и вопросов, связанных с этическим поведением сотрудников ИП ООО Anglesey Food (например, подозрения в коррупции, мошенничестве, домогательствах и т.д.), Покупателю следует обращаться непосредственно на электронную почту: compliance@korzinka.uz. Все сообщенные случаи будут рассмотрены в соответствии с внутренними нормативными актами и применимым законодательством Республики Узбекистан.</p>
        <p>10.9. Порядок использования подарочных карт указан на подарочных картах.</p>
        <p>10.10. Во всем, что не предусмотрено настоящим Договором, Стороны руководствуются законодательством Республики Узбекистан.</p>

        <div class="section-title">АДРЕСА И ИНЫЕ РЕКВИЗИТЫ СТОРОН.</div>
        <table class="requisites-table">
          <tr>
            <td>
              <p style="text-align: center; font-weight: bold;">«Продавец»:</p>
              <p style="text-align: center; font-weight: bold;">ИП ООО «Anglesey Food»</p>
              <p>Адрес: г. Ташкент, ул. Тураб-Тула 57</p>
              <p>ИНН: 202099756</p>
              <p>Р/с: 20208000300578902046</p>
              <p>Банк: Академический Центр банковских услуг АО «Узнацбанк»</p>
              <p>МФО: 00450</p>
              <p>ОКЭД: 47110</p>
              <p>Эл. почта: info@korzinka.uz</p>
              <p>Тел.: 71-231-83-02</p>
            </td>
            <td>
              <p style="text-align: center; font-weight: bold;">«Покупатель»:</p>
              <p style="text-align: center; font-weight: bold;">${doc.companyName}</p>
              ${requisitesLines.map(line => `<p>${line}</p>`).join('')}
            </td>
          </tr>
          <tr>
            <td>
              <p></p>
              <p>________________________</p>
              <p>М.П.</p>
            </td>
            <td>
              <p></p>
              <p>___________________________</p>
              <p>М.П.</p>
            </td>
          </tr>
        </table>

        <div class="page-break"></div>

        <div style="text-align: right; margin: 20px 0;">
          <p style="font-weight: bold; font-size: 13pt;">Приложение №1</p>
          <p style="font-weight: bold;">к Договору купли-продажи №${doc.contractNumber}</p>
          <p style="font-weight: bold;">от «${date.day}» ${date.month} ${date.year} г.</p>
        </div>

        <div class="contract-title">АКТ</div>
        <div class="contract-title">приема-передачи Подарочных карт</div>

        <div class="city-date">
          <span>г. Ташкент</span>
          <span>«___» ___________ 2026 г.</span>
        </div>

        <p style="text-indent: 15mm;"><strong>${doc.companyName}</strong>, именуемый в дальнейшем Покупатель, в лице <strong>${doc.position}</strong> <strong>${doc.fullName}</strong>, действующего на основании ${doc.documentBasis}, с одной стороны, и <strong>ИП ООО ANGLESEY FOOD</strong>, именуемый в дальнейшем «Продавец», в лице Руководителя отдела Korzinka-Biznes Шакирходжаев Ф., действующего на основании доверенности №045B от 04.11.2025г., с другой стороны, совместно именуемые Стороны, а по-отдельности «Сторона», заключили настоящий Акт о нижеследующем:</p>

        <p style="text-indent: 15mm;"><strong>1.</strong> В соответствии с Договором купли-продажи <strong>№ ${doc.contractNumber} от «${date.day}» ${date.month} ${date.year} г.</strong> (далее – «Договор») Продавец передал, а Покупатель принял следующие Подарочные карты:</p>

        ${tableHTML}

        <p style="text-indent: 15mm;"><strong>2.</strong> Подарочные карты соответствуют требованиям, предъявляемым к качеству и количеству, установленным в Договоре. Претензий у сторон по исполнению условий Договора не имеется.</p>
        <p style="text-indent: 15mm;"><strong>3.</strong> Настоящий Акт составлен в 2 (двух) экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.</p>

        <table class="signatures-table">
          <tr>
            <td>
              <p style="text-align: center; font-weight: bold;">Передал:</p>
              <p></p>
              <p style="text-align: center; font-weight: bold;">ИП ООО «Anglesey Food»</p>
              <p></p>
              <p>_________________</p>
              <p>(Шакирходжаев Ф.)</p>
              <p></p>
              <p>М.П.</p>
            </td>
            <td>
              <p style="text-align: center; font-weight: bold;">Принял:</p>
              <p></p>
              <p style="text-align: center; font-weight: bold;">${doc.companyName}</p>
              <p></p>
              <p>_________________</p>
              <p>(${doc.fullName})</p>
              <p></p>
              <p>М.П.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  async downloadPdf(doc: DocumentDetails): Promise<void> {
    if (!this.isBrowser) return;
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Generate HTML content matching app.html structure exactly
      const htmlContent = this.generateAppTemplateHTML(doc);
      
      // Create wrapper structure matching app.html exactly
      const wrapper = document.createElement('div');
      wrapper.className = 'document-wrapper';
      wrapper.style.cssText = 'display: flex; justify-content: center; padding: 30px 20px; overflow-x: auto; min-height: calc(100vh - 100px); position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -9999; opacity: 0; pointer-events: none;';
      
      const scaler = document.createElement('div');
      scaler.className = 'document-scaler';
      scaler.style.cssText = 'transform-origin: top center; transition: transform 0.2s ease;';
      
      const container = document.createElement('div');
      container.className = 'WordSection1';
      container.style.cssText = 'background: white; width: 595.3pt; min-height: 841.9pt; margin: 0 auto; padding: 0.5in 0.8in 28.35pt 0.8in; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); box-sizing: border-box; word-wrap: break-word;';
      
      container.innerHTML = htmlContent;
      
      scaler.appendChild(container);
      wrapper.appendChild(scaler);
      document.body.appendChild(wrapper);

      // Wait for content to render and fonts to load
      await new Promise(resolve => setTimeout(resolve, 500));

      const opt = {
        margin: 0,
        filename: this.getDownloadFilename('pdf', doc),
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

      await html2pdf().set(opt).from(container).save();
      
      // Clean up
      setTimeout(() => {
        if (wrapper.parentNode) {
          document.body.removeChild(wrapper);
        }
      }, 1000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Ошибка при создании PDF. Пожалуйста, попробуйте ещё раз.');
    }
  }

  private generateAppTemplateHTML(doc: DocumentDetails): string {
    const date = this.formatDate(doc.date);
    const totalWithVat = this.getTotalWithVat(doc.table);
    const totalDeliveryCost = this.getTotalDeliveryCost(doc.table);
    const totalVatAmount = this.getTotalVatAmount(doc.table);
    const totalInWords = this.numberToWordsRussian(totalWithVat);
    const requisitesLines = doc.requisites.split('\n').filter(line => line.trim());

    // Generate table rows HTML matching app.html structure exactly
    const tableRowsHTML = doc.table.map(row => `
      <tr style="page-break-inside: avoid">
        <td width="161" style="width: 120.5pt; border: solid windowtext 1pt; border-top: none; padding: 0 3pt">
          <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
            <span lang="UZ-CYR" style="font-size: 8pt; color: black">Подарочная карта korzinka.uz на предъявителя номиналом ${this.formatNumber(row.sum)} сум</span>
          </p>
        </td>
        <td width="113" style="width: 85.05pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
          <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
            <span lang="RU" style="font-size: 8pt; color: black">09800001005000000 - Подарочная карта, ваучер</span>
          </p>
        </td>
        <td width="38" style="width: 28.35pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
          <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
            <span lang="RU" style="font-size: 8pt; color: black">шт.</span>
          </p>
        </td>
        <td width="47" style="width: 35.45pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
          <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
            <span lang="RU" style="font-size: 8pt; color: black">${row.count}</span>
          </p>
        </td>
        <td width="76" style="width: 56.7pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
          <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
            <span lang="RU" style="font-size: 8pt; color: black; white-space: nowrap">${this.formatMoney(this.getRowPrice(row))}</span>
          </p>
        </td>
        <td width="95" style="width: 70.9pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
          <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
            <span lang="RU" style="font-size: 8pt; color: black; white-space: nowrap">${this.formatMoney(this.getRowDeliveryCost(row))}</span>
          </p>
        </td>
        <td width="28" style="width: 21.25pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
          <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
            <span lang="RU" style="font-size: 8pt; color: black">12</span>
          </p>
        </td>
        <td width="85" style="width: 63.8pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
          <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
            <span lang="RU" style="font-size: 8pt; color: black; white-space: nowrap">${this.formatMoney(this.getRowVatAmount(row))}</span>
          </p>
        </td>
        <td width="94" style="width: 70.85pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
          <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
            <span lang="UZ-CYR" style="font-size: 8pt; color: black; white-space: nowrap">${this.formatNumber(this.getRowTotalWithVat(row))}</span>
          </p>
        </td>
      </tr>
    `).join('');

    // Generate complete HTML matching app.html structure
    // This is a simplified version - you may need to add all sections
    return `
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">ДОГОВОР КУПЛИ-ПРОДАЖИ ПОДАРОЧНЫХ КАРТ №</span></b>
        <span lang="RU"> </span>
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif; background: transparent">${doc.contractNumber}</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt; margin: 0;">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">&nbsp;</span></b>
      </p>
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse">
        <tr>
          <td style="text-align: left">
            <span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">г. Ташкент</span>
          </td>
          <td style="text-align: right">
            <span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">«${date.day}» ${date.month} ${date.year} г.</span>
          </td>
        </tr>
      </table>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt; margin: 0;">
        <span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">&nbsp;</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <b><span lang="RU" style="font-family: 'Times New Roman', serif; background: transparent">${doc.companyName},</span></b>
        <span lang="RU" style="font-family: 'Times New Roman', serif"> именуемый в дальнейшем Покупатель, в лице <span style="background: transparent">${doc.position} <b>${doc.fullName}</b></span>, действующего на основании <span style="background: transparent">${doc.documentBasis}</span>, с одной стороны, и <b>ИП ООО ANGLESEY FOOD</b>, именуемый в дальнейшем «Продавец», в лице Руководителя отдела Korzinka-Biznes Шакирходжаев Ф., действующего на основании доверенности №045B от 04.11.2025г., с другой стороны, совместно именуемые Стороны, а по-отдельности «Сторона», заключили настоящий договор (далее – «Договор») о нижеследующем:</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt; margin: 0;">
        <span lang="RU" style="font-family: 'Times New Roman', serif">&nbsp;</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">1. Понятия, используемые в настоящем договоре:</span></b>
      </p>
      <p class="MsoPlainText" style="margin-left: 63.8pt; text-align: justify; text-indent: -63.8pt; line-height: 12pt; margin-top: 0; margin-bottom: 0;">
        <i><span lang="RU" style="font-family: 'Times New Roman', serif">&nbsp;</span></i>
      </p>
      <p class="MsoPlainText" style="margin-left: 63.8pt; text-align: justify; text-indent: -63.8pt; line-height: 12pt">
        <i><span lang="RU" style="font-family: 'Times New Roman', serif">А. Подарочная карта от Сети супермаркетов Корзинка (далее – «Подарочная карта»)</span></i>
        <span lang="RU" style="font-family: 'Times New Roman', serif">– это документ, удостоверяющий право его предъявителя приобрести у Продавца товары на сумму, равную номинальной стоимости подарочной карты.</span>
      </p>
      <p class="MsoPlainText" style="margin-left: 63.8pt; text-align: justify; text-indent: -63.8pt; line-height: 12pt">
        <i><span style="font-family: 'Times New Roman', serif">B</span></i>
        <i><span lang="RU" style="font-family: 'Times New Roman', serif">. Товары -</span></i>
        <span lang="RU" style="font-family: 'Times New Roman', serif"> товары народного потребления, реализуемые Продавцом в сети супермаркетов Корзинка.</span>
      </p>
      <p class="MsoPlainText" style="margin-left: 63.8pt; text-align: justify; text-indent: -63.8pt; line-height: 12pt">
        <i><span style="font-family: 'Times New Roman', serif">C</span></i>
        <i><span lang="RU" style="font-family: 'Times New Roman', serif">. Номинальная стоимость (номинал) подарочной карты</span></i>
        <span lang="RU" style="font-family: 'Times New Roman', serif">– сумма, указанная на Подарочной карте, на которую предъявитель вправе приобрести товар.</span>
      </p>
      <p class="MsoPlainText" style="margin-left: 63.8pt; text-align: justify; text-indent: -63.8pt; line-height: 12pt">
        <i><span style="font-family: 'Times New Roman', serif">D</span></i>
        <i><span lang="RU" style="font-family: 'Times New Roman', serif">. Место приобретения Товара –</span></i>
        <span lang="RU" style="font-family: 'Times New Roman', serif"> сеть супермаркетов Корзинка, расположенных на территории Республики Узбекистан, за исключением супермаркетов, расположенных по адресам: Республика Каракалпакстан, город Нукус, улица Ерназар Алакуз, дом 162 и Кашкадарьинская обла., г. Шахрисабз, улица Мафтункор, дом 35.</span>
      </p>
      <p class="MsoPlainText" style="margin-left: 63.8pt; text-align: justify; text-indent: -63.8pt; line-height: 12pt">
        <i><span style="font-family: 'Times New Roman', serif">E</span></i>
        <i><span lang="RU" style="font-family: 'Times New Roman', serif">. Предъявитель – </span></i>
        <span lang="RU" style="font-family: 'Times New Roman', serif">физическое лицо, правомерно владеющее и распоряжающееся Подарочной картой в результате получения такой Подарочной карты от Покупателя, обладающее правом приобретения Товара в розницу для личного, семейного и иного использования, не связанного с предпринимательской деятельностью, в Месте приобретения Товара в обмен на списанные Продавцом средства с предъявленной Подарочной карты на сумму, установленную и не превышающую Номинала Подарочной карты.</span>
      </p>
      <p class="MsoPlainText" style="margin-left: 63.8pt; text-align: justify; text-indent: -63.8pt; line-height: 12pt">
        <i><span style="font-family: 'Times New Roman', serif">F</span></i>
        <i><span lang="RU" style="font-family: 'Times New Roman', serif">. Срок предъявления Подарочной карты –</span></i>
        <span lang="RU" style="font-family: 'Times New Roman', serif"> период времени, установленный до 31.12.2026 года включительно, в течение которого Предъявитель имеет право на получение товара на сумму, эквивалентную сумме средств, указанных и имеющихся в Подарочной карте.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt; margin: 0;">
        <span lang="RU" style="font-family: 'Times New Roman', serif">&nbsp;</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">2. Предмет договора.</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">2.1. В соответствии с настоящим Договором Продавец обязуется передать Покупателю Подарочные карты, подтверждающие право Предъявителя на приобретение Товара в Месте приобретения Товара, а Покупатель обязуется принять и произвести оплату их стоимости в соответствии с условиями настоящего Договора.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">2.2. Продавец передает Покупателю следующие Подарочные карты:</span>
      </p>
      <table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" width="737" style="margin-left: -35.7pt; border-collapse: collapse">
        <tbody>
          <tr style="page-break-inside: avoid">
            <td width="161" rowspan="2" style="width: 120.5pt; border: solid windowtext 1pt; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Наименование Продукции</span></b>
              </p>
            </td>
            <td width="113" rowspan="2" style="width: 85.05pt; border: solid windowtext 1pt; border-left: none; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Идентификацион<br />ный код и<br />название по<br />Единому<br />электронному<br />национальному<br />каталогу товаров<br />(услуг)</span></b>
              </p>
            </td>
            <td width="38" rowspan="2" style="width: 28.35pt; border: solid windowtext 1pt; border-left: none; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Ед. изм</span></b>
              </p>
            </td>
            <td width="47" rowspan="2" style="width: 35.45pt; border: solid windowtext 1pt; border-left: none; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Кол-во</span></b>
              </p>
            </td>
            <td width="76" rowspan="2" style="width: 56.7pt; border: solid windowtext 1pt; border-left: none; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Цена</span></b>
              </p>
            </td>
            <td width="95" rowspan="2" style="width: 70.9pt; border: solid windowtext 1pt; border-left: none; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Стоимость<br />поставки</span></b>
              </p>
            </td>
            <td width="113" colspan="2" style="width: 85.05pt; border: solid windowtext 1pt; border-left: none; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">НДС</span></b>
              </p>
            </td>
            <td width="94" rowspan="2" style="width: 70.85pt; border: solid windowtext 1pt; border-left: none; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Стоимость<br />поставки с<br />учётом НДС</span></b>
              </p>
            </td>
          </tr>
          <tr>
            <td width="28" style="width: 21.25pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">С<br />та<br />вк<br />а<br />%</span></b>
              </p>
            </td>
            <td width="85" style="width: 63.8pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Сумма</span></b>
              </p>
            </td>
          </tr>
          ${tableRowsHTML}
          <tr style="page-break-inside: avoid">
            <td width="435" colspan="5" style="width: 326.05pt; border: solid windowtext 1pt; border-top: none; padding: 0 3pt">
              <p class="MsoNormal" align="right" style="text-align: right; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Итого:</span></b>
              </p>
            </td>
            <td width="95" style="width: 70.9pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <span lang="RU" style="font-size: 8pt; color: black; white-space: nowrap">${this.formatMoney(totalDeliveryCost)}</span>
              </p>
            </td>
            <td width="28" style="width: 21.25pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <span lang="RU" style="font-size: 8pt; color: black">12</span>
              </p>
            </td>
            <td width="85" style="width: 63.8pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <span lang="RU" style="font-size: 8pt; color: black; white-space: nowrap">${this.formatMoney(totalVatAmount)}</span>
              </p>
            </td>
            <td width="94" style="width: 70.85pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <span lang="RU" style="font-size: 8pt; color: black; white-space: nowrap">${this.formatNumber(totalWithVat)}</span>
              </p>
            </td>
          </tr>
          <tr style="page-break-inside: avoid">
            <td width="737" colspan="9" style="width: 552.85pt; border: solid windowtext 1pt; border-top: none; padding: 0 3pt">
              <p class="MsoNormal" style="text-autospace: ideograph-numeric ideograph-other; margin: 0; line-height: 1.1;">
                <b><span lang="RU" style="font-size: 8pt; color: black">Итого: <span style="background: transparent">${this.formatNumber(totalWithVat)} (${totalInWords})</span> сум с учетом НДС.</span></b>
              </p>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">2.3. Подарочные карты могут быть представлены Предъявителем к оплате за приобретаемые товары в течение срока их предъявления в Месте приобретения Товара.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">2.4. Не использованные и/или недоиспользованные подарочные карты с истекшими к предъявлению сроками, возврату и/или обмену не подлежат, и денежная компенсация их стоимости (в т.ч. средств, оставшихся на картах) не производится.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">2.5. В случае утери Покупателем (в т.ч. Предъявителем) подарочной карты, подарочная карта восстановлению не подлежит. Передача товара по поврежденным подарочным картам, или в подлинности, которых у Продавца возникли сомнения, не осуществляется.</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt; margin: 0;">
        <b><span lang="RU" style="font-family: 'Times New Roman', serif">&nbsp;</span></b>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">3. Сумма договора и порядок расчётов.</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">Общая сумма настоящего договора составляет: <b><span style="background: transparent">${this.formatNumber(totalWithVat)}</span></b> <b>(<span style="background: transparent">${totalInWords}</span>) </b><b>сум</b> с учетом НДС. Покупатель обязуется оплатить Подарочные карты путем 100% предоплаты. Сумма предварительной оплаты подлежит оплате Покупателем на расчетный счет Продавца в течение 10 (десяти) банковских дней с даты заключения сторонами настоящего Договора.</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">4. Срок действия договора.</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">Настоящий Договор вступает в силу с момента его подписания и действует до полного исполнения Сторонами своих обязательств и завершения всех взаиморасчетов по настоящему Договору.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt; margin: 0;">
        <span lang="RU" style="font-family: 'Times New Roman', serif">&nbsp;</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">5. Передача подарочных карт.</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">5.1. Подарочные карты будут предоставлены Покупателю в течение 10 (десяти) банковских дней с момента поступления суммы предоплаты на расчетный счет Продавца.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">5.2. Покупатель самостоятельно забирает подарочные карты с офиса Продавца (самовывоз), после получения уведомления Продавца о готовности товара к отгрузке, с указанием даты, времени и места отгрузки, направленного не позднее 3 (трёх) календарных дней до окончания срока поставки. Представитель Покупателя при получении подарочных карт должен предъявить документ, удостоверяющий личность, и правильно оформленную доверенность в соответствии с действующим законодательством Республики Узбекистан.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">5.3. Принятие подарочных карт Покупателем подтверждается подписанием Акта приема-передачи (Приложение № 1).</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">5.4. Право собственности на подарочные карты, а также риск случайной гибели или повреждения подарочных карт переходят от Продавца к Покупателю с даты подписания Акта приема-передачи (Приложение № 1).</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">5.5. В случаях утраты, кражи, порчи подарочной карты, не позволяющих её идентифицировать, такая подарочная карта не восстанавливается, не обменивается на новую, денежные средства, равные номинальной стоимости подарочной карты, возврату Предъявителю (в т.ч. Покупателю) не подлежат.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">5.6. В течение срока действия Подарочные карты могут предъявляться к оплате многократно, до тех пор, пока номинал подарочной карты не будет истрачен полностью.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt; margin: 0;">
        <span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">&nbsp;</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">6. Права и обязанности сторон.</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <b><span lang="RU" style="font-family: 'Times New Roman', serif">6.1. Продавец обязан:</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">* Передать Покупателю подарочные карты, указанные в п. 2.2. настоящего Договора, в установленные настоящим договором сроки. Факт передачи Подарочных карт подтверждается подписанием Сторонами акта приема-передачи Подарочных карт, который составляется по Форме согласно Приложению № 1, являющемся неотъемлемой частью настоящего Договора.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">* Принимать к оплате подарочные карты во всех Местах приобретения товара, в течение всего срока их предъявления.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">* По истечении срока на предъявление Подарочной карты, Продавец вправе отказать Предъявителю (в т.ч. Покупателю) в покупке Товаров посредством Подарочной карты. При этом денежные средства, равные номинальной стоимости подарочной карты, возврату и/или компенсации Предъявителю (в т.ч. Покупателю) не подлежат.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">* В случае выявления подарочных карт ненадлежащего качества в момент приема-передачи подарочных карт от Продавца к Покупателю, за свой счет и своими силами заменить подарочные карты ненадлежащего качества в течение 3 (трёх) банковских дней.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <b><span lang="RU" style="font-family: 'Times New Roman', serif">6.2. Продавец имеет право:</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">* Требовать своевременной оплаты за предоставленные Покупателю подарочные карты.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">* По истечении 5 (пяти) календарных дней после приема-передачи подарочных карт от Продавца к Покупателю, Продавец вправе не рассматривать претензии со стороны Покупателя относительно количества, качества и номинальной стоимости переданных подарочных карт.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <b><span lang="RU" style="font-family: 'Times New Roman', serif">6.3. Покупатель обязан:</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">* Оплатить и принять от Продавца подарочные карты в соответствии с условиями настоящего Договора.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">* Подписать и передать Продавцу в обмен на переданные Покупателю Подарочные карты Акт приема-передачи Подарочных карт, составляемый по форме, установленной настоящим Договором (Приложение № 1).</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">* При принятии Подарочных карт от Продавца согласно условиям настоящего Договора, осуществить проверку и приемку Подарочных карт по количеству, качеству и номинальной стоимости. По истечении 5 (пяти) календарных дней после приемки товара претензии по количеству, качеству и номинальной стоимости Подарочных карт Продавцом не принимаются.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">6.4. Покупатель имеет право требовать своевременного выполнения обязательств по настоящему Договору.</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt; margin: 0;">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">&nbsp;</span></b>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">7. Ответственность сторон.</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">В случае неисполнения или ненадлежащего исполнения иных обязательств, предусмотренных настоящим Договором, Стороны несут ответственность в соответствии с действующим законодательством Республики Узбекистан.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt; margin: 0;">
        <span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">&nbsp;</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt; font-family: 'Times New Roman', serif">8. Порядок разрешения споров.</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">8.1 Споры, возникающие между сторонами, решаются путем переговоров между сторонами. Подтверждением проведения переговоров является направленное претензионное письмо, оформленное в соответствии с действующим законодательством Республики Узбекистан. Стороны устанавливают предварительный претензионный порядок разрешения споров. Срок ответа на претензию составляет 19 (девятнадцать) календарных дней с даты направления претензии Стороной. В случае отсутствия ответа на претензионное письмо со стороны получателя, это является достаточным основанием для признания отсутствия заинтересованности в проведении переговоров.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">8.2. В случае возникновения разногласий все вопросы решаются путем двусторонних переговоров, а при невозможности прийти к согласию - в Ташкентском межрайонном экономическом суде. Предсудебная процедура обязательна.</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt; margin: 0;">
        <span lang="RU" style="font-family: 'Times New Roman', serif">&nbsp;</span>
      </p>
      <p class="MsoNormal" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt">9. Антикоррупционная оговорка</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">9.1. Стороны соблюдают все применимые нормы антикоррупционного законодательства. Стороны признают и подтверждают, что каждая из них проводит политику полной нетерпимости к взяточничеству и коррупции, предполагающую полный запрет коррупционных действий и совершения выплат за содействие / выплат, целью которых является упрощение формальностей в связи с хозяйственной деятельностью, обеспечение более быстрого решения тех или иных вопросов. Стороны, их аффилированные лица, работники, а также посредники и представители, которые прямо или косвенно участвуют в исполнении обязательств Сторонами (в том числе агенты, комиссионеры, таможенные брокеры и иные третьи лица) не принимают, не выплачивают, не предлагают выплатить и не разрешают (санкционируют) выплату/получение каких-либо денежных средств или передачу каких-либо ценностей (в том числе нематериальных) прямо или косвенно, любым лицам, с целью оказания влияния на действия или решения с намерением получить какие-либо неправомерные преимущества, в том числе в обход установленного законодательством порядка, или преследующие иные неправомерные цели. Положения настоящего пункта являются заверениями об обстоятельствах, имеющими для Сторон существенное значение. Стороны полагаются на такие заверения при заключении Договора.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">9.2. В случае нарушения одной из Сторон обязательств по соблюдению требований, предусмотренных настоящим пунктом, Сторона вправе немедленно отказаться от Договора в одностороннем внесудебном порядке, направив письменное уведомление о расторжении. Договор считается расторгнутым по истечении 10 (десяти) календарных дней с даты получения другой Стороной соответствующего письменного уведомления.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">9.3. В случае возникновения у Стороны подозрений, что произошло или может произойти нарушение каких-либо положений настоящего пункта, соответствующая Сторона обязуется как можно скорее уведомить другую Сторону о своих подозрениях в письменной форме.<br />Стороны соглашаются, что будут использовать следующие адреса для уведомления о нарушении/угрозе нарушения настоящего пункта:<br />Адрес электронной почты ИП ООО «Anglesey Food»: compliance@korzinka.uz.<br />Адрес электронной почты ${doc.companyName}: ___________________</span>
      </p>
      <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt; margin: 0;">
        <span lang="RU" style="font-family: 'Times New Roman', serif">&nbsp;</span>
      </p>
      <p class="MsoNormal" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt">10. Прочие условия</span></b>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">10.1. Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств по настоящему Договору, если неисполнение является следствием обстоятельств, которые обе Стороны не могли предотвратить разумными мерами. К обстоятельствам непреодолимой силы относятся события, на которые обе стороны не могут оказать влияния и за возникновение которых не несут ответственности: как, например, наводнение, землетрясение, пожар, аварии, другие стихийные бедствия, а также забастовки, правительственные постановления или распоряжения государственных органов.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">10.2. Стороны гарантируют обеспечение конфиденциальности в отношении информации, передаваемой друг другу.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">10.3. Уступка прав требований по Договору допускается только после получения письменного согласия другой стороны.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">10.4. Стороны гарантируют друг другу, что на дату подписания настоящего договора нет каких-либо запретов или ограничений, препятствующих исполнению настоящего Договора.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">10.5. Любые изменения и дополнения к настоящему договору имеют силу только в том случае, если они оформлены в письменном виде и подписаны обеими Сторонами. В случае изменения Налогового Кодекса Республики Узбекистан, с учетом изменений будет составлено дополнительное соглашение.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">10.6. Настоящий договор может быть расторгнут досрочно, по обоюдному письменному согласию сторон, а также по иным основаниям, предусмотренным действующим законодательством Республики Узбекистан. Сторона, решившая расторгнуть настоящий Договор, должна направить письменное уведомление не позднее 20 (двадцати) банковских дней до предполагаемой даты расторжения.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">10.7. Покупатель настоящим заявляет, что он прочитал, понял и будет соблюдать Кодекс поведения для бизнес-партнеров ИП ООО «Anglesey Food», размещенный на официальном сайте ИП ООО «Anglesey Food» по ссылке https://korzinka.uz/page/business-partners-code, за исключением случаев, когда Покупатель утверждает и заверяет, что его политика, внутренние правила и процедуры подразумевают и обеспечивают более высокие стандарты добросовестности, прозрачности и защиты социальной и экологической среды</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">10.8. Покупатель уведомлен о возможности осуществления связи для соблюдения требований, предоставленных ИП ООО Anglesey Food. В случае возникновения серьезных жалоб и вопросов, связанных с этическим поведением сотрудников ИП ООО Anglesey Food (например, подозрения в коррупции, мошенничестве, домогательствах и т.д.), Покупателю следует обращаться непосредственно на электронную почту: compliance@korzinka.uz. Все сообщенные случаи будут рассмотрены в соответствии с внутренними нормативными актами и применимым законодательством Республики Узбекистан.</span>
      </p>
      <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-family: 'Times New Roman', serif">10.9. Порядок использования подарочных карт указан на подарочных картах.</span>
      </p>
      <p class="MsoNormal" style="text-align: justify; line-height: 12pt">
        <span lang="RU" style="font-size: 10pt">10.10. Во всем, что не предусмотрено настоящим Договором, Стороны руководствуются законодательством Республики Узбекистан.</span>
      </p>
      <p class="MsoNormal" align="center" style="text-align: center; line-height: 12pt; margin: 0;">
        <b><span lang="RU" style="font-size: 10pt">&nbsp;</span></b>
      </p>
      <p class="MsoNormal" align="center" style="text-align: center; line-height: 12pt">
        <b><span lang="RU" style="font-size: 10pt">АДРЕСА И ИНЫЕ РЕКВИЗИТЫ СТОРОН.</span></b>
      </p>
      <table class="MsoTableGrid" border="1" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: none">
        <tbody>
          <tr>
            <td width="319" valign="top" style="width: 239.55pt; border: solid windowtext 1pt; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; line-height: 12pt">
                <b><span style="font-size: 10pt">«</span></b><b><span lang="RU" style="font-size: 10pt">Продавец</span></b><b><span style="font-size: 10pt">»: </span></b>
              </p>
              <p class="MsoPlainText" align="center" style="text-align: center; line-height: 12pt">
                <b><span lang="RU" style="font-family: 'Times New Roman', serif">ИП</span></b><b><span lang="RU" style="font-family: 'Times New Roman', serif"> </span></b><b><span lang="RU" style="font-family: 'Times New Roman', serif">ООО</span></b><b><span style="font-family: 'Times New Roman', serif"> «Anglesey Food»</span></b>
              </p>
              <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
                <span lang="RU" style="font-family: 'Times New Roman', serif">Адрес: г. Ташкент, ул. Тураб-Тула 57</span>
              </p>
              <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
                <span lang="RU" style="font-family: 'Times New Roman', serif">ИНН: 202099756</span>
              </p>
              <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
                <span lang="RU" style="font-family: 'Times New Roman', serif">Р/с: 20208000300578902046</span>
              </p>
              <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
                <span lang="RU" style="font-family: 'Times New Roman', serif">Банк: Академический Центр банковских услуг АО «Узнацбанк»</span>
              </p>
              <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
                <span lang="RU" style="font-family: 'Times New Roman', serif">МФО: 00450</span>
              </p>
              <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
                <span lang="RU" style="font-family: 'Times New Roman', serif">ОКЭД: 47110</span>
              </p>
              <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
                <span lang="RU" style="font-family: 'Times New Roman', serif">Эл. почта: info@korzinka.uz</span>
              </p>
              <p class="MsoPlainText" style="text-align: justify; line-height: 12pt">
                <span lang="RU" style="font-family: 'Times New Roman', serif">Тел.: 71-231-83-02</span>
              </p>
              <p class="MsoNormal" style="text-align: justify; line-height: 12pt">
                <span lang="RU" style="font-size: 10pt">&nbsp;</span>
              </p>
            </td>
            <td width="320" valign="top" style="width: 240.05pt; border: solid windowtext 1pt; border-left: none; padding: 0 3pt">
              <p class="MsoNormal" align="center" style="text-align: center; line-height: 12pt">
                <b><span lang="RU" style="font-size: 10pt">«Покупатель»:</span></b>
              </p>
              <p class="MsoNormal" align="center" style="text-align: center; line-height: 12pt">
                <b><span lang="RU" style="font-size: 10.5pt; background: transparent">${doc.companyName}</span></b>
              </p>
              <p class="MsoNormal" align="center" style="text-align: center; line-height: 12pt">
                <span lang="RU" style="font-size: 10.5pt; background: transparent">&nbsp;</span>
              </p>
              ${requisitesLines.map(line => `<p class="MsoNormal" style="line-height: 12pt"><span lang="RU" style="font-size: 10.5pt; background: transparent">${line}</span></p>`).join('')}
            </td>
          </tr>
          <tr>
            <td width="319" valign="top" style="width: 239.55pt; border: solid windowtext 1pt; border-top: none; padding: 0 3pt">
              <p class="MsoNormal" style="line-height: 12pt">
                <span lang="RU" style="font-size: 10pt">&nbsp;</span>
              </p>
              <p class="MsoNormal" style="line-height: 12pt">
                <span lang="RU" style="font-size: 10pt">________________________</span>
              </p>
              <p class="MsoNormal" style="line-height: 12pt">
                <span lang="RU" style="font-size: 10pt">М.П.</span>
              </p>
              <p class="MsoNormal" align="center" style="text-align: center; line-height: 12pt">
                <span lang="RU" style="font-size: 10pt">&nbsp;</span>
              </p>
            </td>
            <td width="320" valign="top" style="width: 240.05pt; border-top: none; border-left: none; border-bottom: solid windowtext 1pt; border-right: solid windowtext 1pt; padding: 0 3pt">
              <p class="MsoNormal" style="line-height: 12pt">
                <span lang="RU" style="font-size: 10pt">&nbsp;</span>
              </p>
              <p class="MsoNormal" style="line-height: 12pt">
                <span lang="RU" style="font-size: 10pt">___________________________ </span>
              </p>
              <p class="MsoNormal" style="line-height: 12pt">
                <span lang="RU" style="font-size: 10pt">М.П.</span>
              </p>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Note: Appendix #1 (Приложение №1) would be added here if needed -->
      <p class="MsoNormal" style="margin: 0;"><span lang="RU" style="font-size: 10pt">&nbsp;</span></p>
    `;
  }

  async downloadDocx(doc: DocumentDetails): Promise<void> {
    if (!this.isBrowser) return;
    
    try {
      const docxDoc = this.createDocxDocument(doc);
      const blob = await Packer.toBlob(docxDoc);
      saveAs(blob, this.getDownloadFilename('docx', doc));
    } catch (error) {
      console.error('Error generating DOCX:', error);
      throw new Error('Ошибка при создании документа. Пожалуйста, попробуйте ещё раз.');
    }
  }

  private createDocxDocument(doc: DocumentDetails): Document {
    const tableRows = doc.table;
    const date = this.formatDate(doc.date);
    
    const PAGE_WIDTH = Math.round(10609 * 0.97);
    const solidBorder = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
    const noBorder = { style: BorderStyle.NIL, size: 0, color: 'FFFFFF' };
    const allBorders = { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder };
    const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

    const text = (content: string, bold = false, size = 20, italics = false) => 
      new TextRun({ text: content, bold, size, italics, font: 'Times New Roman' });

    const para = (runs: TextRun[], alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.LEFT, spacing = 240) =>
      new Paragraph({ children: runs, alignment, spacing: { after: spacing, line: 276 } });

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

    const COL_WIDTHS = [2331, 1415, 499, 601, 1110, 1415, 499, 1425, 1314];
    const nowrapPara = (runs: TextRun[], alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.CENTER) =>
      new Paragraph({ children: runs, alignment, spacing: { after: 0, line: 276 }, keepLines: true });

    const totalWithVat = this.getTotalWithVat(tableRows);
    const totalDeliveryCost = this.getTotalDeliveryCost(tableRows);
    const totalVatAmount = this.getTotalVatAmount(tableRows);
    const totalInWords = this.numberToWordsRussian(totalWithVat);

    const createDataTable = (): Table => {
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

      const headerRow2 = new TableRow({
        children: [
          cell([para([text('Ставка %', true, 18)], AlignmentType.CENTER, 0)]),
          cell([para([text('Сумма', true, 18)], AlignmentType.CENTER, 0)]),
        ],
      });

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

      const totalsRow = new TableRow({
        children: [
          cell([para([text('Итого:', true, 18)], AlignmentType.RIGHT, 0)], { columnSpan: 5 }),
          cell([nowrapPara([text(this.formatMoney(totalDeliveryCost), false, 18)])]),
          cell([para([text('12', false, 18)], AlignmentType.CENTER, 0)]),
          cell([nowrapPara([text(this.formatMoney(totalVatAmount), false, 18)])]),
          cell([nowrapPara([text(this.formatNumber(totalWithVat), false, 18)])]),
        ],
      });

      const totalWordsRow = new TableRow({
        children: [
          cell([para([text(`Итого: ${this.formatNumber(totalWithVat)} (${totalInWords}) сум с учетом НДС.`, true, 18)], AlignmentType.LEFT, 0)], { columnSpan: 9 }),
        ],
      });

      return new Table({
        width: { size: PAGE_WIDTH, type: WidthType.DXA },
        columnWidths: COL_WIDTHS,
        layout: TableLayoutType.FIXED,
        rows: [headerRow1, headerRow2, ...dataRows, totalsRow, totalWordsRow],
      });
    };

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

    const HALF_WIDTH = Math.round(PAGE_WIDTH / 2);
    const requisitesLines = doc.requisites.split('\n').filter(line => line.trim());
    
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
              para([text(doc.companyName, true)], AlignmentType.CENTER, 0),
              para([text('')], AlignmentType.LEFT, 0),
              ...requisitesLines.map(line => para([text(line)], AlignmentType.LEFT, 0)),
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
            para([text(doc.companyName, true)], AlignmentType.CENTER, 0),
            para([text('')], AlignmentType.LEFT, 0),
            para([text('_________________')], AlignmentType.LEFT, 0),
            para([text(`(${doc.fullName})`, false, 18)], AlignmentType.LEFT, 0),
            para([text('')], AlignmentType.LEFT, 0),
            para([text('М.П.', false, 18)], AlignmentType.LEFT, 0),
          ], { verticalAlign: VerticalAlign.TOP }),
        ],
      })],
    });

    return new Document({
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
          para([text(`ДОГОВОР КУПЛИ-ПРОДАЖИ ПОДАРОЧНЫХ КАРТ № ${doc.contractNumber}`, true, 22)], AlignmentType.CENTER),
          createCityDateTable('г. Ташкент', `«${date.day}» ${date.month} ${date.year} г.`),
          para([text('')]),
          new Paragraph({
            children: [
              text(doc.companyName + ',', true),
              text(` именуемый в дальнейшем Покупатель, в лице ${doc.position} `),
              text(doc.fullName, true),
              text(`, действующего на основании ${doc.documentBasis}, с одной стороны, и `),
              text('ИП ООО ANGLESEY FOOD', true),
              text(', именуемый в дальнейшем «Продавец», в лице Руководителя отдела Korzinka-Biznes Шакирходжаев Ф., действующего на основании доверенности №045B от 04.11.2025г., с другой стороны, совместно именуемые Стороны, а по-отдельности «Сторона», заключили настоящий договор (далее – «Договор») о нижеследующем:'),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 276 },
          }),
          para([text('1. Понятия, используемые в настоящем договоре:', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('А. Подарочная карта от Сети супермаркетов Корзинка (далее – «Подарочная карта») ', false, 20, true), text('– это документ, удостоверяющий право его предъявителя приобрести у Продавца товары на сумму, равную номинальной стоимости подарочной карты.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('B. Товары - ', false, 20, true), text('товары народного потребления, реализуемые Продавцом в сети супермаркетов Корзинка.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('C. Номинальная стоимость (номинал) подарочной карты ', false, 20, true), text('– сумма, указанная на Подарочной карте, на которую предъявитель вправе приобрести товар.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('D. Место приобретения Товара – ', false, 20, true), text('сеть супермаркетов Корзинка, расположенных на территории Республики Узбекистан, за исключением супермаркетов, расположенных по адресам: Республика Каракалпакстан, город Нукус, улица Ерназар Алакуз, дом 162 и Кашкадарьинская обла., г. Шахрисабз, улица Мафтункор, дом 35.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('E. Предъявитель – ', false, 20, true), text('физическое лицо, правомерно владеющее и распоряжающееся Подарочной картой в результате получения такой Подарочной карты от Покупателя, обладающее правом приобретения Товара в розницу для личного, семейного и иного использования, не связанного с предпринимательской деятельностью, в Месте приобретения Товара в обмен на списанные Продавцом средства с предъявленной Подарочной карты на сумму, установленную и не превышающую Номинала Подарочной карты.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          new Paragraph({ children: [text('F. Срок предъявления Подарочной карты – ', false, 20, true), text('период времени, установленный до 31.12.2026 года включительно, в течение которого Предъявитель имеет право на получение товара на сумму, эквивалентную сумме средств, указанных и имеющихся в Подарочной карте.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { left: 1276, hanging: 1276 } }),
          para([text('2. Предмет договора.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('2.1. В соответствии с настоящим Договором Продавец обязуется передать Покупателю Подарочные карты, подтверждающие право Предъявителя на приобретение Товара в Месте приобретения Товара, а Покупатель обязуется принять и произвести оплату их стоимости в соответствии с условиями настоящего Договора.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('2.2. Продавец передает Покупателю следующие Подарочные карты:')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          createDataTable(),
          new Paragraph({ children: [text('2.3. Подарочные карты могут быть представлены Предъявителем к оплате за приобретаемые товары в течение срока их предъявления в Месте приобретения Товара.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('2.4. Не использованные и/или недоиспользованные подарочные карты с истекшими к предъявлению сроками, возврату и/или обмену не подлежат, и денежная компенсация их стоимости (в т.ч. средств, оставшихся на картах) не производится.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('2.5. В случае утери Покупателем (в т.ч. Предъявителем) подарочной карты, подарочная карта восстановлению не подлежит. Передача товара по поврежденным подарочным картам, или в подлинности, которых у Продавца возникли сомнения, не осуществляется.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          para([text('3. Сумма договора и порядок расчётов.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text(`Общая сумма настоящего договора составляет: `), text(`${this.formatNumber(totalWithVat)} (${totalInWords}) сум`, true), text(' с учетом НДС. Покупатель обязуется оплатить Подарочные карты путем 100% предоплаты. Сумма предварительной оплаты подлежит оплате Покупателем на расчетный счет Продавца в течение 10 (десяти) банковских дней с даты заключения сторонами настоящего Договора.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          para([text('4. Срок действия договора.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('Настоящий Договор вступает в силу с момента его подписания и действует до полного исполнения Сторонами своих обязательств и завершения всех взаиморасчетов по настоящему Договору.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          para([text('5. Передача подарочных карт.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('5.1. Подарочные карты будут предоставлены Покупателю в течение 10 (десяти) банковских дней с момента поступления суммы предоплаты на расчетный счет Продавца.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.2. Покупатель самостоятельно забирает подарочные карты с офиса Продавца (самовывоз), после получения уведомления Продавца о готовности товара к отгрузке, с указанием даты, времени и места отгрузки, направленного не позднее 3 (трёх) календарных дней до окончания срока поставки. Представитель Покупателя при получении подарочных карт должен предъявить документ, удостоверяющий личность, и правильно оформленную доверенность в соответствии с действующим законодательством Республики Узбекистан.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.3. Принятие подарочных карт Покупателем подтверждается подписанием Акта приема-передачи (Приложение № 1).')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.4. Право собственности на подарочные карты, а также риск случайной гибели или повреждения подарочных карт переходят от Продавца к Покупателю с даты подписания Акта приема-передачи (Приложение № 1).')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.5. В случаях утраты, кражи, порчи подарочной карты, не позволяющих её идентифицировать, такая подарочная карта не восстанавливается, не обменивается на новую, денежные средства, равные номинальной стоимости подарочной карты, возврату Предъявителю (в т.ч. Покупателю) не подлежат.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('5.6. В течение срока действия Подарочные карты могут предъявляться к оплате многократно, до тех пор, пока номинал подарочной карты не будет истрачен полностью.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
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
          para([text('7. Ответственность сторон.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('В случае неисполнения или ненадлежащего исполнения иных обязательств, предусмотренных настоящим Договором, Стороны несут ответственность в соответствии с действующим законодательством Республики Узбекистан.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          para([text('8. Порядок разрешения споров.', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('8.1. Споры, возникающие между сторонами, решаются путем переговоров между сторонами. Подтверждением проведения переговоров является направленное претензионное письмо, оформленное в соответствии с действующим законодательством Республики Узбекистан. Стороны устанавливают предварительный претензионный порядок разрешения споров. Срок ответа на претензию составляет 19 (девятнадцать) календарных дней с даты направления претензии Стороной. В случае отсутствия ответа на претензионное письмо со стороны получателя, это является достаточным основанием для признания отсутствия заинтересованности в проведении переговоров.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('8.2. В случае возникновения разногласий все вопросы решаются путем двусторонних переговоров, а при невозможности прийти к согласию - в Ташкентском межрайонном экономическом суде. Предсудебная процедура обязательна.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          para([text('9. Антикоррупционная оговорка', true, 22)], AlignmentType.CENTER),
          new Paragraph({ children: [text('9.1. Стороны соблюдают все применимые нормы антикоррупционного законодательства. Стороны признают и подтверждают, что каждая из них проводит политику полной нетерпимости к взяточничеству и коррупции, предполагающую полный запрет коррупционных действий и совершения выплат за содействие / выплат, целью которых является упрощение формальностей в связи с хозяйственной деятельностью, обеспечение более быстрого решения тех или иных вопросов. Стороны, их аффилированные лица, работники, а также посредники и представители, которые прямо или косвенно участвуют в исполнении обязательств Сторонами (в том числе агенты, комиссионеры, таможенные брокеры и иные третьи лица) не принимают, не выплачивают, не предлагают выплатить и не разрешают (санкционируют) выплату/получение каких-либо денежных средств или передачу каких-либо ценностей (в том числе нематериальных) прямо или косвенно, любым лицам, с целью оказания влияния на действия или решения с намерением получить какие-либо неправомерные преимущества, в том числе в обход установленного законодательством порядка, или преследующие иные неправомерные цели. Положения настоящего пункта являются заверениями об обстоятельствах, имеющими для Сторон существенное значение. Стороны полагаются на такие заверения при заключении Договора.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('9.2. В случае нарушения одной из Сторон обязательств по соблюдению требований, предусмотренных настоящим пунктом, Сторона вправе немедленно отказаться от Договора в одностороннем внесудебном порядке, направив письменное уведомление о расторжении. Договор считается расторгнутым по истечении 10 (десяти) календарных дней с даты получения другой Стороной соответствующего письменного уведомления.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
          new Paragraph({ children: [text('9.3. В случае возникновения у Стороны подозрений, что произошло или может произойти нарушение каких-либо положений настоящего пункта, соответствующая Сторона обязуется как можно скорее уведомить другую Сторону о своих подозрениях в письменной форме. Стороны соглашаются, что будут использовать следующие адреса для уведомления о нарушении/угрозе нарушения настоящего пункта: Адрес электронной почты ИП ООО «Anglesey Food»: compliance@korzinka.uz. Адрес электронной почты ' + doc.companyName + ': ___________________')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 } }),
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
          para([text('АДРЕСА И ИНЫЕ РЕКВИЗИТЫ СТОРОН.', true, 20)], AlignmentType.CENTER),
          createRequisitesTable(),
          new Paragraph({ children: [new PageBreak()] }),
          para([text('Приложение №1', true, 22)], AlignmentType.RIGHT),
          new Paragraph({ children: [text(`к Договору купли-продажи №${doc.contractNumber}`, true)], alignment: AlignmentType.RIGHT, spacing: { line: 276 } }),
          new Paragraph({ children: [text(`от «${date.day}» ${date.month} ${date.year} г.`, true)], alignment: AlignmentType.RIGHT, spacing: { line: 276 } }),
          para([text('АКТ', true, 22)], AlignmentType.CENTER, 0),
          para([text('приема-передачи Подарочных карт', true, 22)], AlignmentType.CENTER, 0),
          createCityDateTable('г. Ташкент', '«___» ___________ 2026 г.'),
          para([text('')]),
          new Paragraph({
            children: [
              text(doc.companyName + ', ', true),
              text(`именуемый в дальнейшем Покупатель, в лице ${doc.position} `),
              text(doc.fullName, true),
              text(`, действующего на основании ${doc.documentBasis}, с одной стороны, и `),
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
              text(`№ ${doc.contractNumber} от «${date.day}» ${date.month} ${date.year} г.`, true),
              text(' (далее – «Договор») Продавец передал, а Покупатель принял следующие Подарочные карты:'),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 276 },
            indent: { firstLine: 708 },
          }),
          para([text('')]),
          createDataTable(),
          para([text('')]),
          new Paragraph({ children: [text('2. ', true), text('Подарочные карты соответствуют требованиям, предъявляемым к качеству и количеству, установленным в Договоре. Претензий у сторон по исполнению условий Договора не имеется.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { firstLine: 708 } }),
          new Paragraph({ children: [text('3. ', true), text('Настоящий Акт составлен в 2 (двух) экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.')], alignment: AlignmentType.JUSTIFIED, spacing: { line: 276 }, indent: { firstLine: 708 } }),
          para([text('')]),
          createSignaturesTable(),
        ],
      }],
    });
  }
}

