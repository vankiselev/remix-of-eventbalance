import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfiles } from "@/hooks/useProfiles";

interface AdvanceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
  currentAmount?: number;
}

export const AdvanceEditDialog = ({ open, onOpenChange, employeeId, currentAmount = 0 }: AdvanceEditDialogProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employeeId || "");
  const [amount, setAmount] = useState<string>(currentAmount.toString());
  const [isLoading, setIsLoading] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profiles } = useProfiles();

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      toast({
        title: "Ошибка",
        description: "Выберите сотрудника",
        variant: "destructive",
      });
      return;
    }

    const numAmount = parseFloat(amount) || 0;
    if (numAmount < 0) {
      toast({
        title: "Ошибка",
        description: "Сумма не может быть отрицательной",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ advance_balance: numAmount })
        .eq('id', selectedEmployeeId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Аванс обновлён",
      });

      queryClient.invalidateQueries({ queryKey: ['all-advances'] });
      queryClient.invalidateQueries({ queryKey: ['my-advance'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      
      onOpenChange(false);
      setSelectedEmployeeId("");
      setAmount("0");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать аванс</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Сотрудник</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={!!employeeId}
            >
              <SelectTrigger id="employee">
                <SelectValue placeholder="Выберите сотрудника" />
              </SelectTrigger>
              <SelectContent>
                {profiles?.filter(p => p.employment_status === 'active').map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Сумма аванса (₽)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
