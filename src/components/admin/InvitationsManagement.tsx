import { useState, useEffect } from "react";
import { Plus, RotateCcw, X, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteUserDialog } from "./InviteUserDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'employee';
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
}

export function InvitationsManagement() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("invited_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список приглашений",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      // Revoke old invitation
      await supabase
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);

      // Create new invitation
      const { data: newInvitation, error: createError } = await supabase
        .from("invitations")
        .insert({
          email: invitation.email,
          role: invitation.role,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          invited_by: (await supabase.auth.getUser()).data.user?.id!,
          token_hash: '', // Will be filled by trigger
        })
        .select()
        .single();

      if (createError) throw createError;

      // Send email
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

      // Log audit event
      await supabase.from("invitation_audit_log").insert({
        invitation_id: newInvitation.id,
        user_id: (await supabase.auth.getUser()).data.user?.id!,
        action: "resent",
        details: { email: invitation.email },
      });

      toast({
        title: "Приглашение отправлено повторно",
        description: `Новое приглашение для ${invitation.email} отправлено`,
      });

      fetchInvitations();
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
    try {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "revoked" })
        .eq("id", invitation.id);

      if (error) throw error;

      // Log audit event
      await supabase.from("invitation_audit_log").insert({
        invitation_id: invitation.id,
        user_id: (await supabase.auth.getUser()).data.user?.id!,
        action: "revoked",
        details: { email: invitation.email },
      });

      toast({
        title: "Приглашение отозвано",
        description: `Приглашение для ${invitation.email} отозвано`,
      });

      fetchInvitations();
    } catch (error: any) {
      console.error("Error revoking invitation:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отозвать приглашение",
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
                      {formatDistanceToNow(new Date(invitation.invited_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </TableCell>
                    <TableCell>
                      {isExpired(invitation.expires_at) ? (
                        <span className="text-destructive">Истекло</span>
                      ) : (
                        formatDistanceToNow(new Date(invitation.expires_at), {
                          addSuffix: true,
                          locale: ru,
                        })
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {invitation.status === "sent" && !isExpired(invitation.expires_at) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendInvitation(invitation)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRevokeInvitation(invitation)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {invitation.status === "sent" && isExpired(invitation.expires_at) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendInvitation(invitation)}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Повторить
                          </Button>
                        )}
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
        onInviteSent={fetchInvitations}
      />
    </div>
  );
}