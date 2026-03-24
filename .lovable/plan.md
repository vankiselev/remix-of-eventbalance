
Цель: за один проход убрать повторяемые сбои invite-flow и исключить повтор «в проде старая/частично новая логика».

Что уже видно по коду (диагноз):
1) В репозитории фронт уже ведет invite-успех на `/awaiting-invitation` и не делает auto-login в `InvitePage.tsx`.
2) В текущем `supabase/functions/register-invited-user/index.ts` membership на регистрации уже отключен (deferred на admin approval).
3) Главный риск рассинхрона — не логика страницы, а деплой/миграции: есть дублирующие и конфликтующие invite-миграции в `migrations/` + параллельные SQL в `supabase/migrations/`.
4) Workflow функций ищет контейнер эвристикой; это может давать «деплой не туда/не та версия в рантайме».

План исправления (финальный, без точечных латок):
1) Зафиксировать один источник истины для self-hosted
- Оставить боевой SQL только в `migrations/` (именно его применяет `deploy-migrations.yml`).
- Invite-изменения в `supabase/migrations/` считать небоевыми для self-hosted и не использовать как источник правды.
- Удалить/архивировать конфликтные invite-файлы, которые переопределяют одни и те же RPC разными сигнатурами.

2) Сделать одну reconciliation-миграцию «канонического invite-flow»
- Принудительно `DROP/CREATE` и зафиксировать финальные RPC:
  - `get_invitation_by_token(text)` (validate-step),
  - `get_invitation_for_registration(text)` (submit fallback),
  - `accept_invitation_for_registration(uuid)` (accept-step),
  - `approve_pending_user_membership(uuid)` (единственная точка создания membership).
- Удалить/деактивировать legacy RPC, создающие membership на этапе регистрации.
- Подтвердить отсутствие широкой anon-policy на `invitations` (валидация только через SECURITY DEFINER RPC).

3) Довести код до жесткого контракта approval flow
- `InvitePage`: submit только с `invitation_id` + token fallback, success/exists → только `/awaiting-invitation`.
- `register-invited-user`: create user + profile `invitation_status='pending'` + `tenant_id`; без `tenant_memberships` write.
- `PendingUsersManagement`: membership создается только через `approve_pending_user_membership`, после этого перевод статуса в `invited`.

4) Закрыть deployment gap (чтобы «такого больше не было»)
- В `deploy-functions.yml` убрать авто-угадывание контейнера: явный target контейнер через env/secret.
- Добавить post-deploy smoke-check по реальному endpoint `register-invited-user` и проверку `version` marker из ответа.
- Добавить fail-fast в pipeline, если marker не совпал с ожидаемым (значит рантайм не обновился).

5) Контрольная end-to-end проверка (обязательная)
- Новый invite link открывается.
- Submit создает аккаунт и профиль pending.
- До approval логин ведет на `/awaiting-invitation`.
- Admin approval создает membership (одна точка).
- После approval логин пускает в tenant.
- Invitation получает корректный accepted lifecycle без «токен не найден».

Технические изменения по файлам:
- `migrations/`:
  - новая reconciliation migration для RPC + policy cleanup,
  - удаление/нейтрализация конфликтных invite migration override.
- `src/pages/InvitePage.tsx`: финальная проверка контракта redirect/submit.
- `src/components/admin/PendingUsersManagement.tsx`: атомарный approval path через RPC.
- `.github/workflows/deploy-functions.yml`: фикс target runtime + marker smoke-check.

Результат после выполнения:
- Один канонический сценарий: registration → pending → admin approval → access.
- Одна точка создания membership (только admin approval RPC).
- Исключен рассинхрон «код в репо новый, прод рантайм старый».
