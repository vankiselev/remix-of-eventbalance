import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatFullName } from '@/utils/formatName';

interface RbacRole {
  name: string;
  code: string;
  is_admin_role: boolean;
}

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
    invitation_status?: string;
  } | null;
  rbacRoles: RbacRole[];
  permissions: string[];
  isAdmin: boolean;
  isPendingInvitation: boolean;
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
    invitation_status?: string;
  } | null>(null);
  const [rbacRoles, setRbacRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPendingInvitation, setIsPendingInvitation] = useState(false);

  // Load cached data immediately
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('[AuthContext] Loading from cache');
          if (data.profile) {
            setUserRole(data.profile.role || 'employee');
            setUserProfile({
              full_name: formatFullName(data.profile),
              last_name: data.profile.last_name,
              first_name: data.profile.first_name,
              middle_name: data.profile.middle_name,
              avatar_url: data.profile.avatar_url || null
            });
          }
          setRbacRoles(data.rbac_roles || []);
          setPermissions(data.permissions || []);
          const adminStatus = data.rbac_roles?.some((r: RbacRole) => r.is_admin_role) || false;
          setIsAdmin(adminStatus);
          setUserRoleName(data.rbac_roles?.[0]?.name || (adminStatus ? 'Администратор' : 'Сотрудник'));
          return true;
        }
      }
    } catch (e) {
      console.error('[AuthContext] Cache load error:', e);
    }
    return false;
  };

  // Unified data loading function
  const loadUserData = async (showLoadingState = true) => {
    if (!user) {
      setUserRole(null);
      setUserRoleName(null);
      setUserProfile(null);
      setRbacRoles([]);
      setPermissions([]);
      setIsAdmin(false);
      localStorage.removeItem(CACHE_KEY);
      return;
    }

    try {
      // Load all data in one call using optimized RPC
      const { data, error } = await supabase.rpc('get_user_profile_with_roles');
      
      if (error) throw error;
      
      console.log('[AuthContext] Loaded user data:', data);
      
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const profileData = data as any;
        
        // Check employment status
        if (profileData.profile?.employment_status === 'terminated') {
          const terminationDate = profileData.profile.termination_date 
            ? new Date(profileData.profile.termination_date).toLocaleDateString('ru-RU')
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
          setRbacRoles([]);
          setPermissions([]);
          setIsAdmin(false);
          localStorage.removeItem(CACHE_KEY);
          window.location.href = '/auth';
          return;
        }

        // Set profile data
        if (profileData.profile) {
          const adminStatus = profileData.rbac_roles?.some((r: RbacRole) => r.is_admin_role) || false;
          const pendingStatus = profileData.profile.invitation_status === 'pending';
          
          setUserRole(adminStatus ? 'admin' : (profileData.profile.role || 'employee'));
          setUserProfile({
            full_name: formatFullName(profileData.profile),
            last_name: profileData.profile.last_name,
            first_name: profileData.profile.first_name,
            middle_name: profileData.profile.middle_name,
            avatar_url: profileData.profile.avatar_url || null,
            invitation_status: profileData.profile.invitation_status
          });
          setRbacRoles(profileData.rbac_roles || []);
          setPermissions(profileData.permissions || []);
          setIsAdmin(adminStatus);
          setIsPendingInvitation(pendingStatus);
          setUserRoleName(profileData.rbac_roles?.[0]?.name || (adminStatus ? 'Администратор' : 'Сотрудник'));
        }

        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: profileData,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('[AuthContext] Error loading user data:', error);
    }
  };

  // Load user profile and check employment status
  useEffect(() => {
    if (!user) {
      loadUserData();
      return;
    }

    // Load from cache first (instant)
    const hasCache = loadFromCache();
    
    // Then load fresh data in background
    loadUserData(false);
  }, [user]);

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
        () => {
          console.log('[AuthContext] Role assignment changed, reloading...');
          setTimeout(() => loadUserData(false), 0);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          console.log('[AuthContext] Profile changed, reloading...');
          setTimeout(() => loadUserData(false), 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      setRbacRoles([]);
      setPermissions([]);
      setIsAdmin(false);
      setIsPendingInvitation(false);
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const hasPermission = (code: string) => {
    if (isAdmin) return true;
    return permissions.includes(code);
  };

  const refetchUserData = async () => {
    await loadUserData();
  };

  const value = {
    session,
    user,
    loading,
    userRole,
    userRoleName,
    userProfile,
    rbacRoles,
    permissions,
    isAdmin,
    isPendingInvitation,
    hasPermission,
    signOut,
    refetchUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
