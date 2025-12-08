import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialReportItems, type FinancialReportItem } from "@/hooks/useFinancialReports";

interface EditReportItemDialogProps {
  item: FinancialReportItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditReportItemDialog = ({ 
  item, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditReportItemDialogProps) => {
  const { updateItem } = useFinancialReportItems(item?.report_id || null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setType(item.item_type);
      setCategory(item.category);
      setDescription(item.description || '');
      setAmount(item.planned_amount.toString());
    }
  }, [item]);

  const handleSubmit = async () => {
    if (!item || !category.trim() || !amount) return;
    
    setIsSubmitting(true);
    try {
      await updateItem.mutateAsync({
        id: item.id,
        item_type: type,
        category: category.trim(),
        description: description.trim() || null,
        planned_amount: Math.round(parseFloat(amount) || 0),
      });
      
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать статью</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'income' | 'expense')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Доход</SelectItem>
                <SelectItem value="expense">Расход</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Название статьи *</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Например: Аренда площадки"
            />
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опционально"
            />
          </div>

          <div className="space-y-2">
            <Label>Плановая сумма *</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!category.trim() || !amount || isSubmitting}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
