import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WarehouseMovementWithDetails } from "@/hooks/useWarehouseMovements";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  Trash2,
  ClipboardList,
  Package,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MovementsListProps {
  movements: WarehouseMovementWithDetails[];
}

const movementTypeConfig = {
  receipt: {
    label: 'Приход',
    icon: ArrowDown,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10',
  },
  issue: {
    label: 'Выдача',
    icon: ArrowUp,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  return: {
    label: 'Возврат',
    icon: ArrowDown,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  writeoff: {
    label: 'Списание',
    icon: Trash2,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500/10',
  },
  transfer: {
    label: 'Перемещение',
    icon: ArrowLeftRight,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  inventory: {
    label: 'Инвентаризация',
    icon: ClipboardList,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
};

export const MovementsList = ({ movements }: MovementsListProps) => {
  return (
    <div className="space-y-3">
      {movements.map((movement) => {
        const config = movementTypeConfig[movement.type];
        const Icon = config.icon;

        return (
          <Card key={movement.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor} flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                        <h3 className="font-semibold truncate">
                          {movement.item_name}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        SKU: {movement.item_sku}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold">
                        {movement.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(movement.movement_date), 'd MMM yyyy', { locale: ru })}
                      </p>
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
                    {movement.from_location_name && (
                      <div>
                        <span className="text-muted-foreground">Откуда: </span>
                        <span className="font-medium">{movement.from_location_name}</span>
                      </div>
                    )}
                    {movement.to_location_name && (
                      <div>
                        <span className="text-muted-foreground">Куда: </span>
                        <span className="font-medium">{movement.to_location_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Additional info */}
                  {(movement.reason || movement.notes) && (
                    <div className="space-y-1 text-sm">
                      {movement.reason && (
                        <p>
                          <span className="text-muted-foreground">Причина: </span>
                          {movement.reason}
                        </p>
                      )}
                      {movement.notes && (
                        <p className="text-muted-foreground">{movement.notes}</p>
                      )}
                    </div>
                  )}

                  {/* Photo */}
                  {movement.photo_url && (
                    <div className="mt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                            <ImageIcon className="h-4 w-4" />
                            Фото
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Фотография</DialogTitle>
                          </DialogHeader>
                          <img
                            src={movement.photo_url}
                            alt="Movement photo"
                            className="w-full h-auto rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs text-muted-foreground">
                    {movement.responsible_user_name && (
                      <span>Ответственный: {movement.responsible_user_name}</span>
                    )}
                    {movement.created_by_name && (
                      <span>Создал: {movement.created_by_name}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
