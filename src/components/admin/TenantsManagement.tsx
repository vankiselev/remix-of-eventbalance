import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant, Tenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { CreateTenantDialog } from './CreateTenantDialog';
import { TenantDetailDialog, TenantProfile } from './TenantDetailDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, ArrowRight, Loader2, Check, Pencil, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TenantWithMembers extends TenantProfile {
  created_at: string | null;
  memberCount: number;
}

export const TenantsManagement: React.FC = () => {
  const { currentTenant, setCurrentTenant, refetchMemberships } = useTenant();
  const { isAdmin: isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editTenant, setEditTenant] = useState<TenantProfile | null>(null);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: tenantsData, error } = await (supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;

      const { data: memberships } = await supabase
        .from('tenant_memberships')
        .select('tenant_id');

      const countMap: Record<string, number> = {};
      memberships?.forEach((m) => {
        countMap[m.tenant_id] = (countMap[m.tenant_id] || 0) + 1;
      });

      setTenants(
        (tenantsData || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          description: t.description || null,
          inn: t.inn || null,
          legal_name: t.legal_name || null,
          address: t.address || null,
          phone: t.phone || null,
          email: t.email || null,
          logo_url: t.logo_url || null,
          is_active: t.is_active ?? true,
          plan: t.plan || 'trial',
          created_at: t.created_at,
          memberCount: countMap[t.id] || 0,
        }))
      );
    } catch (err: any) {
      toast({ title: 'Ошибка загрузки', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleSwitch = async (tenant: TenantWithMembers) => {
    const fullTenant: Tenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logo_url: tenant.logo_url,
      settings: {},
      is_active: tenant.is_active ?? true,
      plan: tenant.plan || 'trial',
      trial_ends_at: null,
      created_at: tenant.created_at || '',
    };
    setCurrentTenant(fullTenant);
    await refetchMemberships();
    toast({ title: 'Компания переключена', description: tenant.name });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current tenant indicator */}
      {currentTenant && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Building2 className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Текущая компания</p>
              <p className="text-lg font-semibold truncate">{currentTenant.name}</p>
              <p className="text-xs text-muted-foreground">/{currentTenant.slug}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Все компании ({tenants.length})</h2>
        {isSuperAdmin && <CreateTenantDialog onCreated={fetchTenants} />}
      </div>

      {/* Tenants list */}
      {tenants.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Нет зарегистрированных компаний
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tenants.map((tenant) => {
            const isCurrent = currentTenant?.id === tenant.id;
            return (
              <Card key={tenant.id} className={isCurrent ? 'border-primary/40' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{tenant.name}</p>
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            <Check className="h-3 w-3 mr-1" />
                            Текущая
                          </Badge>
                        )}
                        {tenant.plan && (
                          <Badge variant="secondary" className="text-xs">
                            {tenant.plan}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">/{tenant.slug}</p>
                      {tenant.legal_name && (
                        <p className="text-xs text-muted-foreground mt-1">{tenant.legal_name}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {tenant.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {tenant.email}
                          </span>
                        )}
                        {tenant.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {tenant.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {tenant.memberCount}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTenant(tenant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSwitch(tenant)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TenantDetailDialog
        tenant={editTenant}
        open={!!editTenant}
        onOpenChange={(open) => { if (!open) setEditTenant(null); }}
        onSaved={fetchTenants}
      />
    </div>
  );
};
