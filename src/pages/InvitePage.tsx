// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Пароль должен содержать буквы и цифры"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

interface InvitationData {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  expires_at: string;
  status: string;
}

export function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const token = searchParams.get("token");

  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        toast({
          title: "Ошибка",
          description: "Некорректная ссылка приглашения",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      try {
        // Use the secure database function to validate invitation
        const { data, error } = await supabase
          .rpc('get_invitation_by_token', { invitation_token: token });

        if (error || !data || data.length === 0) {
          toast({
            title: "Ошибка",
            description: "Приглашение не найдено или уже использовано",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        setInvitation(data[0]);
      } catch (error) {
        console.error("Error validating invitation:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось проверить приглашение",
          variant: "destructive",
        });
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token, navigate, toast]);

  const hashToken = async (tokenValue: string): Promise<string> => {
    // Simple MD5 hash implementation for client-side
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenValue);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const onSubmit = async (data: PasswordFormData) => {
    if (!invitation) return;

    try {
      setIsSubmitting(true);

      const fullName = invitation.first_name && invitation.last_name 
        ? `${invitation.first_name} ${invitation.last_name}` 
        : invitation.email;

      // Use edge function to create user with email pre-confirmed (no confirmation email needed)
      const { data: result, error: fnError } = await supabase.functions.invoke('register-invited-user', {
        body: {
          email: invitation.email,
          password: data.password,
          full_name: fullName,
          role: invitation.role,
          invitation_token: token,
        },
      });

      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      toast({
        title: "Добро пожаловать!",
        description: "Ваш аккаунт успешно создан.",
      });

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: data.password,
      });

      if (signInError) {
        console.error("Auto sign-in error:", signInError);
        navigate("/auth");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось принять приглашение",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Проверка приглашения...</div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Приглашение не найдено</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Создание пароля</CardTitle>
          <p className="text-sm text-muted-foreground">
            Добро пожаловать в EventBalance!<br />
            {invitation.first_name && invitation.last_name 
              ? `${invitation.first_name} ${invitation.last_name}` 
              : invitation.email}
          </p>
          <p className="text-xs text-muted-foreground">
            Роль: {invitation.role === 'admin' ? 'Администратор' : 'Сотрудник'}
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Минимум 8 символов"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Подтверждение пароля</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Повторите пароль"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Создание аккаунта..." : "Создать аккаунт"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}