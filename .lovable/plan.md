
# GitHub Actions для автодеплоя Edge Functions на Self-Hosted Supabase

## Текущая ситуация

- Есть `deploy-migrations.yml` для деплоя SQL миграций через Docker exec
- Self-hosted runner уже настроен и работает
- 16 Edge Functions в `supabase/functions/`
- Supabase запущен через Docker Compose на сервере `superbag.eventbalance.ru`

---

## Решение

Создать новый workflow `.github/workflows/deploy-functions.yml`, который будет деплоить Edge Functions напрямую в контейнер Supabase Edge Runtime.

---

## Архитектура деплоя

```text
GitHub Push --> Self-Hosted Runner --> Docker контейнеры Supabase
                     |
                     +--> Копирование функций в volume
                     +--> Перезапуск edge-runtime контейнера
```

---

## Файлы для создания

### `.github/workflows/deploy-functions.yml`

Новый workflow со следующей логикой:

1. **Триггеры**:
   - Push в `main` при изменениях в `supabase/functions/**`
   - Ручной запуск через `workflow_dispatch`

2. **Шаги деплоя**:
   - Checkout кода
   - Определение имени контейнера Edge Runtime (обычно `supabase-edge-functions` или `supabase-functions`)
   - Копирование функций в Docker volume
   - Перезапуск контейнера для применения изменений

3. **Tracking**: Логирование каких функций было задеплоено

---

## Техническая реализация

Workflow будет:

```yaml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'
  workflow_dispatch:

jobs:
  deploy-functions:
    runs-on: self-hosted
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Deploy functions to Supabase
        run: |
          # Найти контейнер edge-runtime
          CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'edge|functions' | head -1)
          
          # Скопировать функции в volume
          docker cp supabase/functions/. $CONTAINER:/home/deno/functions/
          
          # Перезапустить для применения
          docker restart $CONTAINER
```

---

## Необходимая информация

Для точной настройки мне нужно знать:

1. **Имя контейнера Edge Runtime** - как называется контейнер с функциями?
   Проверь командой: `docker ps | grep -E 'edge|functions'`

2. **Путь к функциям в контейнере** - куда монтируются функции?
   Обычно это `/home/deno/functions/` или `/app/functions/`

3. **Структура docker-compose.yml** - как организован сервис edge-functions?

---

## Альтернативный вариант (без перезапуска)

Если Supabase edge-runtime поддерживает hot-reload, достаточно:

```bash
docker cp supabase/functions/. container:/path/to/functions/
```

Без перезапуска контейнера.

---

## Секреты для GitHub Actions

Добавить в настройках репозитория `Settings > Secrets`:

- `GOOGLE_AI_API_KEY` - для передачи в контейнер (если нужно обновлять секреты)

---

## Следующие шаги

1. Узнать имя контейнера Edge Runtime на сервере
2. Узнать путь монтирования функций
3. Создать workflow файл
4. Протестировать деплой
