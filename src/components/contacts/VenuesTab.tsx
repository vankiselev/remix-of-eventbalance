import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Phone, Mail, User, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface Venue {
  id: string;
  name: string;
  address: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  capacity: number | null;
  description: string | null;
}

const VenuesTab = () => {
  const { hasPermission } = useUserPermissions();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact_person: "",
    phone: "",
    email: "",
    capacity: "",
    description: ""
  });

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setVenues(data || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить площадки",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSave = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null
      };

      if (editingVenue) {
        const { error } = await supabase
          .from('venues')
          .update(dataToSave)
          .eq('id', editingVenue.id);
        
        if (error) throw error;
        toast({ title: "Площадка обновлена" });
      } else {
        const { error } = await supabase
          .from('venues')
          .insert([dataToSave]);
        
        if (error) throw error;
        toast({ title: "Площадка добавлена" });
      }
      
      setDialogOpen(false);
      setEditingVenue(null);
      setFormData({
        name: "",
        address: "",
        contact_person: "",
        phone: "",
        email: "",
        capacity: "",
        description: ""
      });
      fetchVenues();
    } catch (error) {
      console.error('Error saving venue:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить площадку",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (venue: Venue) => {
    setEditingVenue(venue);
    setFormData({
      name: venue.name,
      address: venue.address || "",
      contact_person: venue.contact_person || "",
      phone: venue.phone || "",
      email: venue.email || "",
      capacity: venue.capacity ? venue.capacity.toString() : "",
      description: venue.description || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту площадку?")) return;
    
    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Площадка удалена" });
      fetchVenues();
    } catch (error) {
      console.error('Error deleting venue:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить площадку",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Площадки</h2>
        {hasPermission('contacts.create') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingVenue(null);
                setFormData({
                  name: "",
                  address: "",
                  contact_person: "",
                  phone: "",
                  email: "",
                  capacity: "",
                  description: ""
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить площадку
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVenue ? "Редактировать площадку" : "Добавить площадку"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="contact_person">Контактное лицо</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="capacity">Вместимость</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">
                  {editingVenue ? "Обновить" : "Добавить"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <Card key={venue.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{venue.name}</CardTitle>
                {(hasPermission('contacts.edit') || hasPermission('contacts.delete')) && (
                  <div className="flex gap-1">
                    {hasPermission('contacts.edit') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(venue)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('contacts.delete') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(venue.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {venue.address && (
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {venue.address}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {venue.contact_person && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  {venue.contact_person}
                </div>
              )}
              {venue.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  {venue.phone}
                </div>
              )}
              {venue.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  {venue.email}
                </div>
              )}
              {venue.capacity && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  {venue.capacity} человек
                </div>
              )}
              {venue.description && (
                <p className="text-sm text-muted-foreground">{venue.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {venues.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <p className="text-muted-foreground">Нет добавленных площадок</p>
            {hasPermission('contacts.create') && (
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => setDialogOpen(true)}
              >
                Добавить первую площадку
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VenuesTab;