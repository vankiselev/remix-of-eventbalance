// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Do not call Supabase inside the auth callback (can deadlock). Defer it.
        setTimeout(() => {
          checkInvitationStatus(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkInvitationStatus = async (userId: string) => {
    try {
      // Запрос для проверки статуса (разделены из-за ограничений типов)
      const { data: profile } = await supabase
        .from('profiles')
        .select('employment_status, termination_date')
        .eq('id', userId)
        .single();

      if (profile?.employment_status === 'terminated') {
        await supabase.auth.signOut();
        const terminationDate = profile.termination_date 
          ? new Date(profile.termination_date).toLocaleDateString('ru-RU')
          : '';
        toast({
          title: "Доступ закрыт",
          description: terminationDate 
            ? `Вы были уволены ${terminationDate}`
            : 'Вы были уволены',
          variant: "destructive",
        });
        return;
      }

      // Отдельный запрос для invitation_status (новая колонка)
      const { data: invitationData } = await supabase
        .from('profiles')
        .select('invitation_status' as any)
        .eq('id', userId)
        .single();

      // @ts-ignore - invitation_status is a new column
      if ((invitationData as any)?.invitation_status === 'pending') {
        navigate('/awaiting-invitation');
        return;
      }

      navigate("/dashboard");
    } catch (error) {
      navigate("/dashboard");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Ошибка входа",
            description: "Неверный email или пароль",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Ошибка",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Успешный вход",
          description: "Добро пожаловать в EventBalance!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при входе в систему",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">

      <Card className="w-[90%] max-w-[450px] sm:w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">EventBalance</CardTitle>
          <CardDescription>
            Система управления мероприятиями
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ваш@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Войти
            </Button>
            <div className="text-center">
              <Button 
                type="button"
                variant="link" 
                onClick={() => setShowForgotPassword(true)}
                className="text-sm"
              >
                Забыли пароль?
              </Button>
            </div>
          </form>

          {showForgotPassword && (
            <ForgotPasswordDialog 
              open={showForgotPassword}
              onOpenChange={setShowForgotPassword}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};


// Компонент диалога восстановления пароля
const ForgotPasswordDialog = ({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Письмо отправлено",
        description: "Проверьте почту для восстановления пароля",
      });
      onOpenChange(false);
      setEmail("");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить письмо",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Восстановление пароля</DialogTitle>
          <DialogDescription>
            Введите email для получения ссылки восстановления пароля
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="ваш@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Отправить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Auth;
