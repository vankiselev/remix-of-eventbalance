
# Миграция с xlsx на exceljs для устранения уязвимости CVE-2023-30533

## Проблема

Пакет `xlsx` (SheetJS) версии 0.18.5 содержит критическую уязвимость **Prototype Pollution** (CVE-2023-30533, CVSS 7.8/10). Уязвимость позволяет злоумышленнику выполнить произвольный код при загрузке специально сформированного Excel файла.

Npm-пакет `xlsx` больше не поддерживается - исправленная версия 0.19.3 доступна только через CDN разработчика.

---

## Решение

Заменить `xlsx` на `exceljs` - активно поддерживаемую библиотеку с похожим API.

---

## Затрагиваемые файлы (6 файлов)

| Файл | Функционал |
|------|-----------|
| `src/utils/warehouseExcelUtils.ts` | Экспорт/импорт товаров склада |
| `src/components/ImportDialog.tsx` | Импорт мероприятий |
| `src/components/EventsImportDialog.tsx` | Расширенный импорт событий |
| `src/components/finance/FinancesImportDialog.tsx` | Импорт финансовых транзакций |
| `src/components/finance/reports/EstimateImportDialog.tsx` | Импорт смет |
| `src/components/reports/ReportsImportDialog.tsx` | Импорт отчётов |

---

## Техническая информация

### Изменения в зависимостях

```json
// package.json - удалить:
"xlsx": "^0.18.5"

// package.json - добавить:
"exceljs": "^4.4.0"
```

### Основные отличия API

| Операция | xlsx | exceljs |
|----------|------|---------|
| Чтение файла | `XLSX.read(data, {type: 'binary'})` | `workbook.xlsx.load(arrayBuffer)` |
| Получение листа | `workbook.Sheets[sheetName]` | `workbook.getWorksheet(sheetName)` |
| Данные в JSON | `XLSX.utils.sheet_to_json(sheet)` | Итерация по `worksheet.eachRow()` |
| Создание книги | `XLSX.utils.book_new()` | `new ExcelJS.Workbook()` |
| Запись в буфер | `XLSX.write(wb, {type: 'array'})` | `workbook.xlsx.writeBuffer()` |

### Пример рефакторинга (warehouseExcelUtils.ts)

До (xlsx):
```typescript
import * as XLSX from 'xlsx';

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
```

После (exceljs):
```typescript
import ExcelJS from 'exceljs';

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1');
worksheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
data.forEach(row => worksheet.addRow(row));
const buffer = await workbook.xlsx.writeBuffer();
```

### Паттерн чтения файла

До (xlsx):
```typescript
reader.readAsBinaryString(file);
reader.onload = (e) => {
  const workbook = XLSX.read(e.target.result, { type: 'binary' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
};
```

После (exceljs):
```typescript
reader.readAsArrayBuffer(file);
reader.onload = async (e) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(e.target.result);
  const worksheet = workbook.worksheets[0];
  const data = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) { // Пропуск заголовка
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        rowData[headers[colNumber - 1]] = cell.value;
      });
      data.push(rowData);
    }
  });
};
```

---

## План изменений по файлам

### 1. `src/utils/warehouseExcelUtils.ts`
- Заменить импорт `xlsx` на `exceljs`
- Переписать `exportWarehouseItemsToExcel()` с использованием `ExcelJS.Workbook`
- Переписать `generateImportTemplate()` аналогично
- Переписать `parseWarehouseExcelFile()` с `workbook.xlsx.load()`

### 2. `src/components/ImportDialog.tsx`
- Заменить `XLSX.read()` на `workbook.xlsx.load()`
- Изменить `readAsBinaryString` на `readAsArrayBuffer`
- Адаптировать парсинг данных через `worksheet.eachRow()`

### 3. `src/components/EventsImportDialog.tsx`
- Аналогичные изменения для чтения Excel
- Сохранить логику определения заголовков
- Адаптировать обработку объединённых ячеек

### 4. `src/components/finance/FinancesImportDialog.tsx`
- Переписать `processExcelSheet()` с новым API
- Сохранить логику автоопределения диапазона
- Адаптировать парсинг дат из Excel (числовые значения)

### 5. `src/components/finance/reports/EstimateImportDialog.tsx`
- Переписать `onDrop` обработчик с `exceljs`
- Сохранить логику автоопределения колонок

### 6. `src/components/reports/ReportsImportDialog.tsx`
- Переписать `loadExcelWorkbook()` и `processExcelSheet()`
- Адаптировать работу с листами

---

## Особые случаи для обработки

1. **Excel серийные даты** - exceljs автоматически конвертирует даты, но нужно проверить совместимость с текущей логикой `parseDate()`

2. **Объединённые ячейки** - exceljs поддерживает через `worksheet.unMergeCells()`, нужно адаптировать `handleMergedCells()`

3. **Ширина колонок** - в exceljs задаётся через `column.width` вместо `ws['!cols']`

---

## Результат

После применения изменений:
- Устранена уязвимость CVE-2023-30533 (Prototype Pollution)
- Библиотека `exceljs` активно поддерживается (последний релиз: декабрь 2024)
- Все функции импорта/экспорта Excel сохранены
- Улучшена типизация благодаря встроенным TypeScript типам в exceljs
