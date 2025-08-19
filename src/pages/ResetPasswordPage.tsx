import { useState, useEffect } from "react";
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

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        toast({
          title: "Ошибка",
          description: "Недействительная ссылка для сброса пароля",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      try {
        // Validate token using our secure function
        const { data: isValid, error } = await supabase.rpc(
          'validate_password_reset_token',
          { reset_token: token }
        );
        
        if (error) throw error;
        
        if (isValid) {
          setIsValidToken(true);
        } else {
          toast({
            title: "Ошибка",
            description: "Ссылка недействительна или истекла",
            variant: "destructive",
          });
          navigate("/auth");
        }
      } catch (error) {
        console.error("Error validating reset token:", error);
        toast({
          title: "Ошибка",
          description: "Не удалось проверить ссылку сброса пароля",
          variant: "destructive",
        });
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [searchParams, navigate, toast]);

  const onSubmit = async (data: PasswordFormData) => {
    const token = searchParams.get('token');
    
    if (!token) {
      toast({
        title: "Ошибка",
        description: "Недействительная ссылка для сброса пароля",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // First validate and mark token as used
      const { data: isValid, error: tokenError } = await supabase.rpc(
        'reset_password_with_token',
        { 
          reset_token: token,
          new_password: data.password 
        }
      );

      if (tokenError || !isValid) {
        toast({
          title: "Ошибка",
          description: "Ссылка недействительна или истекла",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      toast({
        title: "Пароль обновлен",
        description: "Ваш пароль успешно изменен. Теперь вы можете войти в систему.",
      });

      navigate("/auth");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить пароль",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Проверка ссылки...</div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div>Недействительная ссылка</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Новый пароль</CardTitle>
          <p className="text-sm text-muted-foreground">
            Создайте новый надежный пароль для вашего аккаунта
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
                    <FormLabel>Новый пароль</FormLabel>
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
                {isSubmitting ? "Сохранение..." : "Сохранить новый пароль"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}