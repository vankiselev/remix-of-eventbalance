import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCategoryIcons, CategoryIcon } from "@/hooks/useCategoryIcons";
import { LucideIconPicker } from "./iconPickers/LucideIconPicker";
import { UploadIconPicker } from "./iconPickers/UploadIconPicker";
import { URLIconPicker } from "./iconPickers/URLIconPicker";
import { Palette, Upload, Link } from "lucide-react";

interface CategoryIconEditDialogProps {
  icon: CategoryIcon;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CategoryIconEditDialog = ({ icon, open, onOpenChange }: CategoryIconEditDialogProps) => {
  const { updateCategoryIcon } = useCategoryIcons();
  const [iconType, setIconType] = useState<'lucide' | 'upload' | 'url'>(icon.icon_type);
  const [iconValue, setIconValue] = useState(icon.icon_value);
  const [bgColor, setBgColor] = useState(icon.bg_color);
  const [iconColor, setIconColor] = useState(icon.icon_color);

  const handleSave = () => {
    updateCategoryIcon.mutate({
      id: icon.id,
      icon_type: iconType,
      icon_value: iconValue,
      bg_color: bgColor,
      icon_color: iconColor,
    });
    onOpenChange(false);
  };

  const colorPresets = [
    { bg: 'bg-blue-500/10', icon: 'text-blue-600 dark:text-blue-400', name: 'Синий' },
    { bg: 'bg-green-500/10', icon: 'text-green-600 dark:text-green-400', name: 'Зелёный' },
    { bg: 'bg-orange-500/10', icon: 'text-orange-600 dark:text-orange-400', name: 'Оранжевый' },
    { bg: 'bg-purple-500/10', icon: 'text-purple-600 dark:text-purple-400', name: 'Фиолетовый' },
    { bg: 'bg-red-500/10', icon: 'text-red-600 dark:text-red-400', name: 'Красный' },
    { bg: 'bg-yellow-500/10', icon: 'text-yellow-600 dark:text-yellow-400', name: 'Жёлтый' },
    { bg: 'bg-pink-500/10', icon: 'text-pink-600 dark:text-pink-400', name: 'Розовый' },
    { bg: 'bg-teal-500/10', icon: 'text-teal-600 dark:text-teal-400', name: 'Бирюзовый' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать иконку: {icon.category_name}</DialogTitle>
          <DialogDescription>
            Выберите тип иконки, настройте цвета и сохраните изменения
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={iconType} onValueChange={(v) => setIconType(v as any)} className="w-full">
          <TabsList className="w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="lucide" className="flex items-center gap-2 whitespace-nowrap">
              <Palette className="h-4 w-4" />
              Lucide Icons
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2 whitespace-nowrap">
              <Upload className="h-4 w-4" />
              Загрузить
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2 whitespace-nowrap">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lucide" className="space-y-4">
            <LucideIconPicker 
              selectedIcon={iconType === 'lucide' ? iconValue : ''}
              onSelectIcon={setIconValue}
              categoryName={icon.category_name}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <UploadIconPicker
              categoryId={icon.id}
              currentUrl={iconType === 'upload' ? iconValue : ''}
              onUploadComplete={setIconValue}
            />
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <URLIconPicker
              currentUrl={iconType === 'url' ? iconValue : ''}
              onUrlChange={setIconValue}
            />
          </TabsContent>
        </Tabs>

        <div className="space-y-4 pt-4 border-t">
          <div>
            <Label>Цветовые схемы</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {colorPresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  className="h-auto flex-col gap-2 p-3"
                  onClick={() => {
                    setBgColor(preset.bg);
                    setIconColor(preset.icon);
                  }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${preset.bg}`}>
                    <Palette className={`w-5 h-5 ${preset.icon}`} />
                  </div>
                  <span className="text-xs">{preset.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bgColor">Цвет фона</Label>
              <Input
                id="bgColor"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="bg-blue-500/10"
              />
            </div>
            <div>
              <Label htmlFor="iconColor">Цвет иконки</Label>
              <Input
                id="iconColor"
                value={iconColor}
                onChange={(e) => setIconColor(e.target.value)}
                placeholder="text-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
