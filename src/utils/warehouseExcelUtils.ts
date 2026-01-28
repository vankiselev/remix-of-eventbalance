import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { WarehouseItemWithStock } from '@/hooks/useWarehouseItems';
import { generateSKU } from './skuGenerator';

export interface ParsedExcelItem {
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  price: number;
  min_stock: number;
  barcode: string | null;
  photo_url: string | null;
  rowNumber: number;
  errors: string[];
}

export interface ExcelParseResult {
  items: ParsedExcelItem[];
  totalRows: number;
  validRows: number;
  errorRows: number;
}

// Экспорт товаров в Excel
export const exportWarehouseItemsToExcel = async (
  items: WarehouseItemWithStock[]
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Товары');

  // Определяем колонки
  worksheet.columns = [
    { header: 'Артикул (SKU)', key: 'sku', width: 15 },
    { header: 'Название', key: 'name', width: 30 },
    { header: 'Категория', key: 'category', width: 20 },
    { header: 'Описание', key: 'description', width: 40 },
    { header: 'Единица измерения', key: 'unit', width: 15 },
    { header: 'Цена за единицу', key: 'price', width: 15 },
    { header: 'Минимальный остаток', key: 'min_stock', width: 15 },
    { header: 'Общее количество', key: 'total_quantity', width: 15 },
    { header: 'Создан', key: 'created_at', width: 12 },
  ];

  // Добавляем данные
  items.forEach(item => {
    worksheet.addRow({
      sku: item.sku || '',
      name: item.name || '',
      category: item.category_name || '',
      description: item.description || '',
      unit: item.unit || 'шт',
      price: item.price || 0,
      min_stock: item.min_stock || 0,
      total_quantity: item.total_quantity || 0,
      created_at: new Date(item.created_at).toLocaleDateString('ru-RU'),
    });
  });

  // Экспорт файла
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const fileName = `warehouse_items_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, fileName);
};

// Генерация Excel шаблона для импорта
export const generateImportTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Шаблон импорта');

  // Определяем колонки
  worksheet.columns = [
    { header: 'Артикул (SKU)', key: 'sku', width: 15 },
    { header: 'Название', key: 'name', width: 30 },
    { header: 'Категория', key: 'category', width: 20 },
    { header: 'Описание', key: 'description', width: 40 },
    { header: 'Единица измерения', key: 'unit', width: 15 },
    { header: 'Цена за единицу', key: 'price', width: 15 },
    { header: 'Минимальный остаток', key: 'min_stock', width: 15 },
  ];

  // Добавляем примеры
  worksheet.addRow({
    sku: 'КП-1234',
    name: 'Костюм пирата',
    category: 'Костюмы',
    description: 'Детский костюм пирата с аксессуарами',
    unit: 'шт',
    price: 1500,
    min_stock: 5,
  });

  worksheet.addRow({
    sku: '',
    name: 'Шляпа ковбоя',
    category: 'Аксессуары',
    description: '',
    unit: 'шт',
    price: 300,
    min_stock: 10,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  saveAs(blob, 'warehouse_import_template.xlsx');
};

// Валидация данных строки
const validateRow = (row: any, rowNumber: number): string[] => {
  const errors: string[] = [];

  if (!row['Название'] || row['Название'].toString().trim() === '') {
    errors.push('Название обязательно');
  }

  const unit = row['Единица измерения']?.toString() || '';
  if (!unit || unit.trim() === '') {
    errors.push('Единица измерения обязательна');
  }

  const price = parseFloat(row['Цена за единицу']);
  if (isNaN(price) || price < 0) {
    errors.push('Некорректная цена');
  }

  const minStock = parseInt(row['Минимальный остаток']);
  if (isNaN(minStock) || minStock < 0) {
    errors.push('Некорректный минимальный остаток');
  }

  return errors;
};

// Парсинг Excel файла
export const parseWarehouseExcelFile = (
  file: File
): Promise<ExcelParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          reject(new Error('Файл не содержит листов'));
          return;
        }

        // Получаем заголовки из первой строки
        const headers: string[] = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value || '').trim();
        });

        if (headers.length === 0) {
          reject(new Error('Файл пуст или не содержит данных'));
          return;
        }

        // Парсим данные
        const jsonData: any[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Пропускаем заголовок
          
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              rowData[header] = cell.value;
            }
          });
          
          // Проверяем, что строка не пустая
          if (Object.values(rowData).some(v => v !== undefined && v !== null && v !== '')) {
            jsonData.push(rowData);
          }
        });

        if (jsonData.length === 0) {
          reject(new Error('Файл пуст или не содержит данных'));
          return;
        }

        // Парсинг и валидация данных
        const parsedItems: ParsedExcelItem[] = jsonData.map((row, index) => {
          const rowNumber = index + 2; // +2 потому что Excel нумерация с 1, и первая строка - заголовки
          const errors = validateRow(row, rowNumber);

          const name = row['Название']?.toString().trim() || '';
          const skuFromFile = row['Артикул (SKU)']?.toString().trim();

          return {
            sku: skuFromFile || (name ? generateSKU(name) : ''),
            name,
            description: row['Описание']?.toString().trim() || null,
            category: row['Категория']?.toString().trim() || null,
            unit: row['Единица измерения']?.toString().trim() || 'шт',
            price: parseFloat(row['Цена за единицу']) || 0,
            min_stock: parseInt(row['Минимальный остаток']) || 0,
            barcode: null,
            photo_url: null,
            rowNumber,
            errors,
          };
        });

        const validRows = parsedItems.filter(item => item.errors.length === 0).length;
        const errorRows = parsedItems.length - validRows;

        resolve({
          items: parsedItems,
          totalRows: parsedItems.length,
          validRows,
          errorRows,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Ошибка чтения файла'));
    };

    reader.readAsArrayBuffer(file);
  });
};
