# AI Transaction Analysis

## Endpoint

`analyze-transaction-description` — единый edge function, объединяющий проверку орфографии и категоризацию транзакций.

### Вход
```json
{
  "description": "string (обязательно, 2–500 символов)",
  "currentCategory": "string | null (опционально)"
}
```

### Выход
```json
{
  "success": true,
  "corrected_text": "Исправленный текст (заглавная первая буква, без точки в конце)",
  "has_errors": true/false,
  "category": "Категория из списка | null",
  "confidence": 0.0–1.0,
  "transaction_type": "expense | income",
  "reasoning": "Краткое пояснение | null"
}
```

## Пороги confidence

| Константа | Значение | Где | Назначение |
|-----------|----------|-----|------------|
| `MIN_CONFIDENCE_TO_RETURN_CATEGORY` | 0.6 | Backend + Frontend | Ниже — `category` возвращается как `null` |
| `MIN_CONFIDENCE_TO_AUTO_APPLY` | 0.75 | Frontend | Ниже — категория показывается как рекомендация, но не автоприменяется |

### Как работают пороги

1. **Backend** (edge function): если confidence < 0.6 → `category: null` в ответе.
2. **Frontend** (TransactionFormNew):
   - confidence ≥ 0.6 → категория **показывается** в блоке "Предложения AI".
   - confidence ≥ 0.75 → категория может быть **автоприменена** без подтверждения.
   - confidence < 0.6 → категория не показывается (уже null от backend).

## Нормализация категории (backend)

Модель может вернуть категорию с опечатками или в другом регистре. Backend выполняет 3 уровня нормализации:

1. **Exact match** — точное совпадение со списком.
2. **Case-insensitive** — совпадение без учёта регистра.
3. **Partial match** — категория содержит ответ модели или наоборот.

Если ни один уровень не нашёл матч → `category: null` + warning в логах.

## Troubleshooting: почему category может быть null

| Причина | Диагностика |
|---------|-------------|
| confidence < 0.6 | Лог `confidence` в edge function |
| Модель вернула текст не из списка | Лог `raw_category` vs `validated_category` |
| Описание слишком короткое (< 2 символов) | Минимум 2 символа для анализа |
| Описание неоднозначное | Модель не может выбрать категорию → низкий confidence |

## Frontend hook

```typescript
import { useTransactionAnalysis, MIN_CONFIDENCE_TO_AUTO_APPLY, MIN_CONFIDENCE_TO_RETURN_CATEGORY } from '@/hooks/useTransactionAnalysis';
```

## Legacy (удалено)

Следующие endpoint'ы и хуки были удалены после перехода на unified flow:

- ~~`check-transaction-description`~~ — заменён `analyze-transaction-description`
- ~~`suggest-transaction-fields`~~ — заменён `analyze-transaction-description`
- ~~`useDescriptionChecker`~~ — заменён `useTransactionAnalysis`
- ~~`useTransactionSuggestions`~~ — заменён `useTransactionAnalysis`
