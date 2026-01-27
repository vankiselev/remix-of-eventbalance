
## План: Исправление сброса телефона при вводе в профиле

### Проблема

Компонент `PhoneInputRU` несовместим с react-hook-form в текущей реализации:

1. `PhoneInputRU.onChange` возвращает **объект** `{ display, e164, isValid }`
2. React-hook-form записывает этот объект в поле формы
3. При следующем рендере `value` приходит как объект, а не строка
4. `useEffect` в компоненте видит изменение `value`, вызывает `extractDigits(объект)` → возвращает `''`
5. `formatPhone('')` возвращает `'+7 ('` → цифры стираются

### Решение

Изменить обработку в `ProfilePage.tsx`, чтобы правильно интегрировать `PhoneInputRU` с react-hook-form:

### Изменения

**Файл:** `src/pages/ProfilePage.tsx`

1. Изменить использование `PhoneInputRU` с кастомным `onChange`:

```tsx
<FormField
  control={form.control}
  name="phone_display"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Телефон</FormLabel>
      <FormControl>
        <PhoneInputRU 
          value={field.value}
          onChange={(result) => field.onChange(result.display)}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

Вместо `{...field}` теперь явно:
- Передаём `value={field.value}` (строка)
- В `onChange` извлекаем `result.display` (строка) и передаём в `field.onChange`

### Почему это работает

| До | После |
|-----|-------|
| `onChange` передаёт объект | `onChange` передаёт строку |
| react-hook-form сохраняет объект | react-hook-form сохраняет строку |
| `value` — объект при рендере | `value` — строка при рендере |
| `extractDigits(объект)` → `''` | `extractDigits(строка)` → цифры |
| Цифры стираются | Цифры сохраняются |

### Дополнительно

Также добавлю проверку в `useEffect` компонента `PhoneInputRU`, чтобы он не перезаписывал `displayValue` если `value` — объект:

**Файл:** `src/components/ui/phone-input-ru.tsx`

```tsx
useEffect(() => {
  // Игнорируем если value — объект (некорректная интеграция с формой)
  if (value !== undefined && typeof value === 'string') {
    const digits = extractDigits(value);
    const formatted = formatPhone(digits);
    if (formatted !== displayValue) {
      setDisplayValue(formatted);
    }
  }
}, [value]);
```

### Результат

После применения:
- Ввод телефона будет работать корректно
- Цифры не будут стираться
- Форма будет хранить отформатированный номер в поле `phone_display`
