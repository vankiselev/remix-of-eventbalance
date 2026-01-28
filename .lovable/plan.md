
# Исправление отображения мобильного меню в Capacitor WebView

## Проблема
Меню "Ещё" (Sheet) обрезается снизу при просмотре через Capacitor WebView (нативное приложение), хотя в обычном браузере всё отображается корректно. На скриншоте видно, что третий ряд иконок частично скрыт.

## Причина
Разница в обработке **safe-area-inset-bottom** между браузером и Capacitor WebView:

1. В Capacitor на iPhone добавляется safe area для home indicator (~34px)
2. Нижняя навигация правильно использует `safe-area-inset-bottom` класс
3. Но Sheet использует фиксированный отступ `mb-[88px]`, который не учитывает safe area
4. В результате Sheet позиционируется неправильно и частично перекрывается нижней навигацией

## Решение
Заменить фиксированный отступ на динамический, который учитывает safe area.

### Изменения в файлах

**1. src/components/navigation/MobileNavEnhanced.tsx**
- Изменить класс `mb-[88px]` на `mb-[calc(88px+env(safe-area-inset-bottom))]`
- Это гарантирует, что Sheet будет корректно позиционирован как в браузере, так и в Capacitor WebView

**2. src/index.css** (опционально)
- Добавить утилитарный класс для повторного использования:
```css
.mb-nav-safe {
  margin-bottom: calc(88px + env(safe-area-inset-bottom));
}
```

## Технические детали

Формула отступа:
- **88px** = высота нижней навигации (py-3 + иконка 40px + текст + gap)
- **env(safe-area-inset-bottom)** = динамическая safe area (0 в браузере, ~34px на iPhone в Capacitor)

Итоговый CSS:
```css
margin-bottom: calc(88px + env(safe-area-inset-bottom));
```

## Ожидаемый результат
После исправления меню "Ещё" будет полностью видимым на всех устройствах:
- В обычном браузере: отступ 88px (как сейчас)
- В Capacitor WebView на iPhone: отступ 88px + ~34px safe area = ~122px
