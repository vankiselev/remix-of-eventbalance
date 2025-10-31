import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatFullName } from '@/utils/formatName';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  userRole: string | null;
  userRoleName: string | null;
  userProfile: { 
    full_name: string; 
    last_name?: string;
    first_name?: string;
    middle_name?: string;
    avatar_url: string | null;
  } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoleName, setUserRoleName] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ 
    full_name: string;
    last_name?: string;
    first_name?: string;
    middle_name?: string;
    avatar_url: string | null;
  } | null>(null);

  // Load user profile and check employment status
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) {
        setUserRole(null);
        setUserRoleName(null);
        setUserProfile(null);
        return;
      }

      const { data } = await supabase
        .rpc("get_user_basic_profile")
        .single();
      
      if (data) {
        setUserRole(data.role || 'employee');
        setUserProfile({
          full_name: formatFullName(data),
          last_name: data.last_name,
          first_name: data.first_name,
          middle_name: data.middle_name,
          avatar_url: data.avatar_url || null
        });

        // Загружаем RBAC роли пользователя и определяем, является ли он админом
        const { data: rbacRoles } = await supabase
          .from('user_role_assignments')
          .select('role_definitions(is_admin_role, name)')
          .eq('user_id', user.id);

        const hasAdminRole = Array.isArray(rbacRoles)
          ? rbacRoles.some((r: any) => r.role_definitions?.is_admin_role === true)
          : false;

        // Синхронизируем совместимый userRole для всего приложения
        setUserRole(hasAdminRole ? 'admin' : (data.role || 'employee'));

        // Человекочитаемое имя роли для бейджа
        if (rbacRoles && rbacRoles.length > 0) {
          const firstRoleName = rbacRoles[0]?.role_definitions?.name;
          setUserRoleName(firstRoleName || (hasAdminRole ? 'Администратор' : 'Сотрудник'));
        } else {
          setUserRoleName(hasAdminRole ? 'Администратор' : 'Сотрудник');
        }

        // Check employment status
        const { data: profile } = await supabase
          .from('profiles')
          .select('employment_status, termination_date')
          .eq('id', user.id)
          .single();

        if (profile?.employment_status === 'terminated') {
          const terminationDate = profile.termination_date 
            ? new Date(profile.termination_date).toLocaleDateString('ru-RU')
            : '';
          const message = terminationDate 
            ? `Доступ закрыт! Вы были уволены ${terminationDate}`
            : 'Доступ закрыт! Вы были уволены';
          toast.error(message, { duration: 10000 });
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setUserRole(null);
          setUserRoleName(null);
          setUserProfile(null);
          window.location.href = '/auth';
        }
      }
    };

    if (user) {
      loadUserProfile();
    }
  }, [user]);

  // Real-time subscription for role changes
  useEffect(() => {
    if (!user) return;

    const roleChannel = supabase
      .channel(`user-role-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_role_assignments',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Role changed for current user:', payload);
          
          // Reload user profile
          const { data } = await supabase
            .rpc("get_user_basic_profile")
            .single();
          
          if (data) {
            // Перечитываем RBAC роли и определяем админский статус
            const { data: rbacRoles } = await supabase
              .from('user_role_assignments')
              .select('role_definitions(is_admin_role, name)')
              .eq('user_id', user.id);

            const hasAdminRole = Array.isArray(rbacRoles)
              ? rbacRoles.some((r: any) => r.role_definitions?.is_admin_role === true)
              : false;

            setUserRole(hasAdminRole ? 'admin' : (data.role || 'employee'));

            const newRoleName = (rbacRoles && rbacRoles[0]?.role_definitions?.name) || (hasAdminRole ? 'Администратор' : 'Сотрудник');
            setUserRoleName(newRoleName);
            
            toast.success('Ваша роль была изменена администратором', {
              description: `Новая роль: ${newRoleName}`,
              duration: 5000
            });
            
            // Force page reload after 2 seconds
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roleChannel);
    };
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserRole(null);
      setUserRoleName(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    session,
    user,
    loading,
    userRole,
    userRoleName,
    userProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};