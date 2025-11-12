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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useWarehouseInventories } from "@/hooks/useWarehouseInventories";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InventoryCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InventoryCreateDialog = ({
  open,
  onOpenChange,
}: InventoryCreateDialogProps) => {
  const { createInventory } = useWarehouseInventories();
  const { items } = useWarehouseItems();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Инвентаризация ${new Date().toLocaleDateString()}`,
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsCreating(true);
    try {
      const result = await createInventory.mutateAsync({
        name: values.name,
        notes: values.notes || null,
        status: 'draft',
      });

      const inventoryId = (result as any).id;

      // Create inventory items for all current warehouse items
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Get current stock for all items
      const { data: stockData } = await supabase
        .from('warehouse_stock' as any)
        .select('item_id, location_id, quantity');

      const inventoryItems = (stockData || []).map((stock: any) => ({
        inventory_id: inventoryId,
        item_id: stock.item_id,
        location_id: stock.location_id,
        expected_quantity: stock.quantity || 0,
        actual_quantity: null,
      }));

      if (inventoryItems.length > 0) {
        await supabase
          .from('warehouse_inventory_items' as any)
          .insert(inventoryItems);
      }

      onOpenChange(false);
      form.reset();
      
      // Navigate to warehouse page
      window.location.href = '/warehouse';
    } catch (error) {
      console.error('Error creating inventory:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новая инвентаризация</DialogTitle>
          <DialogDescription>
            Создайте инвентаризацию для проверки остатков на складе
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Инвентаризация 2024" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Примечания</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Дополнительная информация"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="text-muted-foreground">
                Будет создана инвентаризация со всеми текущими товарами и их
                ожидаемыми остатками на всех локациях.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
