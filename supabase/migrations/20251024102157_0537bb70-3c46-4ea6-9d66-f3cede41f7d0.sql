-- Update Financier role permissions
DO $$
DECLARE
  financier_role_id uuid;
  perm_id uuid;
BEGIN
  -- Get financier role ID
  SELECT id INTO financier_role_id 
  FROM public.role_definitions 
  WHERE code = 'financier' OR name = 'Финансист';

  -- If role doesn't exist, create it
  IF financier_role_id IS NULL THEN
    INSERT INTO public.role_definitions (name, code, description, is_system, is_admin_role)
    VALUES (
      'Финансист',
      'financier',
      'Управление и проверка финансовых транзакций',
      true,
      false
    )
    RETURNING id INTO financier_role_id;
  END IF;

  -- Assign transaction permissions to financier role
  FOR perm_id IN 
    SELECT id FROM public.permissions 
    WHERE code IN (
      'transactions.review',
      'transactions.approve', 
      'transactions.reject',
      'transactions.view_all'
    )
  LOOP
    INSERT INTO public.role_permissions (role_id, permission_id, granted, scope)
    VALUES (financier_role_id, perm_id, true, 'all')
    ON CONFLICT (role_id, permission_id) DO UPDATE
    SET granted = true, scope = 'all', updated_at = now();
  END LOOP;
END $$;