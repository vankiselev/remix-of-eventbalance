import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TransactionCategory } from "@/hooks/useTransactionCategories";

interface CategoryEditDialogProps {
  category: TransactionCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (category: Partial<TransactionCategory> & { id: string }) => void;
}

export function CategoryEditDialog({ category, open, onOpenChange, onSave }: CategoryEditDialogProps) {
  const [name, setName] = useState(category?.name || "");
  const [displayOrder, setDisplayOrder] = useState(category?.display_order || 0);
  const [isActive, setIsActive] = useState(category?.is_active ?? true);

  const handleSave = () => {
    if (!category) return;
    
    onSave({
      id: category.id,
      name,
      display_order: displayOrder,
      is_active: isActive,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать категорию</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название категории</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="order">Порядок сортировки</Label>
            <Input
              id="order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Активна</Label>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
