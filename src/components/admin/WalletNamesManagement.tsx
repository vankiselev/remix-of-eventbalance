import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useWalletNames } from '@/hooks/useWalletNames';
import { WALLET_TYPES } from '@/constants/walletTypes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Wallet, RotateCcw, Save, Loader2 } from 'lucide-react';

const MAX_NAME_LENGTH = 50;

export function WalletNamesManagement() {
  const { currentTenant } = useTenant();
  const { wallets } = useWalletNames();
  const queryClient = useQueryClient();

  const [localNames, setLocalNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Sync from loaded wallet names
  useEffect(() => {
    const names: Record<string, string> = {};
    for (const w of WALLET_TYPES) {
      names[w.key] = wallets[w.key]?.displayName || w.defaultName;
    }
    setLocalNames(names);
  }, [wallets]);

  const handleNameChange = (key: string, value: string) => {
    setLocalNames(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = (key: string) => {
    const def = WALLET_TYPES.find(w => w.key === key);
    if (def) {
      setLocalNames(prev => ({ ...prev, [key]: def.defaultName }));
    }
  };

  const handleResetAll = () => {
    const names: Record<string, string> = {};
    for (const w of WALLET_TYPES) {
      names[w.key] = w.defaultName;
    }
    setLocalNames(names);
  };

  const handleSave = async () => {
    if (!currentTenant?.id) {
      toast.error('Не выбрана компания');
      return;
    }

    // Validate
    for (const w of WALLET_TYPES) {
      const name = (localNames[w.key] || '').trim();
      if (!name) {
        toast.error(`Название не может быть пустым: ${w.defaultName}`);
        return;
      }
      if (name.length > MAX_NAME_LENGTH) {
        toast.error(`Слишком длинное название для "${w.defaultName}" (макс. ${MAX_NAME_LENGTH} символов)`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const w of WALLET_TYPES) {
        const { error } = await supabase
          .from('wallet_name_settings' as any)
          .upsert({
            tenant_id: currentTenant.id,
            wallet_key: w.key,
            display_name: localNames[w.key].trim(),
            sort_order: w.sortOrder,
            is_active: true,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: 'tenant_id,wallet_key' });

        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['wallet-names'] });
      toast.success('Названия кошельков сохранены');
    } catch (err: any) {
      toast.error(`Ошибка сохранения: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = WALLET_TYPES.some(
    w => (localNames[w.key] || '').trim() !== (wallets[w.key]?.displayName || w.defaultName)
  );

  // Group wallets for display
  const cashWallets = WALLET_TYPES.filter(w => w.isCashWallet);
  const otherWallets = WALLET_TYPES.filter(w => !w.isCashWallet);

  const renderWalletRow = (w: typeof WALLET_TYPES[0]) => {
    const name = localNames[w.key] || '';
    const isDefault = name.trim() === w.defaultName;
    const isEmpty = !name.trim();

    return (
      <div key={w.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-border/50 bg-muted/30">
        <div className="flex-1 min-w-0">
          <Label className="text-xs text-muted-foreground">{w.defaultName}</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              value={name}
              onChange={(e) => handleNameChange(w.key, e.target.value)}
              placeholder={w.defaultName}
              maxLength={MAX_NAME_LENGTH}
              className={`h-8 text-sm ${isEmpty ? 'border-destructive' : ''}`}
            />
            {!isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReset(w.key)}
                className="h-8 px-2 text-xs text-muted-foreground flex-shrink-0"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Сброс
              </Button>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">→</span>
          <Badge variant="outline" className="text-xs font-medium">
            {name.trim() || w.defaultName}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Названия кошельков
        </CardTitle>
        <CardDescription>
          Настройте отображаемые названия кошельков. Стабильные ключи остаются неизменными — переименование не влияет на расчёты.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cash wallets */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">💰 Наличные кошельки</h4>
          <div className="space-y-2">
            {cashWallets.map(renderWalletRow)}
          </div>
        </div>

        {/* Other wallets */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">🏦 Прочие кошельки</h4>
          <div className="space-y-2">
            {otherWallets.map(renderWalletRow)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Button variant="ghost" size="sm" onClick={handleResetAll} className="text-muted-foreground">
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Сбросить все
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Сохранить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
