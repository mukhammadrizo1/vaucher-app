// Development server for API endpoints only
const express = require('express');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const htmlToDocx = require('html-to-docx');
const XLSX = require('xlsx');

const app = express();
const projectRoot = process.cwd();
const dataFolder = join(projectRoot, 'data');
const documentDetailsFile = join(dataFolder, 'document-details.json');

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

function ensureDocumentDetailsFile() {
  if (!existsSync(dataFolder)) {
    mkdirSync(dataFolder, { recursive: true });
  }
  if (!existsSync(documentDetailsFile)) {
    writeFileSync(documentDetailsFile, JSON.stringify([], null, 2), 'utf-8');
  }
}

ensureDocumentDetailsFile();

app.post('/api/document-details', (req, res) => {
  try {
    console.log('POST /api/document-details - Received request');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    ensureDocumentDetailsFile();

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const existingData = existsSync(documentDetailsFile)
      ? readFileSync(documentDetailsFile, 'utf-8')
      : '[]';

    let documentsList = [];
    try {
      documentsList = JSON.parse(existingData);
      if (!Array.isArray(documentsList)) {
        console.warn('Document details file is not an array, resetting to empty array');
        documentsList = [];
      }
    } catch (e) {
      console.error('Error parsing existing document details:', e);
      documentsList = [];
    }

    const newDocument = req.body;
    console.log('Adding new document:', JSON.stringify(newDocument, null, 2));
    documentsList.push(newDocument);

    writeFileSync(documentDetailsFile, JSON.stringify(documentsList, null, 2), 'utf-8');
    console.log(`Document details saved to: ${documentDetailsFile}`);
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`Data folder exists: ${existsSync(dataFolder)}`);
    console.log(`File exists: ${existsSync(documentDetailsFile)}`);

    res.json({ success: true, message: 'Document details saved successfully' });
  } catch (error) {
    console.error('Error saving document details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to save document details',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/document-details', (req, res) => {
  try {
    ensureDocumentDetailsFile();

    if (!existsSync(documentDetailsFile)) {
      return res.json([]);
    }

    const fileData = readFileSync(documentDetailsFile, 'utf-8');
    let documentsList;
    try {
      documentsList = JSON.parse(fileData);
      if (!Array.isArray(documentsList)) {
        console.warn('Document details file is not an array, returning empty array');
        documentsList = [];
      }
    } catch (e) {
      console.error('Error parsing document details:', e);
      documentsList = [];
    }

    return res.json(Array.isArray(documentsList) ? documentsList : []);
  } catch (error) {
    console.error('Error reading document details:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Failed to read document details',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.put('/api/document-details/:id', (req, res) => {
  try {
    ensureDocumentDetailsFile();
    const { id } = req.params;

    if (!existsSync(documentDetailsFile)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fileData = readFileSync(documentDetailsFile, 'utf-8');
    let documentsList;
    try {
      documentsList = JSON.parse(fileData);
      if (!Array.isArray(documentsList)) {
        documentsList = [];
      }
    } catch (e) {
      console.error('Error parsing document details:', e);
      documentsList = [];
    }

    const docIndex = documentsList.findIndex((doc) => doc.id === decodeURIComponent(id));

    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Preserve the ID from the URL parameter to ensure it doesn't change
    const updatedDoc = { ...req.body, id: decodeURIComponent(id) };
    documentsList[docIndex] = updatedDoc;
    writeFileSync(documentDetailsFile, JSON.stringify(documentsList, null, 2), 'utf-8');
    res.json({ success: true, message: 'Document updated successfully' });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({
      error: 'Failed to update document',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.delete('/api/document-details/:id', (req, res) => {
  try {
    ensureDocumentDetailsFile();
    const { id } = req.params;

    if (!existsSync(documentDetailsFile)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fileData = readFileSync(documentDetailsFile, 'utf-8');
    let documentsList;
    try {
      documentsList = JSON.parse(fileData);
      if (!Array.isArray(documentsList)) {
        documentsList = [];
      }
    } catch (e) {
      console.error('Error parsing document details:', e);
      documentsList = [];
    }

    const initialLength = documentsList.length;
    documentsList = documentsList.filter((doc) => doc.id !== decodeURIComponent(id));

    if (documentsList.length === initialLength) {
      return res.status(404).json({ error: 'Document not found' });
    }

    writeFileSync(documentDetailsFile, JSON.stringify(documentsList, null, 2), 'utf-8');
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/generate-docx', async (req, res) => {
  try {
    const { html, filename } = req.body;

    if (!html) {
      res.status(400).json({ error: 'HTML content is required' });
      return;
    }

    const docxBuffer = await htmlToDocx(html, null, {
      table: {
        row: { cantSplit: true },
      },
      footer: false,
      header: false,
      pageNumber: false,
      margins: {
        top: 567, // ~1cm in twips
        right: 567, // ~1cm in twips
        bottom: 567, // ~1cm in twips
        left: 1134, // ~2cm in twips
      },
      font: 'Times New Roman',
      fontSize: 20, // 10pt in half-points
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename || 'document.docx')}"`
    );
    res.send(docxBuffer);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    res.status(500).json({ error: 'Failed to generate DOCX' });
  }
});

// Export Excel endpoint - supports both GET and POST
app.get('/api/export-excel', (req, res) => {
  handleExportExcel(req, res);
});

app.post('/api/export-excel', (req, res) => {
  handleExportExcel(req, res);
});

function handleExportExcel(req, res) {
  try {
    ensureDocumentDetailsFile();

    if (!existsSync(documentDetailsFile)) {
      return res.status(404).json({ error: 'No documents found' });
    }

    const fileData = readFileSync(documentDetailsFile, 'utf-8');
    let documentsList;
    try {
      documentsList = JSON.parse(fileData);
      if (!Array.isArray(documentsList)) {
        documentsList = [];
      }
    } catch (e) {
      console.error('Error parsing document details:', e);
      documentsList = [];
    }

    if (documentsList.length === 0) {
      return res.status(404).json({ error: 'No documents to export' });
    }

    // Helper function to extract INN from requisites
    const extractINN = (requisites) => {
      if (!requisites) return '';
      const innMatch = requisites.match(/ИНН\s+(\d+)/i);
      return innMatch ? innMatch[1] : '';
    };

    // Helper function to extract phone from requisites
    const extractPhone = (requisites) => {
      if (!requisites) return '';
      const phoneMatch = requisites.match(/Тел[.:]\s*([\d\s\-()]+)/i);
      return phoneMatch ? phoneMatch[1].trim() : '';
    };

    // Helper function to format date
    const formatDate = (dateString) => {
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
    };

    // Prepare data for Excel
    const excelData = documentsList.map((doc, index) => {
      return {
        '№': index + 1,
        ИНН: extractINN(doc.requisites),
        'НОМЕР КОНТРАГЕНТА': doc.contractorNumber || '-',
        'Наименование КОНТРАГЕНТА': doc.companyName,
        'НОМЕР И ДАТА ДОГОВОРА': `${doc.contractNumber} от ${formatDate(doc.date)}`,
        'СУММА ДОГОВОРA': doc.total,
        'НОМЕР ЗАКАЗА': doc.orderNumber || '-',
        'НОМЕР ПОСТАВКИ': doc.deliveryNumber || '-',
        'НОМЕР С/Ф': doc.invoiceNumber || '-',
        'ТЕЛ НОМЕР КОНТРАГЕНТА': doc.phoneNumber || extractPhone(doc.requisites) || '-',
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Документы');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 }, // №
      { wch: 12 }, // ИНН
      { wch: 18 }, // НОМЕР КОНТРАГЕНТА
      { wch: 30 }, // Наименование КОНТРАГЕНТА
      { wch: 25 }, // НОМЕР И ДАТА ДОГОВОРА
      { wch: 18 }, // СУММА ДОГОВОРA
      { wch: 15 }, // НОМЕР ЗАКАЗА
      { wch: 15 }, // НОМЕР ПОСТАВКИ
      { wch: 12 }, // НОМЕР С/Ф
      { wch: 20 }, // ТЕЛ НОМЕР КОНТРАГЕНТА
    ];

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // Generate filename with current date
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `Документы_${dateStr}.xlsx`;

    // Set headers for file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // Send the file
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({
      error: 'Failed to export Excel file',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

const port = process.env['PORT'] || 4000;
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
  console.log(`Data folder: ${dataFolder}`);
  console.log(`Document details file: ${documentDetailsFile}`);
});
