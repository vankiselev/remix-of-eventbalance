export interface Role {
  id: string;
  name: string;
  display_name: string;
  code: string;
  description: string | null;
  is_system: boolean;
  is_admin_role: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  category: string;
  name: string;
  description: string | null;
  scope_type: 'all' | 'own' | 'team' | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted: boolean;
  scope: 'all' | 'own' | 'team' | null;
  created_at: string;
  updated_at: string;
  permission?: Permission;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
}
