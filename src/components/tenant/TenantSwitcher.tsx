import React from 'react';
import { Check, ChevronsUpDown, Building2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenant, Tenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TenantSwitcherProps {
  collapsed?: boolean;
}

/**
 * TenantSwitcher - Dropdown for switching between companies
 * Shows current tenant and allows switching to others
 */
export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ collapsed = false }) => {
  const { currentTenant, tenantMemberships, setCurrentTenant } = useTenant();
  const { isAdmin: isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleTenantSelect = (tenant: Tenant) => {
    setCurrentTenant(tenant);
  };

  const handleCreateCompany = () => {
    navigate('/register');
  };

  // Get unique tenants from memberships
  const tenants = tenantMemberships
    .filter(m => m.tenant)
    .map(m => ({
      ...m.tenant!,
      isOwner: m.is_owner,
    }));

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="w-10 h-10"
          >
            <Building2 className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Компании</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants.map((tenant) => (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => handleTenantSelect(tenant)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-1">
                {tenant.logo_url ? (
                  <img 
                    src={tenant.logo_url} 
                    alt={tenant.name} 
                    className="w-6 h-6 rounded object-cover"
                  />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="flex-1 truncate">{tenant.name}</span>
                {tenant.id === currentTenant?.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          {tenants.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-muted-foreground">Нет доступных компаний</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCreateCompany} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            <span>Создать компанию</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentTenant?.logo_url ? (
              <img 
                src={currentTenant.logo_url} 
                alt={currentTenant.name} 
                className="w-5 h-5 rounded object-cover flex-shrink-0"
              />
            ) : (
              <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">
              {currentTenant?.name || 'Выберите компанию'}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 flex-shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Мои компании</span>
          {isSuperAdmin && (
            <Badge variant="secondary" className="text-xs">
              Суперадмин
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleTenantSelect(tenant)}
            className={cn(
              "cursor-pointer",
              tenant.id === currentTenant?.id && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {tenant.logo_url ? (
                <img 
                  src={tenant.logo_url} 
                  alt={tenant.name} 
                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate">{tenant.name}</span>
                  {tenant.isOwner && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      Владелец
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  /{tenant.slug}
                </span>
              </div>
              {tenant.id === currentTenant?.id && (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        {tenants.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Нет доступных компаний
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateCompany} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          <span>Создать новую компанию</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
