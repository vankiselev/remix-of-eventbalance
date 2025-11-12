import { useState } from "react";
import { useWarehouseItemsAudit, AuditLogEntry } from "@/hooks/useWarehouseItemsAudit";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ItemAuditLogProps {
  itemId: string;
}

const actionLabels = {
  create: { label: "Создание", variant: "default" as const },
  update: { label: "Изменение", variant: "secondary" as const },
  delete: { label: "Удаление", variant: "destructive" as const },
  restore: { label: "Восстановление", variant: "default" as const },
};

export const ItemAuditLog = ({ itemId }: ItemAuditLogProps) => {
  const { auditLogs, isLoading } = useWarehouseItemsAudit(itemId);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const getChangedFieldsText = (log: AuditLogEntry) => {
    if (!log.changed_fields || log.changed_fields.length === 0) {
      return "—";
    }
    
    const fieldLabels: Record<string, string> = {
      name: "Название",
      sku: "Артикул",
      description: "Описание",
      category_id: "Категория",
      unit: "Единица измерения",
      min_stock: "Мин. остаток",
      price: "Цена",
      photo_url: "Фото",
      is_active: "Активность",
    };

    return log.changed_fields
      .map((field) => fieldLabels[field] || field)
      .join(", ");
  };

  const renderDiff = (log: AuditLogEntry) => {
    if (!log.changed_fields || log.changed_fields.length === 0) {
      return null;
    }

    const fieldLabels: Record<string, string> = {
      name: "Название",
      sku: "Артикул",
      description: "Описание",
      category_id: "Категория",
      unit: "Единица измерения",
      min_stock: "Мин. остаток",
      price: "Цена",
      photo_url: "Фото",
      is_active: "Активность",
    };

    return (
      <div className="space-y-3">
        {log.changed_fields.map((field) => {
          const oldValue = log.old_data?.[field];
          const newValue = log.new_data?.[field];
          
          if (oldValue === newValue) return null;

          return (
            <div key={field} className="border-l-2 border-primary pl-3">
              <div className="text-sm font-medium text-foreground mb-1">
                {fieldLabels[field] || field}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Было:</div>
                  <div className="bg-destructive/10 text-destructive px-2 py-1 rounded">
                    {oldValue?.toString() || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Стало:</div>
                  <div className="bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                    {newValue?.toString() || "—"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">История пуста</h3>
        <p className="text-muted-foreground">
          Здесь будет отображаться история изменений товара
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата и время</TableHead>
              <TableHead>Пользователь</TableHead>
              <TableHead>Действие</TableHead>
              <TableHead>Изменения</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-sm">
                  {format(new Date(log.changed_at), "dd.MM.yyyy HH:mm", { locale: ru })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={log.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {log.profiles?.first_name?.[0] || "?"}
                        {log.profiles?.last_name?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      {log.profiles?.first_name} {log.profiles?.last_name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={actionLabels[log.action].variant}>
                    {actionLabels[log.action].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {log.change_description || getChangedFieldsText(log)}
                  </div>
                </TableCell>
                <TableCell>
                  {log.action === "update" && log.changed_fields && log.changed_fields.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Диалог с детальным просмотром изменений */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детали изменения</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.changed_at), "dd MMMM yyyy в HH:mm", { locale: ru })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            {selectedLog && renderDiff(selectedLog)}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
