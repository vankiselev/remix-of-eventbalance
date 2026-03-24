import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useAuth } from "@/contexts/AuthContext";
import { useRoles } from "@/hooks/useRoles";
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
  invitation_role?: string;
}

export function PendingUsersManagement() {
  const { roles } = useRoles();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [rejectUser, setRejectUser] = useState<PendingUser | null>(null);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);

  const { data: pendingUsers = [], isLoading: loading } = useQuery({
    queryKey: ['pending-users'],
    queryFn: async () => {
      // Find profiles that have an accepted invitation but NO tenant_membership
      const { data: acceptedInvitations, error: invErr } = await supabase
        .from("invitations")
        .select("email, role")
        .eq("status", "accepted");

      if (invErr || !acceptedInvitations?.length) return [];

      const invitationsByEmail = new Map<string, string>();
      for (const inv of acceptedInvitations) {
        invitationsByEmail.set(inv.email.toLowerCase(), inv.role || '');
      }

      const { data: allProfiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, full_name, created_at")
        .order("created_at", { ascending: false });

      if (profErr || !allProfiles?.length) return [];

      const { data: memberships } = await supabase
        .from("tenant_memberships")
        .select("user_id");

      const memberUserIds = new Set((memberships || []).map(m => m.user_id));

      const pending = allProfiles
        .filter(p => 
          p.email && 
          invitationsByEmail.has(p.email.toLowerCase()) && 
          !memberUserIds.has(p.id)
        )
        .map(p => ({
          ...p,
          invitation_role: invitationsByEmail.get(p.email!.toLowerCase()) || undefined,
        }));

      return pending as PendingUser[];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  const refetchPendingUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-users'] });
  };

  const handleInviteUser = async (user: PendingUser) => {
    const roleId = selectedRoles[user.id];
    
    if (!roleId) {
      toast.error("Выберите роль для пользователя");
      return;
    }

    setInvitingUserId(user.id);

    try {
      // Create membership via secure RPC
      const { data: membershipResult, error: membershipError } = await supabase
        .rpc("approve_pending_user_membership" as any, { p_user_id: user.id });

      if (membershipError) {
        throw new Error(`Ошибка создания membership: ${membershipError.message}`);
      }

      console.log("Membership created:", membershipResult);

      // Assign RBAC role
      const { error: roleError } = await supabase
        .from("user_role_assignments")
        .upsert({
          user_id: user.id,
          role_id: roleId,
        }, { onConflict: "user_id" });

      if (roleError) throw roleError;

      // Notify user
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Доступ одобрен",
        message: "Ваш аккаунт активирован. Добро пожаловать в EventBalance!",
        type: "system",
      } as any);

      toast.success(`Пользователь ${user.email} одобрен`);

      // Send approval email (fire-and-forget)
      try {
        await supabase.functions.invoke('send-approval-email', {
          body: { email: user.email, firstName: user.first_name, lastName: user.last_name }
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }
      
      refetchPendingUsers();
      setSelectedRoles(prev => {
        const { [user.id]: _, ...rest } = prev;
        return rest;
      });
    } catch (error: any) {
      console.error("Error approving user:", error);
      toast.error(error.message || "Не удалось одобрить пользователя");
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleRejectUser = async () => {
    if (!rejectUser) return;

    setRejectingUserId(rejectUser.id);

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", rejectUser.id);

      if (error) throw error;

      toast.success(`Заявка пользователя ${rejectUser.email} отклонена`);
      
      refetchPendingUsers();
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
          Ожидающие одобрения
        </CardTitle>
        <CardDescription>
          Пользователи, зарегистрировавшиеся по приглашению и ожидающие одобрения
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
                            Одобрить
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
