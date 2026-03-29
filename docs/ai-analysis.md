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

## Frontend hook

```typescript
import { useTransactionAnalysis, MIN_CONFIDENCE_TO_AUTO_APPLY } from '@/hooks/useTransactionAnalysis';
```

## Legacy (удалено)

Следующие endpoint'ы и хуки были удалены после перехода на unified flow:

- ~~`check-transaction-description`~~ — заменён `analyze-transaction-description`
- ~~`suggest-transaction-fields`~~ — заменён `analyze-transaction-description`
- ~~`useDescriptionChecker`~~ — заменён `useTransactionAnalysis`
- ~~`useTransactionSuggestions`~~ — заменён `useTransactionAnalysis`
