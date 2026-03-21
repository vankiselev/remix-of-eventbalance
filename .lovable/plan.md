
Понял. По текущему коду и твоему уточнению (Иван в списке есть, но запрос не появляется) это не «UI-глюк», а рассинхрон ID получателя при создании перевода.

Что ломается сейчас:
1) В форме перевода есть два источника ID получателя:  
   - корректный `auth user id` (через `tenant_memberships.user_id`)  
   - fallback через `profiles.id`  
2) Для части пользователей (особенно в self-hosted/role-зависимом доступе) срабатывает fallback, и в `financial_transactions.transfer_to_user_id` уходит не тот ID.  
3) Тогда у отправителя трата сохраняется, но у адресата блок «Подтвердите перевод наличных вам» пустой, потому что запрос фильтруется по другому ID.

План срочного исправления:
1. Убрать двусмысленность ID на сервере  
   - добавить RPC `resolve_transfer_recipient` (SECURITY DEFINER), который принимает выбранный ID и `tenant_id`, и всегда возвращает канонический `auth user id` получателя в этом тенанте.  
   - если соответствие не найдено — возвращать ошибку (не сохранять перевод).

2. Перевести `TransactionFormNew` на канонический ID  
   - перед insert вызывать `resolve_transfer_recipient`;  
   - в `financial_transactions.transfer_to_user_id` и `notifications.user_id` писать только resolved auth-id;  
   - удалить fallback-ветку, где получатель берётся напрямую из `profiles.id`.

3. Сделать список получателей детерминированным  
   - получать сотрудников только из RPC (а не из смешанной client-side логики memberships/profiles);  
   - в UI хранить `value = auth user id`, а имя/email только как label;  
   - дедупликация по `auth user id`.

4. Починить отображение для уже созданных “битых” pending переводов  
   - миграция-ремонт: для `transfer_status='pending'` попытаться переопределить `transfer_to_user_id` в канонический auth-id (через membership/profile mapping);  
   - миграция идемпотентная, безопасная для повторного запуска.

5. Усилить `MoneyTransferRequests`  
   - оставить основной фильтр по `transfer_to_user_id = auth.uid()`;  
   - добавить fallback-подгрузку по `notifications.data.transaction_id` для legacy-записей (чтобы ничего не терялось до полной санации).

6. Логирование для быстрого контроля  
   - логировать: `selectedRecipientId`, `resolvedRecipientAuthId`, `storedTransferToUserId`, `transactionId`;  
   - отдельный лог при невозможности резолва получателя (чёткая ошибка вместо “тихого” сохранения).

Технические детали (коротко):
```text
Было:
Petr selects recipient -> иногда profiles.id -> transfer_to_user_id записан не как auth uid -> Ivan не видит pending

Станет:
Petr selects recipient -> RPC resolve_transfer_recipient -> всегда auth uid -> transfer_to_user_id корректный -> Ivan стабильно видит pending
```

Файлы/области, которые правим в реализации:
- `src/components/finance/TransactionFormNew.tsx` (создание перевода + загрузка получателей)
- `src/components/finance/MoneyTransferRequests.tsx` (fallback на legacy)
- новая SQL-миграция с:
  - `resolve_transfer_recipient`
  - data-fix для `financial_transactions.transfer_to_user_id`
