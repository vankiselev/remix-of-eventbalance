import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTransactionProjects, TransactionProject } from "@/hooks/useTransactionProjects";
import { ProjectEditDialog } from "./ProjectEditDialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TransactionProjectsManagement() {
  const { allProjects, isLoadingAll, createProject, updateProject, deleteProject } = useTransactionProjects();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProject, setEditingProject] = useState<TransactionProject | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const filteredProjects = allProjects.filter((proj) =>
    proj.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    
    const maxOrder = Math.max(...allProjects.map(p => p.display_order), 0);
    createProject.mutate({
      name: newProjectName.trim(),
      display_order: maxOrder + 1,
    });
    
    setNewProjectName("");
    setIsCreating(false);
  };

  const handleUpdate = (project: Partial<TransactionProject> & { id: string }) => {
    updateProject.mutate(project);
  };

  const handleDelete = (id: string) => {
    deleteProject.mutate(id);
    setDeletingProjectId(null);
  };

  if (isLoadingAll) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Управление проектами</CardTitle>
          <CardDescription>
            Редактируйте проекты для финансовых транзакций (Передача денег, Оклады и т.д.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск проектов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {!isCreating && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            )}
          </div>

          {isCreating && (
            <div className="flex gap-2 p-4 border rounded-lg bg-muted/50">
              <Input
                placeholder="Название нового проекта"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <Button onClick={handleCreate} disabled={!newProjectName.trim()}>
                Создать
              </Button>
              <Button variant="outline" onClick={() => {
                setIsCreating(false);
                setNewProjectName("");
              }}>
                Отмена
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-medium">{project.name}</span>
                  {!project.is_active && (
                    <Badge variant="secondary">Неактивен</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Порядок: {project.display_order}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingProject(project)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingProjectId(project.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredProjects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Проекты не найдены
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ProjectEditDialog
        project={editingProject}
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        onSave={handleUpdate}
      />

      <AlertDialog open={!!deletingProjectId} onOpenChange={(open) => !open && setDeletingProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Проект будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingProjectId && handleDelete(deletingProjectId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
