

## Проблема

При скролле страницы шапка (header) исчезает, хотя у неё стоит `sticky top-0`.

**Причина**: на корневом `div` (строка 162 в `Layout.tsx`) установлен класс `overflow-x-hidden`. Это известная CSS-проблема — любой `overflow: hidden` (даже только по оси X) на предке ломает `position: sticky`, превращая его в обычный `relative`.

## Решение

### 1. Layout.tsx — убрать overflow-x-hidden с корневого div

- Строка 162: убрать `overflow-x-hidden` из корневого контейнера `div.min-h-screen`.
- Вместо этого добавить `overflow-x: hidden` на `<body>` или `<html>` через CSS (в `index.css` или `App.css`), чтобы горизонтальный скролл по-прежнему не появлялся, но `sticky` работал корректно.

### 2. index.css / App.css — overflow на body

- Добавить `html, body { overflow-x: hidden; }` — это не влияет на sticky, потому что sticky работает относительно viewport для элементов внутри body.

### 3. Также проверить десктопный main

- Строка 298: `main` имеет `overflow-hidden` — это может обрезать контент. Если дочерние страницы предполагают прокрутку через document scroll, нужно убрать `overflow-hidden` и с main тоже.

### Файлы
- `src/components/Layout.tsx` — убрать `overflow-x-hidden` с корневого div и `overflow-hidden` с main
- `src/index.css` (или `src/App.css`) — добавить `overflow-x: hidden` на `html, body`

