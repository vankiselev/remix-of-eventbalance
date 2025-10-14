import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoles } from "@/hooks/useRoles";

const inviteSchema = z.object({
  email: z.string().email("Введите корректный email"),
  role_id: z.string().min(1, "Выберите роль"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent: () => void;
}

export function InviteUserDialog({ open, onOpenChange, onInviteSent }: InviteUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { roles } = useRoles();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role_id: "",
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    try {
      setIsSubmitting(true);

      // Check if user already exists in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", data.email)
        .maybeSingle();
      
      if (existingProfile) {
        toast({
          title: "Ошибка",
          description: "Пользователь с таким email уже существует в системе",
          variant: "destructive",
        });
        return;
      }

      // Check if there's already an active invitation
      const { data: existingInvitation } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", data.email)
        .in("status", ["sent"])
        .maybeSingle();

      if (existingInvitation) {
        toast({
          title: "Ошибка", 
          description: "На этот email уже отправлено активное приглашение",
          variant: "destructive",
        });
        return;
      }

      // Create invitation (token_hash will be filled by trigger)
      const { data: invitation, error: invitationError } = await supabase
        .from("invitations")
        .insert({
          email: data.email,
          role: 'employee', // Legacy field, will be ignored
          first_name: data.firstName || null,
          last_name: data.lastName || null,
          invited_by: (await supabase.auth.getUser()).data.user?.id!,
          token_hash: '', // Will be overridden by trigger
        })
        .select()
        .single();

      if (invitationError) throw invitationError;

      // Assign role via user_role_assignments (will be done after user accepts)
      // Store role_id in invitation audit log for later processing
      await supabase.from("invitation_audit_log").insert({
        invitation_id: invitation.id,
        user_id: (await supabase.auth.getUser()).data.user?.id!,
        action: "created",
        details: { 
          email: data.email, 
          role_id: data.role_id,
          role_name: roles.find(r => r.id === data.role_id)?.name 
        },
      });

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke("send-invitation-email", {
        body: {
          email: data.email,
          token: invitation.token,
          firstName: data.firstName,
          lastName: data.lastName,
          role: roles.find(r => r.id === data.role_id)?.name || 'employee',
        },
      });

      if (emailError) {
        console.error("Email sending error:", emailError);
        // Don't fail completely if email fails, but log audit
        toast({
          title: "Предупреждение",
          description: "Приглашение создано, но письмо может не дойти. Проверьте настройки email.",
          variant: "destructive",
        });
      }

      toast({
        title: "Приглашение отправлено",
        description: `Приглашение для ${data.email} успешно создано`,
      });

      form.reset();
      onOpenChange(false);
      onInviteSent();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить приглашение",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Пригласить пользователя</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="user@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Роль *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Иван" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Фамилия</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Иванов" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Отправка..." : "Отправить приглашение"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}