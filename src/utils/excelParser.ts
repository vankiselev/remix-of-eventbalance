import ExcelJS from 'exceljs';

export interface ExcelWorkbookData {
  sheetNames: string[];
  sheets: Map<string, ExcelSheetData>;
}

export interface ExcelSheetData {
  headers: string[];
  rows: any[][];
  jsonData: Record<string, any>[];
}

/**
 * Load an Excel workbook from ArrayBuffer
 */
export async function loadExcelWorkbook(buffer: ArrayBuffer): Promise<ExcelWorkbookData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const sheets = new Map<string, ExcelSheetData>();
  
  workbook.eachSheet((worksheet, sheetId) => {
    const rows: any[][] = [];
    const headers: string[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      const rowValues: any[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowValues[colNumber - 1] = getCellValue(cell);
      });
      
      if (rowNumber === 1) {
        rowValues.forEach((v, i) => {
          headers[i] = String(v || '').trim();
        });
      }
      rows.push(rowValues);
    });
    
    // Build JSON data from rows (skip header row)
    const jsonData = rows.slice(1).map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, i) => {
        if (header) {
          obj[header] = row[i];
        }
      });
      return obj;
    }).filter(row => Object.values(row).some(v => v !== undefined && v !== null && v !== ''));
    
    sheets.set(worksheet.name, { headers, rows, jsonData });
  });
  
  return {
    sheetNames: workbook.worksheets.map(ws => ws.name),
    sheets
  };
}

/**
 * Get cell value, handling different cell types
 */
function getCellValue(cell: ExcelJS.Cell): any {
  if (cell.value === null || cell.value === undefined) {
    return '';
  }
  
  // Handle rich text
  if (typeof cell.value === 'object' && 'richText' in cell.value) {
    return cell.value.richText.map(rt => rt.text).join('');
  }
  
  // Handle formula results
  if (typeof cell.value === 'object' && 'result' in cell.value) {
    return cell.value.result;
  }
  
  // Handle dates (ExcelJS returns Date objects for date cells)
  if (cell.value instanceof Date) {
    return cell.value;
  }
  
  return cell.value;
}

/**
 * Parse Excel sheet to JSON with custom header row detection
 */
export function parseSheetToJson(
  sheetData: ExcelSheetData,
  headerRowIndex: number = 0
): Record<string, any>[] {
  const { rows } = sheetData;
  
  if (rows.length <= headerRowIndex) {
    return [];
  }
  
  const headers = rows[headerRowIndex].map((v, i) => String(v || `Column${i + 1}`).trim());
  
  return rows.slice(headerRowIndex + 1).map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((header, i) => {
      if (header) {
        obj[header] = row[i];
      }
    });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== undefined && v !== null && v !== ''));
}

/**
 * Detect header row by looking for known keywords
 */
export function detectHeaderRow(
  rows: any[][],
  keywords: string[],
  maxRowsToCheck: number = 15
): { index: number; headers: string[] } {
  const limit = Math.min(maxRowsToCheck, rows.length);
  
  for (let i = 0; i < limit; i++) {
    const row = (rows[i] || []).map(v => String(v ?? '').trim());
    const nonEmpty = row.filter(Boolean);
    if (nonEmpty.length < 2) continue;
    
    const hit = nonEmpty.some(cell => {
      const lc = cell.toLowerCase();
      return keywords.some(k => lc.includes(k));
    });
    
    if (hit) return { index: i, headers: row };
  }
  
  // Fallback: first row with at least 2 non-empty cells
  for (let i = 0; i < limit; i++) {
    const row = (rows[i] || []).map(v => String(v ?? '').trim());
    if (row.filter(Boolean).length >= 2) return { index: i, headers: row };
  }
  
  return { index: 0, headers: (rows[0] || []).map(v => String(v ?? '').trim()) };
}
