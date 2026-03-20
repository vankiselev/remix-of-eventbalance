

## Закрепить шапку на всех страницах системы

### Текущее состояние

Основной Layout уже имеет `sticky top-0 z-50` на десктопном и мобильном хедерах — это работает для большинства страниц (Мероприятия, Календарь, Дашборд, Финансы и др.).

Однако есть **отдельные страницы, которые не используют Layout** и имеют свои собственные нефиксированные шапки:
- `SuperAdminPage` — своя шапка без sticky
- `PrivacyPolicyPage` — своя шапка без sticky  
- `TermsOfUsePage` — своя шапка без sticky

Также `FinancialReportPage` использует Layout, но внутри имеет `overflow-hidden` контейнер, который может ограничивать высоту содержимого.

### Что нужно сделать

1. **SuperAdminPage** — добавить `sticky top-0 z-50` на `<header>` (строка ~187)

2. **PrivacyPolicyPage** — добавить `sticky top-0 z-50` на блок шапки

3. **TermsOfUsePage** — добавить `sticky top-0 z-50` на блок шапки

4. **FinancialReportPage** — проверить и убедиться, что внутренний `overflow-hidden` контейнер не мешает прокрутке основной страницы (при необходимости поправить высоту)

5. **Глобальная защита** — добавить в `index.css` утилитарное правило, гарантирующее что `html` и `body` не имеют `overflow-y: hidden`, и что корневой `#root` позволяет нативный скролл

### Технические детали

Файлы для изменения:
- `src/pages/SuperAdminPage.tsx` — `<header className="border-b bg-card">` → `<header className="sticky top-0 z-50 border-b bg-card">`
- `src/pages/PrivacyPolicyPage.tsx` — аналогичное добавление sticky
- `src/pages/TermsOfUsePage.tsx` — аналогичное добавление sticky
- `src/pages/FinancialReportPage.tsx` — убрать `overflow-hidden` с grid-контейнера или ограничить высоту через `max-h-[calc(100vh-...)]`
- `src/index.css` — убедиться что `html, body` не блокируют вертикальный скролл

