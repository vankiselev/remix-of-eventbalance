import { useState } from "react";
import { useContractors } from "@/hooks/useContractors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Phone, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface Contractor {
  id: string;
  name: string;
  contact_person?: string | null;
  phone: string | null;
  email: string | null;
  description?: string | null;
  specialization?: string | null;
  specialty?: string | null; // alias from DB
  company?: string | null;
  rating?: number | null;
}

const ContractorsTab = () => {
  const { hasPermission } = useUserPermissions();
  const { data: contractors = [], isLoading: loading, refetch: refetchContractors } = useContractors();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    description: "",
    specialization: ""
  });


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingContractor) {
        const { error } = await supabase
          .from('contractors')
          .update(formData)
          .eq('id', editingContractor.id);
        
        if (error) throw error;
        toast({ title: "Подрядчик обновлен" });
      } else {
        const { error } = await supabase
          .from('contractors')
          .insert([formData]);
        
        if (error) throw error;
        toast({ title: "Подрядчик добавлен" });
      }
      
      setDialogOpen(false);
      setEditingContractor(null);
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        description: "",
        specialization: ""
      });
      refetchContractors();
    } catch (error) {
      console.error('Error saving contractor:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить подрядчика",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (contractor: Contractor) => {
    setEditingContractor(contractor);
    setFormData({
      name: contractor.name,
      contact_person: contractor.contact_person || "",
      phone: contractor.phone || "",
      email: contractor.email || "",
      description: contractor.description || "",
      specialization: contractor.specialization || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этого подрядчика?")) return;
    
    try {
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Подрядчик удален" });
      refetchContractors();
    } catch (error) {
      console.error('Error deleting contractor:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить подрядчика",
        variant: "destructive"
      });
    }
  };


  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="action-row justify-between">
        <h2 className="text-2xl font-semibold">Подрядчики</h2>
        {hasPermission('contacts.create') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingContractor(null);
                setFormData({
                  name: "",
                  contact_person: "",
                  phone: "",
                  email: "",
                  description: "",
                  specialization: ""
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить подрядчика
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingContractor ? "Редактировать подрядчика" : "Добавить подрядчика"}
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
                <Label htmlFor="specialization">Специализация</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
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
                  {editingContractor ? "Обновить" : "Добавить"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contractors.map((contractor) => (
          <Card key={contractor.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{contractor.name}</CardTitle>
                {(hasPermission('contacts.edit') || hasPermission('contacts.delete')) && (
                  <div className="flex gap-1">
                    {hasPermission('contacts.edit') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(contractor)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('contacts.delete') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contractor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {contractor.specialization && (
                <CardDescription>{contractor.specialization}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {contractor.contact_person && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  {contractor.contact_person}
                </div>
              )}
              {contractor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  {contractor.phone}
                </div>
              )}
              {contractor.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  {contractor.email}
                </div>
              )}
              {contractor.description && (
                <p className="text-sm text-muted-foreground">{contractor.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {contractors.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <p className="text-muted-foreground">Нет добавленных подрядчиков</p>
            {hasPermission('contacts.create') && (
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => setDialogOpen(true)}
              >
                Добавить первого подрядчика
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContractorsTab;