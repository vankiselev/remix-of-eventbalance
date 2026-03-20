// @ts-nocheck
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type EntityType = "client" | "venue" | "animator" | "contractor";

interface QuickCreateDialogProps {
  type: EntityType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (entity: { id: string; name: string }) => void;
}

const CONFIG: Record<EntityType, { title: string; table: string; fields: { key: string; label: string; required?: boolean; type?: string }[] }> = {
  client: {
    title: "Новый клиент",
    table: "clients",
    fields: [
      { key: "name", label: "Имя / Название", required: true },
      { key: "phone", label: "Телефон" },
      { key: "email", label: "Email" },
      { key: "company", label: "Компания" },
    ],
  },
  venue: {
    title: "Новая площадка",
    table: "venues",
    fields: [
      { key: "name", label: "Название", required: true },
      { key: "address", label: "Адрес" },
      { key: "phone", label: "Телефон" },
      { key: "capacity", label: "Вместимость", type: "number" },
    ],
  },
  animator: {
    title: "Новый аниматор",
    table: "animators",
    fields: [
      { key: "name", label: "Имя", required: true },
      { key: "phone", label: "Телефон" },
      { key: "specialization", label: "Специализация" },
    ],
  },
  contractor: {
    title: "Новый подрядчик",
    table: "contractors",
    fields: [
      { key: "name", label: "Название / Имя", required: true },
      { key: "phone", label: "Телефон" },
      { key: "specialization", label: "Специализация" },
      { key: "company", label: "Компания" },
    ],
  },
};

export function QuickCreateDialog({ type, open, onOpenChange, onCreated }: QuickCreateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const config = CONFIG[type];

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast({ variant: "destructive", title: "Укажите название" });
      return;
    }
    setLoading(true);
    try {
      const insertData: Record<string, any> = {};
      config.fields.forEach((f) => {
        const val = formData[f.key]?.trim();
        if (val) {
          insertData[f.key] = f.type === "number" ? Number(val) : val;
        }
      });

      const { data, error } = await supabase
        .from(config.table)
        .insert(insertData)
        .select("id, name")
        .single();

      if (error) throw error;

      toast({ title: "Создано!", description: `${config.title} добавлен` });
      onCreated(data);
      onOpenChange(false);
      setFormData({});
    } catch (error: any) {
      toast({ variant: "destructive", title: "Ошибка", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setFormData({}); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {config.fields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs font-medium">
                {field.label} {field.required && "*"}
              </Label>
              <Input
                value={formData[field.key] || ""}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                type={field.type || "text"}
                placeholder={field.label}
                className="h-9"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button size="sm" onClick={handleSave} disabled={loading}>
            {loading ? "Создание..." : "Создать"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
