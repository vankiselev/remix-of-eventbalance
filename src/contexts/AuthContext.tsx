import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatFullName } from '@/utils/formatName';
import { normalizeAvatarUrl } from '@/utils/normalizeAvatarUrl';

interface RbacRole {
  name: string;
  code: string;
  is_admin_role: boolean;
}

interface UserProfile {
  full_name: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  avatar_url: string | null;
  invitation_status?: string;
}

interface UserData {
  userRole: string | null;
  userRoleName: string | null;
  userProfile: UserProfile | null;
  rbacRoles: RbacRole[];
  permissions: string[];
  isAdmin: boolean;
  isPendingInvitation: boolean;
}

const EMPTY_USER_DATA: UserData = {
  userRole: null,
  userRoleName: null,
  userProfile: null,
  rbacRoles: [],
  permissions: [],
  isAdmin: false,
  isPendingInvitation: false,
};

interface AuthContextType extends UserData {
  session: Session | null;
  user: User | null;
  loading: boolean;
  hasPermission: (code: string) => boolean;
  signOut: () => Promise<void>;
  refetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY = 'user_profile_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData>(EMPTY_USER_DATA);

  // Derive user from session — single source of truth
  const user = session?.user ?? null;
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // Load cached data immediately — returns true if cache was valid
  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION && data.profile) {
          const adminStatus = data.rbac_roles?.some((r: RbacRole) => r.is_admin_role) || false;
          setUserData({
            userRole: adminStatus ? 'admin' : (data.profile.role || 'employee'),
            userRoleName: data.rbac_roles?.[0]?.name || (adminStatus ? 'Администратор' : 'Сотрудник'),
            userProfile: {
              full_name: formatFullName(data.profile),
              last_name: data.profile.last_name,
              first_name: data.profile.first_name,
              middle_name: data.profile.middle_name,
              avatar_url: normalizeAvatarUrl(data.profile.avatar_url),
            },
            rbacRoles: data.rbac_roles || [],
            permissions: data.permissions || [],
            isAdmin: adminStatus,
            isPendingInvitation: data.profile.invitation_status === 'pending',
          });
          return true;
        }
      }
    } catch (e) {
      console.error('[AuthContext] Cache load error:', e);
    }
    return false;
  }, []);

  // Force sign out and redirect — single place for all "kick user" scenarios
  const forceSignOut = useCallback(async (message: string) => {
    toast.error(message, { duration: 10000 });
    await supabase.auth.signOut();
    setSession(null);
    setUserData(EMPTY_USER_DATA);
    localStorage.removeItem(CACHE_KEY);
    window.location.href = '/auth';
  }, []);

  // Unified data loading function
  const loadUserData = useCallback(async () => {
    // Use ref to get current user without needing it as dependency
    const currentUser = userRef.current;
    if (!currentUser) {
      setUserData(EMPTY_USER_DATA);
      localStorage.removeItem(CACHE_KEY);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_profile_with_roles');
      if (error) throw error;

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const profileData = data as any;

        // If profile doesn't exist — account was deleted
        // Grace period: don't force sign out if account was just created (< 60s)
        if (!profileData.profile) {
          const createdAt = currentUser.created_at ? new Date(currentUser.created_at).getTime() : 0;
          const accountAge = Date.now() - createdAt;
          if (accountAge > 60000) {
            await forceSignOut('Ваш аккаунт был удалён');
          }
          return;
        }

        // Check employment status
        if (profileData.profile?.employment_status === 'terminated') {
          const terminationDate = profileData.profile.termination_date
            ? new Date(profileData.profile.termination_date).toLocaleDateString('ru-RU')
            : '';
          const message = terminationDate
            ? `Доступ закрыт! Вы были уволены ${terminationDate}`
            : 'Доступ закрыт! Вы были уволены';
          await forceSignOut(message);
          return;
        }

        // Set all profile data in ONE setState call
        const adminStatus = profileData.rbac_roles?.some((r: RbacRole) => r.is_admin_role) || false;

        setUserData({
          userRole: adminStatus ? 'admin' : (profileData.profile.role || 'employee'),
          userRoleName: profileData.rbac_roles?.[0]?.name || (adminStatus ? 'Администратор' : 'Сотрудник'),
          userProfile: {
            full_name: formatFullName(profileData.profile),
            last_name: profileData.profile.last_name,
            first_name: profileData.profile.first_name,
            middle_name: profileData.profile.middle_name,
            avatar_url: normalizeAvatarUrl(profileData.profile.avatar_url),
            invitation_status: profileData.profile.invitation_status,
          },
          rbacRoles: profileData.rbac_roles || [],
          permissions: profileData.permissions || [],
          isAdmin: adminStatus,
          isPendingInvitation: profileData.profile.invitation_status === 'pending',
        });

        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: profileData,
          timestamp: Date.now(),
        }));
      }
    } catch (error) {
      console.error('[AuthContext] Error loading user data:', error);
    }
  }, [forceSignOut]);

  // Load user profile when user changes
  useEffect(() => {
    if (!user) {
      loadUserData();
      return;
    }

    // Load from cache first (instant), then fresh data in background
    loadFromCache();
    loadUserData();
  }, [user, loadFromCache, loadUserData]);

  // Single realtime subscription for all user data changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_role_assignments',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadUserData()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => loadUserData()
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => forceSignOut('Ваш аккаунт был удалён')
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadUserData, forceSignOut]);

  // Periodic session health check — fallback if realtime misses DELETE
  useEffect(() => {
    if (!user) return;

    const checkProfileExists = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && !data) {
          // Grace period: don't force sign out for newly created accounts
          const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
          const accountAge = Date.now() - createdAt;
          if (accountAge > 60000) {
            await forceSignOut('Ваш аккаунт был удалён');
          }
        }
      } catch (e) {
        // Silently ignore network errors in health check
      }
    };

    const interval = setInterval(checkProfileExists, 60000);
    return () => clearInterval(interval);
  }, [user, forceSignOut]);

  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUserData(EMPTY_USER_DATA);
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  const hasPermission = useCallback((code: string) => {
    if (userData.isAdmin) return true;
    return userData.permissions.includes(code);
  }, [userData.isAdmin, userData.permissions]);

  const value = useMemo<AuthContextType>(() => ({
    session,
    user,
    loading,
    ...userData,
    hasPermission,
    signOut,
    refetchUserData: loadUserData,
  }), [session, user, loading, userData, hasPermission, signOut, loadUserData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
