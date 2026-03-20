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

const RESERVED_SLUGS = ['auth', 'register', 'admin', 'api', 'awaiting-invitation', 'administration', 'dashboard', 'settings', 'profile'];

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Helper: build Tenant object from raw DB row (simple schema)
function buildTenantFromRow(row: any): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logo_url: row.logo_url ?? null,
    settings: row.settings ?? {},
    is_active: row.is_active ?? true,
    plan: row.plan ?? 'free',
    trial_ends_at: row.trial_ends_at ?? null,
    created_at: row.created_at,
  };
}

// Helper: build TenantMembership from raw DB row
function buildMembershipFromRow(row: any): TenantMembership {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    user_id: row.user_id,
    role_id: row.role_id ?? null,
    is_owner: row.is_owner ?? false,
    status: row.status ?? 'active',
    joined_at: row.joined_at ?? row.created_at ?? null,
    tenant: row.tenant ? buildTenantFromRow(row.tenant) : undefined,
  };
}

// Fallback: direct query when RPC is unavailable
async function fetchMembershipsDirect(userId: string): Promise<TenantMembership[]> {
  const { data: memberships, error } = await supabase
    .from('tenant_memberships')
    .select('*')
    .eq('user_id', userId);

  if (error || !memberships?.length) return [];

  const tenantIds = [...new Set(memberships.map(m => m.tenant_id))];
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .in('id', tenantIds);

  const tenantMap = new Map((tenants ?? []).map(t => [t.id, t]));

  return memberships.map(m => buildMembershipFromRow({
    ...m,
    is_owner: m.role === 'owner',
    status: 'active',
    tenant: tenantMap.get(m.tenant_id),
  }));
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, isAdmin: isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [tenantMemberships, setTenantMemberships] = useState<TenantMembership[]>([]);
  const [isLoadingTenant, setIsLoadingTenant] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const getTenantSlugFromUrl = useCallback(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const potentialSlug = pathParts[0];
      if (!RESERVED_SLUGS.includes(potentialSlug)) {
        return potentialSlug;
      }
    }
    return null;
  }, [location.pathname]);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setTenantMemberships([]);
      setCurrentTenantState(null);
      setIsLoadingTenant(false);
      return;
    }

    try {
      setIsLoadingTenant(true);

      let memberships: TenantMembership[] = [];

      // Try RPC first
      const { data, error } = await (supabase.rpc as any)('get_user_tenant_memberships');

      if (!error && data) {
        let parsedData: any[] = [];
        if (Array.isArray(data)) {
          parsedData = data;
        } else if (typeof data === 'string') {
          try { parsedData = JSON.parse(data); } catch { parsedData = []; }
        } else if (data && typeof data === 'object') {
          parsedData = Array.isArray(data) ? data : [data];
        }
        memberships = parsedData.map(buildMembershipFromRow);
      } else {
        // Fallback to direct query
        console.warn('[TenantContext] RPC failed, using direct query:', error?.message);
        memberships = await fetchMembershipsDirect(user.id);
      }

      setTenantMemberships(memberships);

      // Determine current tenant from URL
      const urlSlug = getTenantSlugFromUrl();

      if (urlSlug) {
        const matchingMembership = memberships.find(m => m.tenant?.slug === urlSlug);

        if (matchingMembership?.tenant) {
          setCurrentTenantState(matchingMembership.tenant);
          setTenantError(null);
        } else if (isSuperAdmin) {
          const { data: tenantData, error: tenantError } = await (supabase.rpc as any)(
            'get_tenant_by_slug',
            { _slug: urlSlug }
          );

          if (tenantError || !tenantData) {
            setTenantError('Компания не найдена');
            setCurrentTenantState(null);
          } else {
            const tenant = typeof tenantData === 'string' ? JSON.parse(tenantData) : tenantData;
            setCurrentTenantState(buildTenantFromRow(tenant));
            setTenantError(null);
          }
        } else {
          setTenantError('У вас нет доступа к этой компании');
          setCurrentTenantState(null);
        }
      } else {
        // No tenant in URL — restore from localStorage or pick first
        const savedSlug = localStorage.getItem('last_tenant_slug');

        if (savedSlug) {
          const savedMembership = memberships.find(m => m.tenant?.slug === savedSlug && m.status === 'active');
          if (savedMembership?.tenant) {
            setCurrentTenantState(savedMembership.tenant);
            setIsLoadingTenant(false);
            return;
          }
        }

        const firstActive = memberships.find(m => m.status === 'active' && m.tenant);
        if (firstActive?.tenant) {
          setCurrentTenantState(firstActive.tenant);
          localStorage.setItem('last_tenant_slug', firstActive.tenant.slug);
        } else {
          setCurrentTenantState(null);
        }
      }
    } catch (error) {
      console.error('[TenantContext] Error fetching memberships:', error);
      setTenantMemberships([]);
    } finally {
      setIsLoadingTenant(false);
    }
  }, [user, getTenantSlugFromUrl, isSuperAdmin]);

  const setCurrentTenant = useCallback((tenant: Tenant) => {
    setCurrentTenantState(tenant);
    setTenantError(null);
    localStorage.setItem('last_tenant_slug', tenant.slug);

    const currentSlug = getTenantSlugFromUrl();
    if (currentSlug !== tenant.slug) {
      navigate(`/${tenant.slug}/dashboard`);
    }
  }, [navigate, getTenantSlugFromUrl]);

  const hasTenantAccess = useCallback((tenantSlug: string) => {
    if (isSuperAdmin) return true;
    return tenantMemberships.some(m => m.tenant?.slug === tenantSlug && m.status === 'active');
  }, [tenantMemberships, isSuperAdmin]);

  const isTenantOwner = currentTenant
    ? tenantMemberships.some(m => m.tenant_id === currentTenant.id && m.is_owner)
    : false;

  const isTenantAdmin = isSuperAdmin || isTenantOwner || (currentTenant
    ? tenantMemberships.some(m => m.tenant_id === currentTenant.id && m.is_owner)
    : false);

  useEffect(() => {
    if (!authLoading) {
      fetchMemberships();
    }
  }, [user, authLoading, fetchMemberships]);

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
