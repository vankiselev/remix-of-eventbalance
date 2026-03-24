## Invite-flow: Reconciliation complete (2026-03-24)

### Канонический flow
1. **Validate** (`/invite?token=...`): `get_invitation_by_token(text)` — SECURITY DEFINER RPC
2. **Submit** (edge function `register-invited-user`):
   - Lookup по `invitation_id` (primary) → fallback `get_invitation_for_registration(text)`
   - Создание пользователя, профиль с `invitation_status='pending'`, `tenant_id`
   - **НЕ создает membership** — deferred на admin approval
   - Marks invitation `accepted`
3. **Awaiting** → пользователь на `/awaiting-invitation`
4. **Admin approval** → `approve_pending_user_membership(uuid)` — единственная точка создания membership

### Reconciliation migration
`migrations/20260324220000_a1a1a1a1-invite-flow-reconciliation.sql`:
- DROP/CREATE всех invite RPCs с каноническими сигнатурами
- Удаление anon policy на invitations
- profiles.invitation_status column + index
- tenant_memberships UNIQUE(tenant_id, user_id)

### Нейтрализованные файлы
- `20260324190000_a1b2c3d4-invite-rpcs.sql` → `SELECT 1`
- `20260324193000_b2c3d4e5-remove-anon-invitations-policy.sql` → `SELECT 1`
- `20260324200000_d4e5f6a7-ensure-invited-user-membership-rpc.sql` → `SELECT 1`
- `20260324210000_e5f6a7b8-invite-registration-rpcs.sql` → `SELECT 1`

### Deploy pipeline fix
`deploy-functions.yml`:
- Explicit `EDGE_CONTAINER` / `EDGE_FUNCTIONS_PATH` через secrets (нет авто-угадывания)
- Smoke-check version marker в register-invited-user
- register-invited-user добавлен в REQUIRED_FUNCS для верификации
