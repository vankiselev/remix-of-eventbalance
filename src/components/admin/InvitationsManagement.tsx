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
import { useRoles } from "@/hooks/useRoles";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { isMissingInvitationNameColumnsError } from "./invitationNameColumnsFallback";

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
  const { roles } = useRoles();
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
        if (registeredEmails.has(inv.email) && (inv.status === 'sent' || inv.status === 'pending')) {
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
      // Resolve name: if current invitation has no name, try to find from other invitations
      let firstName = invitation.first_name || null;
      let lastName = invitation.last_name || null;

      if (!firstName || !lastName) {
        const { data: otherInvites } = await supabase
          .from("invitations")
          .select("first_name, last_name")
          .ilike("email", invitation.email)
          .not("first_name", "is", null)
          .not("last_name", "is", null)
          .limit(1);

        if (otherInvites && otherInvites.length > 0) {
          firstName = firstName || otherInvites[0].first_name;
          lastName = lastName || otherInvites[0].last_name;
        }
      }

      await supabase
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);

      const baseInsertPayload = {
        email: invitation.email,
        role: invitation.role,
        invited_by: user.id,
        token_hash: "",
        tenant_id: invitation.tenant_id ?? null,
      };

      let { data: newInvitation, error: createError } = await (supabase
        .from("invitations") as any)
        .insert({
          ...baseInsertPayload,
          first_name: firstName,
          last_name: lastName,
        })
        .select()
        .single();

      if (createError && isMissingInvitationNameColumnsError(createError)) {
        const fallbackResult = await supabase
          .from("invitations")
          .insert(baseInsertPayload)
          .select()
          .single();

        newInvitation = fallbackResult.data as Invitation | null;
        createError = fallbackResult.error;
      }

      if (createError || !newInvitation) throw createError || new Error("Не удалось создать повторное приглашение");

      const roleDisplayName = roles.find((r) => r.code === invitation.role)?.name || invitation.role;
      const { error: emailError } = await supabase.functions.invoke("send-invitation-email", {
        body: {
          email: invitation.email,
          token: newInvitation.token,
          firstName: firstName,
          lastName: lastName,
          role: invitation.role,
          roleName: roleDisplayName,
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

      try {
        await supabase.from("invitation_audit_log").insert({
          invitation_id: invitation.id,
          actor_id: user.id,
          action: "revoked",
          details: { email: invitation.email },
        });
      } catch (auditErr) {
        console.warn("Audit log insert failed (non-blocking):", auditErr);
      }

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

      try {
        await supabase.from("invitation_audit_log").insert({
          invitation_id: deleteInvitation.id,
          actor_id: user.id,
          action: "revoked", // Use "revoked" instead of "deleted" to avoid check constraint
          details: { email: deleteInvitation.email, was_deleted: true },
        });
      } catch (auditErr) {
        console.warn("Audit log insert failed (non-blocking):", auditErr);
      }

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
      accepted: { label: "Принято", variant: "default" as const, className: "bg-green-500/15 text-green-700 border-green-300 dark:text-green-400 dark:border-green-700" },
      expired: { label: "Истекло", variant: "secondary" as const },
      revoked: { label: "Отозвано", variant: "destructive" as const },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.sent;
    return <Badge variant={statusInfo.variant} className={(statusInfo as any).className || ""}>{statusInfo.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const mappedRoleName = roles.find((r) => r.code === role)?.name;
    const fallbackMap: Record<string, string> = {
      admin: "Администратор",
      employee: "Сотрудник",
      financier: "Финансист",
    };
    const displayName = mappedRoleName || fallbackMap[role] || role;

    return (
      <Badge variant={role === "admin" ? "default" : "outline"}>
        {displayName}
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Приглашения</h2>
        <Button onClick={() => setShowInviteDialog(true)} className="w-full sm:w-auto h-9 text-sm touch-manipulation">
          <Plus className="w-4 h-4 mr-1.5" />
          Пригласить
        </Button>
      </div>

      {invitations.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Приглашения не найдены
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Имя</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Приглашен</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium text-sm">{invitation.email}</TableCell>
                      <TableCell className="text-sm">
                        {invitation.first_name && invitation.last_name
                          ? `${invitation.first_name} ${invitation.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                      <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(invitation.invited_at), 'd MMM yyyy', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleResendInvitation(invitation)} title="Повторно отправить" className="h-8 w-8 p-0">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                          {invitation.status === "sent" && !isExpired(invitation.expires_at) && (
                            <Button size="sm" variant="outline" onClick={() => handleRevokeInvitation(invitation)} title="Отозвать" className="h-8 w-8 p-0">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setDeleteInvitation(invitation)} title="Удалить" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{invitation.email}</p>
                      {invitation.first_name && invitation.last_name && (
                        <p className="text-xs text-muted-foreground">{invitation.first_name} {invitation.last_name}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {getStatusBadge(invitation.status)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRoleBadge(invitation.role)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(invitation.invited_at), 'd MMM yyyy', { locale: ru })}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleResendInvitation(invitation)} className="h-8 w-8 p-0 touch-manipulation">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                      {invitation.status === "sent" && !isExpired(invitation.expires_at) && (
                        <Button size="sm" variant="outline" onClick={() => handleRevokeInvitation(invitation)} className="h-8 w-8 p-0 touch-manipulation">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDeleteInvitation(invitation)} className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

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