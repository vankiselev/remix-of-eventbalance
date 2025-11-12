import { useState } from "react";
import { useWarehouseCategories } from "@/hooks/useWarehouseCategories";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WarehouseCategoryIcon } from "@/components/warehouse/items/WarehouseCategoryIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { LucideIconPicker } from "./iconPickers/LucideIconPicker";
import { URLIconPicker } from "./iconPickers/URLIconPicker";
import { UploadIconPicker } from "./iconPickers/UploadIconPicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CategoryForm {
  name: string;
  icon_type: string;
  icon_value: string;
  bg_color: string;
  icon_color: string;
  display_order: number;
}

export const WarehouseCategoriesManagement = () => {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } =
    useWarehouseCategories();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryForm>({
    name: "",
    icon_type: "lucide",
    icon_value: "Package",
    bg_color: "bg-gray-500/10",
    icon_color: "text-gray-600 dark:text-gray-400",
    display_order: 0,
  });

  const handleOpenDialog = (categoryId?: string) => {
    if (categoryId) {
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        setFormData({
          name: category.name,
          icon_type: category.icon_type,
          icon_value: category.icon_value,
          bg_color: category.bg_color,
          icon_color: category.icon_color,
          display_order: category.display_order,
        });
        setEditingCategory(categoryId);
      }
    } else {
      setFormData({
        name: "",
        icon_type: "lucide",
        icon_value: "Package",
        bg_color: "bg-gray-500/10",
        icon_color: "text-gray-600 dark:text-gray-400",
        display_order: categories.length,
      });
      setEditingCategory(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Введите название категории");
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory,
          updates: formData,
        });
      } else {
        await createCategory.mutateAsync(formData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту категорию?")) {
      await deleteCategory.mutateAsync(id);
    }
  };

  const handleIconChange = (type: string, value: string) => {
    setFormData({ ...formData, icon_type: type, icon_value: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Категории товаров</CardTitle>
              <CardDescription>
                Управление категориями складских товаров
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить категорию
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Категории не созданы
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Создать первую категорию
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[60px]">Иконка</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead className="w-[100px]">Порядок</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Действия
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell>
                    <WarehouseCategoryIcon
                      icon_type={category.icon_type}
                      icon_value={category.icon_value}
                      bg_color={category.bg_color}
                      icon_color={category.icon_color}
                    />
                    </TableCell>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell>{category.display_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(category.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Редактировать категорию" : "Новая категория"}
            </DialogTitle>
            <DialogDescription>
              Настройте название, иконку и оформление категории
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Название категории *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Костюмы"
                  required
                />
              </div>

              <div>
                <Label htmlFor="display_order">Порядок отображения</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                />
              </div>

              <div>
                <Label>Иконка категории</Label>
                <Tabs defaultValue="lucide" className="mt-2">
                  <TabsList>
                    <TabsTrigger value="lucide">Lucide Icons</TabsTrigger>
                    <TabsTrigger value="url">URL</TabsTrigger>
                    <TabsTrigger value="upload">Загрузить</TabsTrigger>
                  </TabsList>

                  <TabsContent value="lucide">
                    <LucideIconPicker
                      selectedIcon={formData.icon_type === "lucide" ? formData.icon_value : ""}
                      onSelectIcon={(value) => handleIconChange("lucide", value)}
                      categoryName={formData.name}
                    />
                  </TabsContent>

                  <TabsContent value="url">
                    <URLIconPicker
                      currentUrl={formData.icon_type === "url" ? formData.icon_value : ""}
                      onUrlChange={(value) => handleIconChange("url", value)}
                    />
                  </TabsContent>

                  <TabsContent value="upload">
                    <UploadIconPicker
                      categoryId={editingCategory || "new"}
                      currentUrl={formData.icon_type === "upload" ? formData.icon_value : ""}
                      onUploadComplete={(value) => handleIconChange("upload", value)}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bg_color">Цвет фона</Label>
                  <Input
                    id="bg_color"
                    value={formData.bg_color}
                    onChange={(e) =>
                      setFormData({ ...formData, bg_color: e.target.value })
                    }
                    placeholder="bg-blue-500/10"
                  />
                </div>
                <div>
                  <Label htmlFor="icon_color">Цвет иконки</Label>
                  <Input
                    id="icon_color"
                    value={formData.icon_color}
                    onChange={(e) =>
                      setFormData({ ...formData, icon_color: e.target.value })
                    }
                    placeholder="text-blue-600"
                  />
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <Label className="mb-2 block">Предварительный просмотр</Label>
                <div className="flex items-center gap-3">
                  <WarehouseCategoryIcon
                    icon_type={formData.icon_type}
                    icon_value={formData.icon_value}
                    bg_color={formData.bg_color}
                    icon_color={formData.icon_color}
                  />
                  <span className="font-medium">{formData.name || "Название категории"}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createCategory.isPending || updateCategory.isPending}
              >
                {editingCategory ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
