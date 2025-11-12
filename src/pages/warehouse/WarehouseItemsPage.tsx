import { useState } from "react";
import { useWarehouseItems } from "@/hooks/useWarehouseItems";
import { useWarehouseCategories } from "@/hooks/useWarehouseCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, ScanLine } from "lucide-react";
import { ItemCard } from "@/components/warehouse/items/ItemCard";
import { ItemEditDialog } from "@/components/warehouse/items/ItemEditDialog";
import { ItemQRScanner } from "@/components/warehouse/items/ItemQRScanner";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const WarehouseItemsPage = () => {
  const { items, isLoading } = useWarehouseItems();
  const { categories } = useWarehouseCategories();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || item.category_id === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleEdit = (itemId: string) => {
    setEditingItem(itemId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleScan = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      toast.success(`Товар найден: ${item.name}`);
      handleEdit(itemId);
    } else {
      toast.error("Товар не найден");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Фильтры и поиск */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, артикулу или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Все категории" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setIsScannerOpen(true)}
          className="whitespace-nowrap"
        >
          <ScanLine className="h-4 w-4 mr-2" />
          Сканировать QR
        </Button>

        <Button onClick={() => setIsDialogOpen(true)} className="whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" />
          Добавить товар
        </Button>
      </div>

      {/* Список товаров */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Товары не найдены</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== "all"
              ? "Попробуйте изменить фильтры поиска"
              : "Начните с добавления первого товара"}
          </p>
          {!searchQuery && categoryFilter === "all" && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить товар
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {/* Диалог добавления/редактирования */}
      <ItemEditDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        itemId={editingItem}
      />

      {/* Диалог сканирования QR-кода */}
      <ItemQRScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleScan}
      />
    </div>
  );
};
