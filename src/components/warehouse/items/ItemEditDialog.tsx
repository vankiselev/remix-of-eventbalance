import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { useWarehouseCategories } from "@/hooks/useWarehouseCategories";
import { ItemPhotoUpload } from "./ItemPhotoUpload";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  sku: z.string().min(1, "Артикул обязателен"),
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  photo_url: z.string().optional(),
  unit: z.string().min(1, "Единица измерения обязательна"),
  min_stock: z.coerce.number().min(0, "Минимум не может быть отрицательным"),
  purchase_price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
});

type FormValues = z.infer<typeof formSchema>;

interface ItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
}

export const ItemEditDialog = ({
  open,
  onOpenChange,
  itemId,
}: ItemEditDialogProps) => {
  const { items, createItem, updateItem, uploadPhoto } = useWarehouseItems();
  const { categories } = useWarehouseCategories();
  const [isUploading, setIsUploading] = useState(false);

  const item = itemId ? items.find((i) => i.id === itemId) : null;
  const isEditMode = !!itemId;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      category_id: "none",
      photo_url: "",
      unit: "шт",
      min_stock: 10,
      purchase_price: 0,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        sku: item.sku,
        name: item.name,
        description: item.description || "",
        category_id: item.category_id || "none",
        photo_url: item.photo_url || "",
        unit: item.unit,
        min_stock: item.min_stock,
        purchase_price: item.purchase_price,
      });
    } else if (!open) {
      form.reset();
    }
  }, [item, open, form]);

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await uploadPhoto(file);
      form.setValue("photo_url", url);
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    const data = {
      ...values,
      description: values.description || null,
      category_id: values.category_id === 'none' ? null : values.category_id || null,
      photo_url: values.photo_url || null,
    };

    if (isEditMode && itemId) {
      await updateItem.mutateAsync({ id: itemId, updates: data });
    } else {
      await createItem.mutateAsync(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Редактировать товар" : "Добавить товар"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Измените информацию о товаре"
              : "Заполните информацию о новом товаре"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Фото */}
            <FormField
              control={form.control}
              name="photo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Фотография товара</FormLabel>
                  <FormControl>
                    <ItemPhotoUpload
                      value={field.value}
                      onChange={handlePhotoUpload}
                      isUploading={isUploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Артикул */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Артикул (SKU) *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="WH-001" />
                    </FormControl>
                    <FormDescription>Уникальный идентификатор</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Название */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Костюм пирата" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Описание */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Дополнительная информация о товаре"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Категория */}
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Категория</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Без категории</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Единица измерения */}
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Единица измерения *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="шт, кг, м, л" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Минимальный остаток */}
              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Минимальный остаток *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" />
                    </FormControl>
                    <FormDescription>
                      Уведомление при достижении
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Цена закупки */}
              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена закупки (₽)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" step="0.01" />
                    </FormControl>
                    <FormDescription>Для финансового учёта</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={
                  createItem.isPending || updateItem.isPending || isUploading
                }
              >
                {(createItem.isPending || updateItem.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
