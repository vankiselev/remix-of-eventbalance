import { useState } from "react";
import { Plus, RotateCcw, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { InviteUserDialog } from "./InviteUserDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  invited_at: string;
  expires_at: string;
  accepted_at?: string;
  first_name?: string;
  last_name?: string;
  token: string;
  token_hash: string;
  created_at: string;
  updated_at: string;
  invited_by: string;
  tenant_id?: string;
}

export function InvitationsManagement() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [deleteInvitation, setDeleteInvitation] = useState<Invitation | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading: loading } = useQuery({
    queryKey: ['invitations-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("invited_at", { ascending: false });

      if (error) throw error;

      const emails = (data || []).map(i => i.email);
      const { data: registeredProfiles } = await supabase
        .from("profiles")
        .select("email")
        .in("email", emails);

      const registeredEmails = new Set((registeredProfiles || []).map(p => p.email));

      return (data || []).map(inv => {
        if (registeredEmails.has(inv.email) && inv.status !== 'accepted') {
          return { ...inv, status: 'accepted' };
        }
        return inv;
      }) as Invitation[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const refetchInvitations = () => {
    queryClient.invalidateQueries({ queryKey: ['invitations-management'] });
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    if (!user) return;
    try {
      await supabase
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);

      const { data: newInvitation, error: createError } = await supabase
        .from("invitations")
        .insert({
          email: invitation.email,
          role: invitation.role,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          invited_by: user.id,
          token_hash: '',
        })
        .select()
        .single();

      if (createError) throw createError;

      const { error: emailError } = await supabase.functions.invoke("send-invitation-email", {
        body: {
          email: invitation.email,
          token: newInvitation.token,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          role: invitation.role,
        },
      });

      if (emailError) {
        console.error("Email sending error:", emailError);
      }

      try {
        await supabase.from("invitation_audit_log").insert({
          invitation_id: newInvitation.id,
          actor_id: user.id,
          action: "resent",
          details: { email: invitation.email },
        });
      } catch (auditErr) {
        console.warn("Audit log insert failed (non-blocking):", auditErr);
      }

      toast({
        title: "Приглашение отправлено повторно",
        description: `Новое приглашение для ${invitation.email} отправлено`,
      });

      refetchInvitations();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось повторно отправить приглашение",
        variant: "destructive",
      });
    }
  };

  const handleRevokeInvitation = async (invitation: Invitation) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);

      if (error) throw error;

      await supabase.from("invitation_audit_log").insert({
        invitation_id: invitation.id,
        user_id: user.id,
        action: "revoked",
        details: { email: invitation.email },
      });

      toast({
        title: "Приглашение отозвано",
        description: `Приглашение для ${invitation.email} отозвано`,
      });

      refetchInvitations();
    } catch (error: any) {
      console.error("Error revoking invitation:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отозвать приглашение",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvitation = async () => {
    if (!deleteInvitation || !user) return;

    try {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", deleteInvitation.id);

      if (error) throw error;

      await supabase.from("invitation_audit_log").insert({
        invitation_id: deleteInvitation.id,
        user_id: user.id,
        action: "deleted",
        details: { email: deleteInvitation.email },
      });

      toast({
        title: "Приглашение удалено",
        description: `Приглашение для ${deleteInvitation.email} удалено`,
      });

      setDeleteInvitation(null);
      refetchInvitations();
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить приглашение",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      sent: { label: "Отправлено", variant: "default" as const },
      accepted: { label: "Принято", variant: "default" as const },
      expired: { label: "Истекло", variant: "secondary" as const },
      revoked: { label: "Отозвано", variant: "destructive" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.sent;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === "admin" ? "default" : "outline"}>
        {role === "admin" ? "Администратор" : "Сотрудник"}
      </Badge>
    );
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Управление приглашениями</h1>
        <Button onClick={() => setShowInviteDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Пригласить пользователя
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список приглашений</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Приглашения не найдены
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Приглашен</TableHead>
                  <TableHead>Истекает</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>
                      {invitation.first_name && invitation.last_name
                        ? `${invitation.first_name} ${invitation.last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                    <TableCell>
                      {format(new Date(invitation.invited_at), 'd MMMM yyyy, HH:mm', {
                        locale: ru,
                      })}
                    </TableCell>
                    <TableCell>
                      {isExpired(invitation.expires_at) ? (
                        <span className="text-destructive">Истекло</span>
                      ) : (
                        format(new Date(invitation.expires_at), 'd MMMM yyyy, HH:mm', {
                          locale: ru,
                        })
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {/* Кнопка повторить для всех статусов */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResendInvitation(invitation)}
                          title="Повторно отправить"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        
                        {/* Кнопка отозвать только для активных приглашений */}
                        {invitation.status === "sent" && !isExpired(invitation.expires_at) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevokeInvitation(invitation)}
                            title="Отозвать"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {/* Кнопка удалить для всех */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteInvitation(invitation)}
                          title="Удалить"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInviteSent={refetchInvitations}
      />

      <AlertDialog open={!!deleteInvitation} onOpenChange={(open) => !open && setDeleteInvitation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить приглашение?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить приглашение для {deleteInvitation?.email}? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvitation} className="bg-destructive hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}