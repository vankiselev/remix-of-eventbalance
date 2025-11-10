import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TransactionProject } from "@/hooks/useTransactionProjects";

interface ProjectEditDialogProps {
  project: TransactionProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (project: Partial<TransactionProject> & { id: string }) => void;
}

export function ProjectEditDialog({ project, open, onOpenChange, onSave }: ProjectEditDialogProps) {
  const [name, setName] = useState(project?.name || "");
  const [displayOrder, setDisplayOrder] = useState(project?.display_order || 0);
  const [isActive, setIsActive] = useState(project?.is_active ?? true);

  const handleSave = () => {
    if (!project) return;
    
    onSave({
      id: project.id,
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
          <DialogTitle>Редактировать проект</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название проекта</Label>
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
            <Label htmlFor="active">Активен</Label>
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
