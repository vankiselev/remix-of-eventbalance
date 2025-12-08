import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialReportItems } from "@/hooks/useFinancialReports";

interface AddReportItemDialogProps {
  reportId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: 'income' | 'expense';
  onSuccess: () => void;
}

export const AddReportItemDialog = ({ 
  reportId, 
  open, 
  onOpenChange, 
  defaultType,
  onSuccess 
}: AddReportItemDialogProps) => {
  const { addItems } = useFinancialReportItems(reportId);
  const [type, setType] = useState<'income' | 'expense'>(defaultType);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category.trim() || !amount) return;
    
    setIsSubmitting(true);
    try {
      await addItems.mutateAsync([{
        report_id: reportId,
        item_type: type,
        category: category.trim(),
        description: description.trim() || undefined,
        planned_amount: Math.round(parseFloat(amount) || 0),
      }]);
      
      // Reset form
      setCategory('');
      setDescription('');
      setAmount('');
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCategory('');
      setDescription('');
      setAmount('');
    }
    setType(defaultType);
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить статью</DialogTitle>
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!category.trim() || !amount || isSubmitting}
          >
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
