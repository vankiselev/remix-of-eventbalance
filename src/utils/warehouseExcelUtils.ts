import * as XLSX from 'xlsx';
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
export const exportWarehouseItemsToExcel = (
  items: WarehouseItemWithStock[]
) => {
  // Подготовка данных для экспорта
  const exportData = items.map(item => ({
    'Артикул (SKU)': item.sku || '',
    'Название': item.name || '',
    'Категория': item.category_name || '',
    'Описание': item.description || '',
    'Единица измерения': item.unit || 'шт',
    'Цена за единицу': item.price || 0,
    'Минимальный остаток': item.min_stock || 0,
    'Общее количество': item.total_quantity || 0,
    'Создан': new Date(item.created_at).toLocaleDateString('ru-RU'),
  }));

  // Создание книги Excel
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  // Настройка ширины колонок
  ws['!cols'] = [
    { wch: 15 }, // Артикул
    { wch: 30 }, // Название
    { wch: 20 }, // Категория
    { wch: 40 }, // Описание
    { wch: 15 }, // Единица
    { wch: 15 }, // Цена
    { wch: 15 }, // Мин остаток
    { wch: 15 }, // Количество
    { wch: 12 }, // Создан
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Товары');

  // Экспорт файла
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const fileName = `warehouse_items_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, fileName);
};

// Генерация Excel шаблона для импорта
export const generateImportTemplate = () => {
  const templateData = [
    {
      'Артикул (SKU)': 'КП-1234',
      'Название': 'Костюм пирата',
      'Категория': 'Костюмы',
      'Описание': 'Детский костюм пирата с аксессуарами',
      'Единица измерения': 'шт',
      'Цена за единицу': 1500,
      'Минимальный остаток': 5,
    },
    {
      'Артикул (SKU)': '',
      'Название': 'Шляпа ковбоя',
      'Категория': 'Аксессуары',
      'Описание': '',
      'Единица измерения': 'шт',
      'Цена за единицу': 300,
      'Минимальный остаток': 10,
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Настройка ширины колонок
  ws['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 20 },
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Шаблон импорта');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { 
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
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

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

    reader.readAsBinaryString(file);
  });
};
