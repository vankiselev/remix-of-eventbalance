import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      setSelectedEmployeeId(employeeId || "");
      setAmount(currentAmount.toString());
    }
  }, [open, employeeId, currentAmount]);

  useEffect(() => {
    if (open) {
      supabase
        .from('profiles')
        .select('id, full_name')
        .not('full_name', 'is', null)
        .order('full_name')
        .then(({ data }) => {
          setProfiles(data || []);
        });
    }
  }, [open]);

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      toast({ title: "Ошибка", description: "Выберите сотрудника", variant: "destructive" });
      return;
    }

    const numAmount = parseFloat(amount) || 0;
    if (numAmount < 0) {
      toast({ title: "Ошибка", description: "Сумма не может быть отрицательной", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = numAmount > 0
        ? { advance_balance: numAmount, advance_issued_by: user?.id, advance_issued_at: new Date().toISOString() }
        : { advance_balance: 0, advance_issued_by: null, advance_issued_at: null };

      const { error } = await (supabase
        .from('profiles') as any)
        .update(updateData)
        .eq('id', selectedEmployeeId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: numAmount === 0 ? "Аванс удалён" : "Аванс обновлён",
      });

      queryClient.invalidateQueries({ queryKey: ['all-advances'] });
      queryClient.invalidateQueries({ queryKey: ['my-advance'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {employeeId ? "Редактировать аванс" : "Выдать аванс"}
          </DialogTitle>
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
                {profiles.map((profile: any) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || 'Без имени'}
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
