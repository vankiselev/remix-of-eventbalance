import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Smartphone, GripVertical } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  enabled: boolean;
}

const availableRoutes = [
  { path: '/dashboard', label: 'Главная', icon: 'BarChart3' },
  { path: '/finances', label: 'Финансы', icon: 'DollarSign' },
  { path: '/transaction', label: 'Трата/Приход', icon: 'Plus' },
  { path: '/events', label: 'Мероприятия', icon: 'CalendarDays' },
  { path: '/calendar', label: 'Календарь', icon: 'Calendar' },
  { path: '/staff', label: 'Сотрудники', icon: 'Users' },
  { path: '/messages', label: 'Сообщения', icon: 'MessageSquare' },
  { path: '/birthdays', label: 'Дни рождения', icon: 'Cake' },
  { path: '/vacations', label: 'График отпусков', icon: 'Plane' },
  { path: '/contacts', label: 'Контакты', icon: 'Briefcase' },
  { path: '/reports', label: 'Отчеты', icon: 'FileText' },
  { path: '/profile', label: 'Профиль', icon: 'User' },
];

export const MobileNavSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('mobile_nav_settings')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.mobile_nav_settings) {
        setNavItems(data.mobile_nav_settings as unknown as NavItem[]);
      } else {
        // Default settings
        setNavItems([
          { path: '/dashboard', label: 'Главная', icon: 'BarChart3', enabled: true },
          { path: '/finances', label: 'Финансы', icon: 'DollarSign', enabled: true },
          { path: '/transaction', label: 'Трата/Приход', icon: 'Plus', enabled: true },
          { path: '/events', label: 'Мероприятия', icon: 'CalendarDays', enabled: true },
        ]);
      }
    } catch (error) {
      console.error('Error loading nav settings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить настройки навигации',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mobile_nav_settings: navItems as any })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Сохранено',
        description: 'Настройки навигации обновлены',
      });
    } catch (error) {
      console.error('Error saving nav settings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItem = (index: number) => {
    const updated = [...navItems];
    updated[index].enabled = !updated[index].enabled;
    setNavItems(updated);
  };

  const updateItem = (index: number, field: keyof NavItem, value: string) => {
    const updated = [...navItems];
    updated[index] = { ...updated[index], [field]: value };
    setNavItems(updated);
  };

  const addItem = () => {
    if (navItems.length >= 5) {
      toast({
        title: 'Ограничение',
        description: 'Максимум 5 кнопок в навигации',
        variant: 'destructive',
      });
      return;
    }
    setNavItems([...navItems, { path: '/dashboard', label: 'Новая кнопка', icon: 'Circle', enabled: true }]);
  };

  const removeItem = (index: number) => {
    if (navItems.length <= 1) {
      toast({
        title: 'Ограничение',
        description: 'Должна быть хотя бы одна кнопка',
        variant: 'destructive',
      });
      return;
    }
    setNavItems(navItems.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= navItems.length) return;

    const updated = [...navItems];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setNavItems(updated);
  };

  const resetToDefault = () => {
    setNavItems([
      { path: '/dashboard', label: 'Главная', icon: 'BarChart3', enabled: true },
      { path: '/finances', label: 'Финансы', icon: 'DollarSign', enabled: true },
      { path: '/transaction', label: 'Трата/Приход', icon: 'Plus', enabled: true },
      { path: '/events', label: 'Мероприятия', icon: 'CalendarDays', enabled: true },
    ]);
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Настройки мобильной навигации
        </CardTitle>
        <CardDescription>
          Настройте нижнюю панель навигации под свои нужды (до 5 кнопок)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {navItems.map((item, index) => {
          const IconComponent = getIconComponent(item.icon);
          return (
            <div key={index} className="flex items-center gap-2 p-4 border rounded-lg">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === navItems.length - 1}
                  className="h-6 w-6 p-0"
                >
                  ↓
                </Button>
              </div>

              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <IconComponent className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 space-y-2">
                <Select value={item.path} onValueChange={(value) => updateItem(index, 'path', value)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoutes.map((route) => (
                      <SelectItem key={route.path} value={route.path}>
                        {route.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={item.label}
                  onChange={(e) => updateItem(index, 'label', e.target.value)}
                  placeholder="Название кнопки"
                  className="h-8"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={item.enabled}
                  onCheckedChange={() => toggleItem(index)}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeItem(index)}
                >
                  ✕
                </Button>
              </div>
            </div>
          );
        })}

        <div className="flex gap-2 pt-4">
          <Button onClick={addItem} variant="outline" disabled={navItems.length >= 5} className="flex-1">
            Добавить кнопку
          </Button>
          <Button onClick={resetToDefault} variant="outline">
            Сбросить
          </Button>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
