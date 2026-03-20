import { useState, useEffect } from "react";
import { UserPlus, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface PendingUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  created_at: string;
}

interface RoleDefinition {
  id: string;
  name: string;
  code: string;
  is_admin_role: boolean;
}

export function PendingUsersManagement() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [rejectUser, setRejectUser] = useState<PendingUser | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);

  const fetchPendingUsers = async () => {
    try {
      // Используем прямой запрос до применения миграции с новой RPC функцией
      // @ts-ignore - invitation_status column will exist after migration
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, full_name, created_at")
        .eq("invitation_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingUsers((data as unknown as PendingUser[]) || []);
    } catch (error: any) {
      console.error("Error fetching pending users:", error);
      // Если колонка еще не существует, просто показываем пустой список
      if (error.message?.includes('invitation_status')) {
        setPendingUsers([]);
      } else {
        toast.error("Не удалось загрузить список ожидающих пользователей");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("role_definitions")
        .select("id, name, code, is_admin_role")
        .order("name");

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      console.error("Error fetching roles:", error);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
    fetchRoles();

    // Подписка на изменения в profiles
    const channel = supabase
      .channel('pending-users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchPendingUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleInviteUser = async (user: PendingUser) => {
    const roleId = selectedRoles[user.id];
    
    if (!roleId) {
      toast.error("Выберите роль для пользователя");
      return;
    }

    setInvitingUserId(user.id);

    try {
      // Обновляем статус пользователя
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          invitation_status: "invited",
          invited_at: new Date().toISOString()
        } as Record<string, unknown>)
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Назначаем RBAC роль
      const { data: authUser } = await supabase.auth.getUser();
      const { error: roleError } = await supabase
        .from("user_role_assignments")
        .upsert({
          user_id: user.id,
          role_id: roleId,
          assigned_by: authUser.user?.id
        }, { onConflict: "user_id" });

      if (roleError) throw roleError;

      toast.success(`Пользователь ${user.email} приглашен в систему`);

      // Send approval email (fire-and-forget)
      try {
        await supabase.functions.invoke('send-approval-email', {
          body: { email: user.email, firstName: user.first_name, lastName: user.last_name }
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }
      
      // Удаляем из локального состояния
      setPendingUsers(prev => prev.filter(u => u.id !== user.id));
      setSelectedRoles(prev => {
        const { [user.id]: _, ...rest } = prev;
        return rest;
      });
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Не удалось пригласить пользователя");
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleRejectUser = async () => {
    if (!rejectUser) return;

    setRejectingUserId(rejectUser.id);

    try {
      // Удаляем профиль напрямую (каскадное удаление обработает остальное)
      // @ts-ignore - invitation_status column will exist after migration
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", rejectUser.id)
        .eq("invitation_status", "pending");

      if (error) throw error;

      toast.success(`Заявка пользователя ${rejectUser.email} отклонена`);
      
      // Удаляем из локального состояния
      setPendingUsers(prev => prev.filter(u => u.id !== rejectUser.id));
      setRejectUser(null);
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      toast.error(error.message || "Не удалось отклонить заявку");
    } finally {
      setRejectingUserId(null);
    }
  };

  const getDisplayName = (user: PendingUser) => {
    if (user.first_name && user.last_name) {
      return `${user.last_name} ${user.first_name}`;
    }
    if (user.full_name && user.full_name !== 'User') {
      return user.full_name;
    }
    return "—";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Ожидающие регистрации
        </CardTitle>
        <CardDescription>
          Пользователи, которые самостоятельно зарегистрировались и ожидают приглашения
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Нет ожидающих пользователей</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>Дата регистрации</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{getDisplayName(user)}</TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), "d MMMM yyyy, HH:mm", {
                      locale: ru,
                    })}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={selectedRoles[user.id] || ""}
                      onValueChange={(value) =>
                        setSelectedRoles((prev) => ({ ...prev, [user.id]: value }))
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              {role.name}
                              {role.is_admin_role && (
                                <Badge variant="secondary" className="text-xs">
                                  Админ
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleInviteUser(user)}
                        disabled={!selectedRoles[user.id] || invitingUserId === user.id}
                      >
                        {invitingUserId === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-1" />
                            Пригласить
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectUser(user)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!rejectUser} onOpenChange={(open) => !open && setRejectUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отклонить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отклонить заявку пользователя{" "}
              <strong>{rejectUser?.email}</strong>? Аккаунт пользователя будет удален.
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!rejectingUserId}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectUser}
              disabled={!!rejectingUserId}
              className="bg-destructive hover:bg-destructive/90"
            >
              {rejectingUserId ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Отклонить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
