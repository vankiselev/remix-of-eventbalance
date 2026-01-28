import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  plan: string;
  trial_ends_at: string | null;
  created_at: string;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role_id: string | null;
  is_owner: boolean;
  status: 'active' | 'pending' | 'suspended';
  joined_at: string | null;
  tenant?: Tenant;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenantMemberships: TenantMembership[];
  isLoadingTenant: boolean;
  tenantError: string | null;
  setCurrentTenant: (tenant: Tenant) => void;
  hasTenantAccess: (tenantSlug: string) => boolean;
  isTenantOwner: boolean;
  isTenantAdmin: boolean;
  refetchMemberships: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Reserved slugs that cannot be used by tenants
const RESERVED_SLUGS = ['auth', 'register', 'admin', 'api', 'awaiting-invitation', 'administration', 'dashboard', 'settings', 'profile'];

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, isAdmin: isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [tenantMemberships, setTenantMemberships] = useState<TenantMembership[]>([]);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  // Extract tenant slug from URL
  const getTenantSlugFromUrl = useCallback(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const potentialSlug = pathParts[0];
      // Skip reserved routes
      if (!RESERVED_SLUGS.includes(potentialSlug)) {
        return potentialSlug;
      }
    }
    return null;
  }, [location.pathname]);

  // Fetch user's tenant memberships
  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setTenantMemberships([]);
      setCurrentTenantState(null);
      setIsLoadingTenant(false);
      return;
    }

    try {
      setIsLoadingTenant(true);
      
      // Fetch memberships with tenant data using RPC (tables not in types.ts yet)
      // Use type assertion to bypass strict typing until types are regenerated
      const { data, error } = await (supabase.rpc as any)('get_user_tenant_memberships');

      if (error) {
        // Tables might not exist yet, gracefully handle
        console.warn('[TenantContext] tenant_memberships not available yet:', error.message);
        setTenantMemberships([]);
        setIsLoadingTenant(false);
        return;
      }

      // Parse the response - RPC returns JSONB which could be array or need parsing
      let parsedData: any[] = [];
      if (Array.isArray(data)) {
        parsedData = data;
      } else if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = [];
        }
      } else if (data && typeof data === 'object') {
        parsedData = Array.isArray(data) ? data : [data];
      }

      const memberships: TenantMembership[] = parsedData.map((m: any) => ({
        id: m.id,
        tenant_id: m.tenant_id,
        user_id: m.user_id,
        role_id: m.role_id,
        is_owner: m.is_owner,
        status: m.status,
        joined_at: m.joined_at,
        tenant: m.tenant ? {
          id: m.tenant.id,
          slug: m.tenant.slug,
          name: m.tenant.name,
          logo_url: m.tenant.logo_url,
          settings: m.tenant.settings || {},
          is_active: m.tenant.is_active,
          plan: m.tenant.plan,
          trial_ends_at: m.tenant.trial_ends_at,
          created_at: m.tenant.created_at,
        } : undefined,
      }));

      setTenantMemberships(memberships);

      // Determine current tenant from URL
      const urlSlug = getTenantSlugFromUrl();
      
      if (urlSlug) {
        // Try to find tenant matching URL
        const matchingMembership = memberships.find(m => m.tenant?.slug === urlSlug);
        
        if (matchingMembership?.tenant) {
          setCurrentTenantState(matchingMembership.tenant);
          setTenantError(null);
        } else if (isSuperAdmin) {
          // Super admin can access any tenant - fetch directly
          const { data: tenantData, error: tenantError } = await (supabase.rpc as any)(
            'get_tenant_by_slug', 
            { _slug: urlSlug }
          );
          
          if (tenantError || !tenantData) {
            setTenantError('Компания не найдена');
            setCurrentTenantState(null);
          } else {
            // Parse tenant data
            const tenant = typeof tenantData === 'string' ? JSON.parse(tenantData) : tenantData;
            setCurrentTenantState(tenant as Tenant);
            setTenantError(null);
          }
        } else {
          setTenantError('У вас нет доступа к этой компании');
          setCurrentTenantState(null);
        }
      } else {
        // No tenant in URL - use fallback logic for legacy routes
        const savedSlug = localStorage.getItem('last_tenant_slug');
        
        if (savedSlug) {
          // Try to restore from localStorage
          const savedMembership = memberships.find(m => m.tenant?.slug === savedSlug && m.status === 'active');
          if (savedMembership?.tenant) {
            setCurrentTenantState(savedMembership.tenant);
            setIsLoadingTenant(false);
            return;
          }
        }
        
        // Fallback: select first available active tenant
        const firstActiveMembership = memberships.find(m => m.status === 'active' && m.tenant);
        if (firstActiveMembership?.tenant) {
          setCurrentTenantState(firstActiveMembership.tenant);
          localStorage.setItem('last_tenant_slug', firstActiveMembership.tenant.slug);
        } else {
          setCurrentTenantState(null);
        }
      }
    } catch (error) {
      console.error('[TenantContext] Error fetching memberships:', error);
      // Don't show error if tables just don't exist yet
      setTenantMemberships([]);
    } finally {
      setIsLoadingTenant(false);
    }
  }, [user, getTenantSlugFromUrl, isSuperAdmin]);

  // Set current tenant and navigate
  const setCurrentTenant = useCallback((tenant: Tenant) => {
    setCurrentTenantState(tenant);
    setTenantError(null);
    
    // Save to localStorage for quick reload
    localStorage.setItem('last_tenant_slug', tenant.slug);
    
    // Navigate to tenant's dashboard if not already there
    const currentSlug = getTenantSlugFromUrl();
    if (currentSlug !== tenant.slug) {
      navigate(`/${tenant.slug}/dashboard`);
    }
  }, [navigate, getTenantSlugFromUrl]);

  // Check if user has access to a tenant
  const hasTenantAccess = useCallback((tenantSlug: string) => {
    if (isSuperAdmin) return true;
    return tenantMemberships.some(m => m.tenant?.slug === tenantSlug && m.status === 'active');
  }, [tenantMemberships, isSuperAdmin]);

  // Check owner/admin status
  const isTenantOwner = currentTenant 
    ? tenantMemberships.some(m => m.tenant_id === currentTenant.id && m.is_owner)
    : false;
    
  const isTenantAdmin = isSuperAdmin || isTenantOwner || (currentTenant 
    ? tenantMemberships.some(m => m.tenant_id === currentTenant.id && m.is_owner)
    : false);

  // Fetch memberships when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchMemberships();
    }
  }, [user, authLoading, fetchMemberships]);

  // Re-fetch when URL changes to a different tenant
  useEffect(() => {
    const urlSlug = getTenantSlugFromUrl();
    if (urlSlug && currentTenant?.slug !== urlSlug) {
      fetchMemberships();
    }
  }, [location.pathname, currentTenant?.slug, fetchMemberships, getTenantSlugFromUrl]);

  const value: TenantContextType = {
    currentTenant,
    tenantMemberships,
    isLoadingTenant,
    tenantError,
    setCurrentTenant,
    hasTenantAccess,
    isTenantOwner,
    isTenantAdmin,
    refetchMemberships: fetchMemberships,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};
