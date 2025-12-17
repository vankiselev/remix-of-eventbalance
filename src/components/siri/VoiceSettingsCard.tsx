import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Settings, Save, Loader2 } from 'lucide-react';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { toast } from 'sonner';

const WALLET_OPTIONS = [
  'Наличка Настя',
  'Наличка Лера', 
  'Наличка Ваня',
  'Корп. карта Настя',
  'Корп. карта Лера',
  'Корп. карта Ваня',
  'ИП Настя',
  'ИП Лера',
  'ИП Ваня',
  'ООО Настя',
  'ООО Лера',
  'ООО Ваня',
  'Своя Настя',
  'Своя Лера',
  'Своя Ваня',
];

interface VoiceSettingsCardProps {
  onSettingsChange?: (wallet: string) => void;
}

export function VoiceSettingsCard({ onSettingsChange }: VoiceSettingsCardProps) {
  const { settings, isLoading, saveSettings, isSaving } = useVoiceSettings();
  const [defaultWallet, setDefaultWallet] = useState('Наличка Настя');
  const [autoCreate, setAutoCreate] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setDefaultWallet(settings.default_wallet || 'Наличка Настя');
      setAutoCreate(settings.auto_create_draft ?? true);
    }
  }, [settings]);

  const handleWalletChange = (value: string) => {
    setDefaultWallet(value);
    setHasChanges(true);
    onSettingsChange?.(value);
  };

  const handleAutoCreateChange = (value: boolean) => {
    setAutoCreate(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings({
      default_wallet: defaultWallet,
      auto_create_draft: autoCreate,
    }, {
      onSuccess: () => {
        toast.success('Настройки сохранены');
        setHasChanges(false);
      },
      onError: () => {
        toast.error('Ошибка сохранения настроек');
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Настройки голосового ввода
        </CardTitle>
        <CardDescription>
          Упростите создание транзакций — укажите значения по умолчанию
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="default-wallet">Кошелёк по умолчанию</Label>
          <Select value={defaultWallet} onValueChange={handleWalletChange}>
            <SelectTrigger id="default-wallet">
              <SelectValue placeholder="Выберите кошелёк" />
            </SelectTrigger>
            <SelectContent>
              {WALLET_OPTIONS.map(wallet => (
                <SelectItem key={wallet} value={wallet}>
                  {wallet}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Этот кошелёк будет использоваться автоматически при создании транзакций через голос
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-create">Автоматически создавать черновик</Label>
            <p className="text-xs text-muted-foreground">
              Транзакция создастся сразу после распознавания речи
            </p>
          </div>
          <Switch
            id="auto-create"
            checked={autoCreate}
            onCheckedChange={handleAutoCreateChange}
          />
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить настройки
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
