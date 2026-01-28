import { useState } from "react";
import { useAnimators } from "@/hooks/useAnimators";
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

interface Animator {
  id: string;
  name: string;
  contact_person?: string | null;
  phone: string | null;
  email: string | null;
  description?: string | null;
  specialization?: string | null;
  specialty?: string | null; // alias from DB
}

const AnimatorsTab = () => {
  const { hasPermission } = useUserPermissions();
  const { data: animators = [], isLoading: loading, refetch: refetchAnimators } = useAnimators();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnimator, setEditingAnimator] = useState<Animator | null>(null);
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
      if (editingAnimator) {
        const { error } = await supabase
          .from('animators')
          .update(formData)
          .eq('id', editingAnimator.id);
        
        if (error) throw error;
        toast({ title: "Аниматор обновлен" });
      } else {
        const { error } = await supabase
          .from('animators')
          .insert([formData]);
        
        if (error) throw error;
        toast({ title: "Аниматор добавлен" });
      }
      
      setDialogOpen(false);
      setEditingAnimator(null);
      setFormData({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        description: "",
        specialization: ""
      });
      refetchAnimators();
    } catch (error) {
      console.error('Error saving animator:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить аниматора",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (animator: Animator) => {
    setEditingAnimator(animator);
    setFormData({
      name: animator.name,
      contact_person: animator.contact_person || "",
      phone: animator.phone || "",
      email: animator.email || "",
      description: animator.description || "",
      specialization: animator.specialization || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этого аниматора?")) return;
    
    try {
      const { error } = await supabase
        .from('animators')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast({ title: "Аниматор удален" });
      refetchAnimators();
    } catch (error) {
      console.error('Error deleting animator:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить аниматора",
        variant: "destructive"
      });
    }
  };


  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Аниматоры</h2>
        {hasPermission('contacts.create') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingAnimator(null);
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
                Добавить аниматора
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAnimator ? "Редактировать аниматора" : "Добавить аниматора"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="name">Имя *</Label>
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
                  {editingAnimator ? "Обновить" : "Добавить"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {animators.map((animator) => (
          <Card key={animator.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{animator.name}</CardTitle>
                {(hasPermission('contacts.edit') || hasPermission('contacts.delete')) && (
                  <div className="flex gap-1">
                    {hasPermission('contacts.edit') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(animator)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('contacts.delete') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(animator.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {animator.specialization && (
                <CardDescription>{animator.specialization}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {animator.contact_person && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  {animator.contact_person}
                </div>
              )}
              {animator.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  {animator.phone}
                </div>
              )}
              {animator.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  {animator.email}
                </div>
              )}
              {animator.description && (
                <p className="text-sm text-muted-foreground">{animator.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {animators.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <p className="text-muted-foreground">Нет добавленных аниматоров</p>
            {hasPermission('contacts.create') && (
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => setDialogOpen(true)}
              >
                Добавить первого аниматора
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnimatorsTab;