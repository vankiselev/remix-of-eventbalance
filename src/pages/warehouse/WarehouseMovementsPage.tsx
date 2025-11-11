import { useState } from "react";
import { useWarehouseMovements } from "@/hooks/useWarehouseMovements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText } from "lucide-react";
import { MovementsList } from "@/components/warehouse/movements/MovementsList";
import { MovementForm } from "@/components/warehouse/movements/MovementForm";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const movementTypes = [
  { value: 'all', label: 'Все операции' },
  { value: 'receipt', label: 'Приход' },
  { value: 'issue', label: 'Выдача' },
  { value: 'return', label: 'Возврат' },
  { value: 'writeoff', label: 'Списание' },
  { value: 'transfer', label: 'Перемещение' },
  { value: 'inventory', label: 'Инвентаризация' },
];

export const WarehouseMovementsPage = () => {
  const { movements, isLoading } = useWarehouseMovements();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.item_sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || movement.type === typeFilter;

    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <Skeleton className="h-[400px]" />
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
            placeholder="Поиск по товару, артикулу или примечаниям..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Тип операции" />
          </SelectTrigger>
          <SelectContent>
            {movementTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => setIsFormOpen(true)} className="whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" />
          Создать операцию
        </Button>
      </div>

      {/* Список движений */}
      {filteredMovements.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Движения не найдены</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || typeFilter !== "all"
              ? "Попробуйте изменить фильтры поиска"
              : "Начните с создания первой операции"}
          </p>
          {!searchQuery && typeFilter === "all" && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать операцию
            </Button>
          )}
        </div>
      ) : (
        <MovementsList movements={filteredMovements} />
      )}

      {/* Форма создания движения */}
      <MovementForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
};
