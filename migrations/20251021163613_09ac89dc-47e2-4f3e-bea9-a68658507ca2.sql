-- Назначаем разрешения для роли "Финансист"
-- Получаем ID разрешений и роли

DO $$
DECLARE
  role_id_financier UUID;
  perm_id UUID;
BEGIN
  -- Получаем ID роли финансиста
  SELECT id INTO role_id_financier FROM role_definitions WHERE code = 'accountant';
  
  IF role_id_financier IS NULL THEN
    RAISE EXCEPTION 'Роль финансиста не найдена';
  END IF;
  
  -- Назначаем разрешения для финансов
  
  -- finances.view_all - Просмотр всех транзакций
  SELECT id INTO perm_id FROM permissions WHERE code = 'finances.view_all';
  INSERT INTO role_permissions (role_id, permission_id, granted)
  VALUES (role_id_financier, perm_id, true)
  ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true, updated_at = now();
  
  -- finances.export - Экспорт данных
  SELECT id INTO perm_id FROM permissions WHERE code = 'finances.export';
  INSERT INTO role_permissions (role_id, permission_id, granted)
  VALUES (role_id_financier, perm_id, true)
  ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true, updated_at = now();
  
  -- finances.import - Импорт данных
  SELECT id INTO perm_id FROM permissions WHERE code = 'finances.import';
  INSERT INTO role_permissions (role_id, permission_id, granted)
  VALUES (role_id_financier, perm_id, true)
  ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true, updated_at = now();
  
  -- Назначаем разрешения для проверки транзакций
  
  -- transactions.view_all - Просмотр всех транзакций на проверке
  SELECT id INTO perm_id FROM permissions WHERE code = 'transactions.view_all';
  INSERT INTO role_permissions (role_id, permission_id, granted)
  VALUES (role_id_financier, perm_id, true)
  ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true, updated_at = now();
  
  -- transactions.review - Проверка транзакций
  SELECT id INTO perm_id FROM permissions WHERE code = 'transactions.review';
  INSERT INTO role_permissions (role_id, permission_id, granted)
  VALUES (role_id_financier, perm_id, true)
  ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true, updated_at = now();
  
  -- transactions.approve - Утверждение транзакций
  SELECT id INTO perm_id FROM permissions WHERE code = 'transactions.approve';
  INSERT INTO role_permissions (role_id, permission_id, granted)
  VALUES (role_id_financier, perm_id, true)
  ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true, updated_at = now();
  
  -- transactions.reject - Отклонение транзакций
  SELECT id INTO perm_id FROM permissions WHERE code = 'transactions.reject';
  INSERT INTO role_permissions (role_id, permission_id, granted)
  VALUES (role_id_financier, perm_id, true)
  ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true, updated_at = now();
  
  RAISE NOTICE 'Разрешения для роли "Финансист" успешно назначены';
END $$;