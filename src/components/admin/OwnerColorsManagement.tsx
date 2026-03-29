import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useOwnerColors } from '@/hooks/useOwnerColors';
import { DEFAULT_OWNER_COLORS, OWNER_KEYS, type OwnerKey } from '@/constants/ownerColors';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Palette, RotateCcw, Save, Loader2 } from 'lucide-react';

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function OwnerColorsManagement() {
  const { currentTenant } = useTenant();
  const { colors } = useOwnerColors();
  const queryClient = useQueryClient();
  const [localColors, setLocalColors] = useState<Record<OwnerKey, string>>({
    nastya: DEFAULT_OWNER_COLORS.nastya.hex,
    lera: DEFAULT_OWNER_COLORS.lera.hex,
    vanya: DEFAULT_OWNER_COLORS.vanya.hex,
  });
  const [saving, setSaving] = useState(false);

  // Sync from loaded colors
  useEffect(() => {
    setLocalColors({
      nastya: colors.nastya.hex,
      lera: colors.lera.hex,
      vanya: colors.vanya.hex,
    });
  }, [colors]);

  const handleColorChange = (key: OwnerKey, value: string) => {
    setLocalColors(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = (key: OwnerKey) => {
    setLocalColors(prev => ({ ...prev, [key]: DEFAULT_OWNER_COLORS[key].hex }));
  };

  const handleResetAll = () => {
    setLocalColors({
      nastya: DEFAULT_OWNER_COLORS.nastya.hex,
      lera: DEFAULT_OWNER_COLORS.lera.hex,
      vanya: DEFAULT_OWNER_COLORS.vanya.hex,
    });
  };

  const handleSave = async () => {
    if (!currentTenant?.id) {
      toast.error('Не выбрана компания');
      return;
    }

    for (const key of OWNER_KEYS) {
      if (!HEX_REGEX.test(localColors[key])) {
        toast.error(`Некорректный HEX для ${DEFAULT_OWNER_COLORS[key].label}: ${localColors[key]}`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const key of OWNER_KEYS) {
        const { error } = await supabase
          .from('owner_color_settings' as any)
          .upsert({
            tenant_id: currentTenant.id,
            owner_key: key,
            label: DEFAULT_OWNER_COLORS[key].label,
            base_color: localColors[key],
            updated_at: new Date().toISOString(),
          } as any, { onConflict: 'tenant_id,owner_key' });

        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['owner-colors'] });
      toast.success('Цвета владельцев сохранены');
    } catch (err: any) {
      toast.error(`Ошибка сохранения: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isValid = (hex: string) => HEX_REGEX.test(hex);
  const hasChanges = OWNER_KEYS.some(k => localColors[k] !== colors[k].hex);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Цвета владельцев
        </CardTitle>
        <CardDescription>
          Настройте цвета для кошельков и проектов. Изменения применятся ко всей системе.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {OWNER_KEYS.map((key) => {
          const def = DEFAULT_OWNER_COLORS[key];
          const hex = localColors[key];
          const valid = isValid(hex);
          const isDefault = hex === def.hex;

          return (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Color picker */}
                <label className="relative cursor-pointer">
                  <input
                    type="color"
                    value={valid ? hex : def.hex}
                    onChange={(e) => handleColorChange(key, e.target.value.toUpperCase())}
                    className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
                  />
                  <div
                    className="w-10 h-10 rounded-xl border-2 border-border shadow-sm flex-shrink-0 transition-colors"
                    style={{ backgroundColor: valid ? hex : def.hex }}
                  />
                </label>

                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-semibold">{def.label}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={hex}
                      onChange={(e) => handleColorChange(key, e.target.value.toUpperCase())}
                      placeholder="#000000"
                      maxLength={7}
                      className={`w-28 h-8 text-xs font-mono ${!valid && hex.length > 0 ? 'border-destructive' : ''}`}
                    />
                    {!isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(key)}
                        className="h-8 px-2 text-xs text-muted-foreground"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Сброс
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground">Предпросмотр:</span>
                <Badge
                  variant="outline"
                  className="text-xs font-medium border"
                  style={{
                    backgroundColor: valid ? `${hex}14` : undefined,
                    color: valid ? hex : undefined,
                    borderColor: valid ? `${hex}4D` : undefined,
                  }}
                >
                  {def.label}
                </Badge>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: valid ? hex : '#9CA3AF' }}
                />
              </div>
            </div>
          );
        })}

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
