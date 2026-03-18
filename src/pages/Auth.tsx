// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        title: "Необходимо принять условия",
        description: "Пожалуйста, примите Политику конфиденциальности и Условия использования",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      const cleanEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            first_name: fullName.split(' ')[0] || fullName,
            last_name: fullName.split(' ').slice(1).join(' ') || '',
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Email уже зарегистрирован",
            description: "Попробуйте войти или используйте другой email",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Ошибка регистрации",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        // Показываем сообщение об успешной регистрации
        setRegistrationSuccess(true);
        
        // Если подтверждение email отключено, выходим
        if (data.session) {
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при регистрации",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Показываем экран успешной регистрации
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">

        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Регистрация успешна!</CardTitle>
            <CardDescription className="text-base">
              Ваша заявка отправлена на рассмотрение
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Администратор системы рассмотрит вашу заявку и предоставит доступ. 
              Вы получите уведомление на email <strong>{email}</strong>, когда ваш аккаунт будет активирован.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setRegistrationSuccess(false);
                setEmail('');
                setPassword('');
                setFullName('');
                setAgreedToTerms(false);
              }}
            >
              Вернуться к форме входа
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Back to landing button */}
      <div className="fixed top-4 left-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            На главную
          </Link>
        </Button>
      </div>

      <Card className="w-[90%] max-w-[450px] sm:w-[400px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">EventBalance</CardTitle>
          <CardDescription>
            Система управления мероприятиями
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
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
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
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
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Полное имя</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Иван Иванов"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ваш@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Пароль</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Минимум 6 символов"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                
                {/* Согласие с политикой конфиденциальности (ФЗ-152) */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-tight cursor-pointer"
                  >
                    Я соглашаюсь с{" "}
                    <Link 
                      to="/privacy" 
                      target="_blank" 
                      className="text-primary hover:underline"
                    >
                      Политикой конфиденциальности
                    </Link>{" "}
                    и{" "}
                    <Link 
                      to="/terms" 
                      target="_blank" 
                      className="text-primary hover:underline"
                    >
                      Условиями использования
                    </Link>
                  </label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !agreedToTerms}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Зарегистрироваться
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  После регистрации администратор рассмотрит вашу заявку и предоставит доступ к системе
                </p>
              </form>
            </TabsContent>
          </Tabs>

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
