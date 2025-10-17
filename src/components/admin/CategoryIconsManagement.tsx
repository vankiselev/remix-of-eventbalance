import { useState } from "react";
import { useCategoryIcons } from "@/hooks/useCategoryIcons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/finance/CategoryIcon";
import { CategoryIconEditDialog } from "./CategoryIconEditDialog";
import { Pencil, Loader2 } from "lucide-react";

export const CategoryIconsManagement = () => {
  const { categoryIcons, isLoading } = useCategoryIcons();
  const [editingIcon, setEditingIcon] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Иконки категорий</CardTitle>
          <CardDescription>
            Настройте иконки и цвета для категорий доходов и расходов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryIcons.map((icon) => (
              <Card key={icon.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CategoryIcon 
                        category={icon.category_name}
                        isIncome={['От клиентов', 'Аванс', 'Другое'].includes(icon.category_name)}
                      />
                      <div>
                        <div className="font-medium">{icon.category_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {icon.icon_type === 'lucide' && 'Lucide Icon'}
                          {icon.icon_type === 'upload' && 'Загруженный файл'}
                          {icon.icon_type === 'url' && 'Внешний URL'}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingIcon(icon)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {editingIcon && (
        <CategoryIconEditDialog
          icon={editingIcon}
          open={!!editingIcon}
          onOpenChange={(open) => !open && setEditingIcon(null)}
        />
      )}
    </div>
  );
};
