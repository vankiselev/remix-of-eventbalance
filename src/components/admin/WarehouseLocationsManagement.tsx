import { useState } from "react";
import { useWarehouseLocations } from "@/hooks/useWarehouseLocations";
import { useProfiles } from "@/hooks/useProfiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, MapPin, User, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface LocationForm {
  name: string;
  type: 'warehouse' | 'vehicle' | 'office' | 'employee' | 'other';
  address: string;
  employee_id: string | null;
  display_order: number;
}

const LOCATION_TYPES = [
  { value: 'warehouse', label: 'Склад', icon: Building2 },
  { value: 'vehicle', label: 'Транспорт', icon: MapPin },
  { value: 'office', label: 'Офис', icon: Building2 },
  { value: 'employee', label: 'У сотрудника', icon: User },
  { value: 'other', label: 'Другое', icon: MapPin },
] as const;

export const WarehouseLocationsManagement = () => {
  const { locations, isLoading, createLocation, updateLocation, deleteLocation } =
    useWarehouseLocations();
  const { data: profiles = [] } = useProfiles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationForm>({
    name: "",
    type: "warehouse",
    address: "",
    employee_id: null,
    display_order: 0,
  });

  const handleOpenDialog = (locationId?: string) => {
    if (locationId) {
      const location = locations.find((l) => l.id === locationId);
      if (location) {
        setFormData({
          name: location.name,
          type: location.type,
          address: location.address || "",
          employee_id: location.employee_id,
          display_order: location.display_order,
        });
        setEditingLocation(locationId);
      }
    } else {
      setFormData({
        name: "",
        type: "warehouse",
        address: "",
        employee_id: null,
        display_order: locations.length,
      });
      setEditingLocation(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLocation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      address: formData.address || null,
      employee_id: formData.type === 'employee' ? formData.employee_id : null,
    };

    try {
      if (editingLocation) {
        await updateLocation.mutateAsync({
          id: editingLocation,
          updates: data,
        });
      } else {
        await createLocation.mutateAsync(data);
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving location:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Вы уверены, что хотите удалить эту локацию?")) {
      await deleteLocation.mutateAsync(id);
    }
  };

  const getLocationIcon = (type: string) => {
    const locationType = LOCATION_TYPES.find(t => t.value === type);
    const Icon = locationType?.icon || MapPin;
    return <Icon className="h-4 w-4" />;
  };

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return null;
    const profile = profiles.find(p => p.id === employeeId);
    return profile ? `${profile.first_name} ${profile.last_name}` : null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Локации склада</CardTitle>
              <CardDescription>
                Управление местами хранения товаров
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить локацию
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Локации не созданы
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Создать первую локацию
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Тип</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Адрес / Сотрудник</TableHead>
                  <TableHead className="w-[100px]">Порядок</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Действия
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => {
                  const employeeName = getEmployeeName(location.employee_id);
                  const locationTypeLabel = LOCATION_TYPES.find(t => t.value === location.type)?.label;

                  return (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getLocationIcon(location.type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{location.name}</span>
                          <Badge variant="outline" className="w-fit">
                            {locationTypeLabel}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {location.type === 'employee' && employeeName ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {employeeName}
                          </div>
                        ) : (
                          location.address || '—'
                        )}
                      </TableCell>
                      <TableCell>{location.display_order}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(location.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(location.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Редактировать локацию" : "Новая локация"}
            </DialogTitle>
            <DialogDescription>
              Укажите место хранения товаров
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Главный склад"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Тип локации *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value, employee_id: null })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'employee' ? (
              <div>
                <Label htmlFor="employee_id">Сотрудник *</Label>
                <Select
                  value={formData.employee_id || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employee_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите сотрудника" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="ул. Складская, 10"
                />
              </div>
            )}

            <div>
              <Label htmlFor="display_order">Порядок отображения</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    display_order: parseInt(e.target.value) || 0,
                  })
                }
                min="0"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createLocation.isPending || updateLocation.isPending}
              >
                {editingLocation ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
