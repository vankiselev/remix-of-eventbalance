import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Loader2, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * SelectCompanyPage - Page for selecting which company to work with
 * Shown when user has multiple tenants or needs to choose
 */
const SelectCompanyPage: React.FC = () => {
  const { tenantMemberships, setCurrentTenant, isLoadingTenant } = useTenant();
  const { user, loading: authLoading, isAdmin: isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Get unique tenants
  const tenants = tenantMemberships
    .filter(m => m.tenant && m.status === 'active')
    .map(m => ({
      ...m.tenant!,
      isOwner: m.is_owner,
    }));

  const handleSelectTenant = (tenant: typeof tenants[0]) => {
    setCurrentTenant(tenant);
    navigate(`/${tenant.slug}/dashboard`);
  };

  const handleCreateCompany = () => {
    navigate('/register');
  };

  if (authLoading || isLoadingTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Выберите компанию</h1>
          <p className="text-muted-foreground">
            Выберите компанию, в которой хотите работать
          </p>
        </div>

        <div className="grid gap-4">
          {tenants.map((tenant) => (
            <Card 
              key={tenant.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelectTenant(tenant)}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="flex-shrink-0">
                  {tenant.logo_url ? (
                    <img 
                      src={tenant.logo_url} 
                      alt={tenant.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="truncate">{tenant.name}</CardTitle>
                    {tenant.isOwner && (
                      <Badge variant="secondary">Владелец</Badge>
                    )}
                  </div>
                  <CardDescription className="truncate">
                    eventbalance.ru/{tenant.slug}
                  </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {tenant.plan === 'trial' && 'Пробный период'}
                    {tenant.plan === 'basic' && 'Базовый'}
                    {tenant.plan === 'pro' && 'Профессиональный'}
                    {tenant.plan === 'enterprise' && 'Корпоративный'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}

          {tenants.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Нет доступных компаний</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Создайте свою компанию или дождитесь приглашения
                </p>
                <Button onClick={handleCreateCompany}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать компанию
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {tenants.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={handleCreateCompany}>
              <Plus className="h-4 w-4 mr-2" />
              Создать новую компанию
            </Button>
          </div>
        )}

        {isSuperAdmin && (
          <div className="mt-8 text-center">
            <Button variant="link" onClick={() => navigate('/admin')}>
              Перейти в панель суперадмина
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectCompanyPage;
