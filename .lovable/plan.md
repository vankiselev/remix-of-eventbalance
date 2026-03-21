

## Диагностика проблемы с загрузкой чеков

### Корневая причина

Проблема не в размере файла (1.78 МБ в пределах лимита). Изучив код и конфигурацию:

1. **Все запросы идут к self-hosted Supabase** (`superbag.eventbalance.ru`), а не к Lovable Cloud
2. Бакет `receipts` создан через миграцию как **приватный** (`public = false`)
3. В Safari ошибка "Load failed" — это известная проблема с CORS на storage-эндпоинтах Supabase (GitHub issue #20982). Safari строже проверяет preflight-запросы к storage API
4. Текущий код пытается загрузить файл в storage bucket, и при любой ошибке сети — полностью блокирует сохранение транзакции
5. Таблица `financial_transactions` уже имеет колонку `receipt_images` (ARRAY), которая не используется

### Решение — хранение чеков как сжатых base64 в БД

Полностью обойти storage bucket и хранить чеки прямо в колонке `receipt_images` на `financial_transactions`. Это устраняет зависимость от CORS, bucket-политик и storage RLS.

### Шаги реализации

**Шаг 1. Утилита сжатия изображений** (`src/utils/imageCompressor.ts`)
- Функция `compressImage(file, maxWidth=1200, quality=0.7)` → возвращает base64 data URL
- Для изображений: resize через Canvas + JPEG-сжатие (~100-300 КБ вместо 1-3 МБ)
- Для не-изображений (PDF): конвертация в base64 напрямую (до 5 МБ)
- Если файл слишком большой после конвертации — выдать понятную ошибку

**Шаг 2. Переписать `uploadFiles` в `TransactionFormNew.tsx`**
- Убрать storage upload, retry-логику и fallback-таблицы
- Вместо этого: сжать каждый файл → собрать массив base64 data URLs → UPDATE транзакцию, записав в `receipt_images`
- Если UPDATE не удался — выбросить ошибку (транзакция не сохраняется, как выбрано)

**Шаг 3. Обновить `AttachmentsView.tsx`**
- Читать `receipt_images` из данных транзакции (передаётся как проп)
- Для обратной совместимости: также проверять `financial_attachments` (для старых записей)
- Рендерить base64-изображения напрямую через `<img src={dataUrl} />`

**Шаг 4. Обновить `TransactionDetailDialog` / карточки**
- Передавать `receipt_images` в `AttachmentsView`

### Технические детали

```text
Текущий flow:
  File → Storage Upload (CORS FAIL) → DB Insert → ERROR

Новый flow:  
  File → Canvas Compress → base64 → UPDATE receipt_images[] → OK
```

- Колонка `receipt_images` (TEXT[]) уже существует в `financial_transactions`
- Каждый элемент массива = `data:image/jpeg;base64,...` (сжатый)
- Средний размер после сжатия: 100-300 КБ на файл
- До 5 файлов = max ~1.5 МБ в базе — допустимо для PostgreSQL

### Обратная совместимость
- Старые записи с `financial_attachments` продолжат работать
- Новые записи будут использовать `receipt_images` — без зависимости от storage

