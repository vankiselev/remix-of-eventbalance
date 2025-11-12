import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle } from "lucide-react";
import { InventoryItemWithDetails } from "@/hooks/useWarehouseInventories";

interface InventoryItemsTableProps {
  items: InventoryItemWithDetails[];
}

export const InventoryItemsTable = ({ items }: InventoryItemsTableProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Нет позиций для отображения</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Товар</TableHead>
            <TableHead>Локация</TableHead>
            <TableHead className="text-right">Ожидается</TableHead>
            <TableHead className="text-right">Фактически</TableHead>
            <TableHead className="text-right">Разница</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isScanned = item.actual_quantity !== null;
            const hasDifference = isScanned && item.difference !== 0;

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.item_sku}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {item.location_name || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">
                    {item.expected_quantity} {item.item_unit}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {isScanned ? (
                    <span className="font-medium">
                      {item.actual_quantity} {item.item_unit}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {isScanned ? (
                    <span
                      className={`font-medium ${
                        hasDifference
                          ? item.difference! > 0
                            ? "text-green-600"
                            : "text-destructive"
                          : ""
                      }`}
                    >
                      {item.difference! > 0 ? "+" : ""}
                      {item.difference} {item.item_unit}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {isScanned ? (
                    hasDifference ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Расхождение
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        Совпадает
                      </Badge>
                    )
                  ) : (
                    <Badge variant="outline">Не отсканировано</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
