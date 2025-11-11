import { useState } from "react";
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
import { useWarehouseMovements } from "@/hooks/useWarehouseMovements";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { useWarehouseLocations } from "@/hooks/useWarehouseLocations";
import { useWarehouseSettings } from "@/hooks/useWarehouseSettings";
import { ItemPhotoUpload } from "@/components/warehouse/items/ItemPhotoUpload";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  type: z.enum(['receipt', 'issue', 'return', 'writeoff', 'transfer', 'inventory']),
  item_id: z.string().min(1, "Выберите товар"),
  quantity: z.coerce.number().min(0.01, "Количество должно быть больше 0"),
  from_location_id: z.string().optional(),
  to_location_id: z.string().optional(),
  movement_date: z.string().min(1, "Укажите дату"),
  reason: z.string().optional(),
  notes: z.string().optional(),
  photo_url: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const movementTypes = [
  { value: 'receipt', label: 'Приход товара', requiresTo: true },
  { value: 'issue', label: 'Выдача на мероприятие', requiresFrom: true },
  { value: 'return', label: 'Возврат с мероприятия', requiresTo: true },
  { value: 'writeoff', label: 'Списание', requiresFrom: true, requiresPhoto: true },
  { value: 'transfer', label: 'Перемещение', requiresFrom: true, requiresTo: true },
  { value: 'inventory', label: 'Инвентаризация', requiresTo: true },
];

export const MovementForm = ({ open, onOpenChange }: MovementFormProps) => {
  const { createMovement, uploadPhoto } = useWarehouseMovements();
  const { items } = useWarehouseItems();
  const { locations } = useWarehouseLocations();
  const { settings } = useWarehouseSettings();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'receipt',
      item_id: '',
      quantity: 1,
      from_location_id: '',
      to_location_id: '',
      movement_date: new Date().toISOString().split('T')[0],
      reason: '',
      notes: '',
      photo_url: '',
    },
  });

  const selectedType = form.watch('type');
  const selectedTypeConfig = movementTypes.find(t => t.value === selectedType);

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
    // Validate photo requirement
    const settingsData = settings as any;
    if (values.type === 'writeoff' && settingsData?.require_photo_on_writeoff && !values.photo_url) {
      form.setError('photo_url', { message: 'Фото обязательно при списании' });
      return;
    }

    if (values.type === 'receipt' && settingsData?.require_photo_on_receipt && !values.photo_url) {
      form.setError('photo_url', { message: 'Фото обязательно при приходе' });
      return;
    }

    const data = {
      ...values,
      from_location_id: values.from_location_id || null,
      to_location_id: values.to_location_id || null,
      reason: values.reason || null,
      notes: values.notes || null,
      photo_url: values.photo_url || null,
    };

    await createMovement.mutateAsync(data);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать операцию</DialogTitle>
          <DialogDescription>
            Выберите тип операции и заполните данные
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Тип операции */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип операции *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {movementTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Товар */}
              <FormField
                control={form.control}
                name="item_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Товар *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите товар" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Количество */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Количество *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Откуда */}
              {selectedTypeConfig?.requiresFrom && (
                <FormField
                  control={form.control}
                  name="from_location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Откуда *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите локацию" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Куда */}
              {selectedTypeConfig?.requiresTo && (
                <FormField
                  control={form.control}
                  name="to_location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Куда *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите локацию" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Дата */}
            <FormField
              control={form.control}
              name="movement_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дата операции *</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Причина */}
            {(selectedType === 'writeoff' || selectedType === 'inventory') && (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Причина {selectedType === 'writeoff' && '*'}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Укажите причину" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Примечания */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Примечания</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Дополнительная информация" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Фото */}
            <FormField
              control={form.control}
              name="photo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Фотография
                    {selectedTypeConfig?.requiresPhoto && ' *'}
                  </FormLabel>
                  <FormControl>
                    <ItemPhotoUpload
                      value={field.value}
                      onChange={handlePhotoUpload}
                      isUploading={isUploading}
                    />
                  </FormControl>
                  <FormDescription>
                    {selectedType === 'writeoff' && 'Фото обязательно при списании'}
                    {selectedType === 'receipt' && 'Фото товара при приёмке (опционально)'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createMovement.isPending || isUploading}
              >
                {createMovement.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Создать
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
