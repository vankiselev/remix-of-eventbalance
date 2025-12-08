import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinancialReportItems } from "@/hooks/useFinancialReports";

interface AddReportItemDialogProps {
  reportId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddReportItemDialog = ({ 
  reportId, 
  open, 
  onOpenChange, 
  onSuccess 
}: AddReportItemDialogProps) => {
  const { addItems } = useFinancialReportItems(reportId);
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
        category: category.trim(),
        description: description.trim() || undefined,
        planned_amount: Math.round(parseFloat(amount) || 0),
      }]);
      
      setCategory('');
      setDescription('');
      setAmount('');
      onOpenChange(false);
      onSuccess?.();
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
            <Label>Название статьи *</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Например: Аренда площадки, Аниматор"
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
