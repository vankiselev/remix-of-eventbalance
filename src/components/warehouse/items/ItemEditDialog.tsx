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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { ItemAuditLog } from "./ItemAuditLog";
import { Loader2, Sparkles, Check, ChevronsUpDown } from "lucide-react";
import { generateSKU } from "@/utils/skuGenerator";
import { cn } from "@/lib/utils";

// Стандартные единицы измерения
const STANDARD_UNITS = [
  { value: "шт", label: "шт (штуки)" },
  { value: "пара", label: "пара" },
  { value: "комплект", label: "комплект" },
  { value: "кг", label: "кг (килограмм)" },
  { value: "г", label: "г (грамм)" },
  { value: "л", label: "л (литр)" },
  { value: "мл", label: "мл (миллилитр)" },
  { value: "м", label: "м (метр)" },
  { value: "см", label: "см (сантиметр)" },
  { value: "м²", label: "м² (квадратный метр)" },
  { value: "м³", label: "м³ (кубический метр)" },
  { value: "упак", label: "упак (упаковка)" },
  { value: "коробка", label: "коробка" },
];

const formSchema = z.object({
  sku: z.string().min(1, "Артикул обязателен"),
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  photo_url: z.string().optional(),
  unit: z.string().min(1, "Единица измерения обязательна"),
  min_stock: z.coerce.number().min(0, "Минимум не может быть отрицательным"),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
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
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);

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
      price: 0,
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
        price: item.price,
      });
      setSkuManuallyEdited(true); // В режиме редактирования не генерируем SKU автоматически
    } else if (!open) {
      form.reset();
      setSkuManuallyEdited(false);
    }
  }, [item, open, form]);

  // Автоматическая генерация SKU при вводе названия
  const handleNameChange = (name: string, onChange: (value: string) => void) => {
    onChange(name);
    
    // Генерируем SKU только если пользователь еще не редактировал его вручную и это не режим редактирования
    if (!skuManuallyEdited && !isEditMode && name.trim().length > 0) {
      const newSku = generateSKU(name);
      form.setValue("sku", newSku);
    }
  };

  const handleSkuChange = (sku: string, onChange: (value: string) => void) => {
    onChange(sku);
    // Отмечаем, что пользователь вручную изменил SKU
    if (sku.trim().length > 0) {
      setSkuManuallyEdited(true);
    }
  };

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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

        {isEditMode ? (
          <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="history">История изменений</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="flex-1 overflow-y-auto">
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
              {/* Название */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Костюм пирата"
                        onChange={(e) => handleNameChange(e.target.value, field.onChange)}
                      />
                    </FormControl>
                    {!isEditMode && !skuManuallyEdited && (
                      <FormDescription className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Артикул сгенерируется автоматически
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Артикул */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Артикул (SKU) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="WH-001"
                        onChange={(e) => handleSkuChange(e.target.value, field.onChange)}
                      />
                    </FormControl>
                    <FormDescription>
                      {skuManuallyEdited || isEditMode ? "Уникальный идентификатор" : "Автоматически из названия"}
                    </FormDescription>
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Единица измерения *</FormLabel>
                    <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value || "Выберите единицу"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Поиск или ввод..."
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => {
                                  setUnitOpen(false);
                                }}
                              >
                                Использовать "{field.value || "новая единица"}"
                              </Button>
                            </CommandEmpty>
                            <CommandGroup>
                              {STANDARD_UNITS.map((unit) => (
                                <CommandItem
                                  key={unit.value}
                                  value={unit.value}
                                  onSelect={() => {
                                    field.onChange(unit.value);
                                    setUnitOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === unit.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {unit.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                name="price"
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
            </TabsContent>
            <TabsContent value="history" className="flex-1 overflow-y-auto">
              {itemId && <ItemAuditLog itemId={itemId} />}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
                {/* ... keep existing code (all form fields) */}
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
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Костюм пирата"
                          onChange={(e) => handleNameChange(e.target.value, field.onChange)}
                        />
                      </FormControl>
                      {!isEditMode && !skuManuallyEdited && (
                        <FormDescription className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Артикул сгенерируется автоматически
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Артикул (SKU) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="WH-001"
                          onChange={(e) => handleSkuChange(e.target.value, field.onChange)}
                        />
                      </FormControl>
                      <FormDescription>
                        {skuManuallyEdited || isEditMode ? "Уникальный идентификатор" : "Автоматически из названия"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Единица измерения *</FormLabel>
                      <Popover open={unitOpen} onOpenChange={setUnitOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value || "Выберите единицу"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Поиск или ввод..."
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <Button
                                  variant="ghost"
                                  className="w-full"
                                  onClick={() => {
                                    setUnitOpen(false);
                                  }}
                                >
                                  Использовать "{field.value || "новая единица"}"
                                </Button>
                              </CommandEmpty>
                              <CommandGroup>
                                {STANDARD_UNITS.map((unit) => (
                                  <CommandItem
                                    key={unit.value}
                                    value={unit.value}
                                    onSelect={() => {
                                      field.onChange(unit.value);
                                      setUnitOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === unit.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {unit.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="price"
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
                  Создать
                </Button>
              </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
