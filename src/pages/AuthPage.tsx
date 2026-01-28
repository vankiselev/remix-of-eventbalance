import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast.error("Необходимо принять условия", {
        description: "Пожалуйста, примите Политику конфиденциальности и Условия использования",
      });
      return;
    }

    setLoading(true);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error("Email уже зарегистрирован", {
            description: "Попробуйте войти или используйте другой email",
          });
        } else {
          toast.error("Ошибка регистрации", {
            description: error.message,
          });
        }
        return;
      }

      if (data.user) {
        // Показываем сообщение об успешной регистрации
        setRegistrationSuccess(true);
        
        // Если подтверждение email отключено, выходим и показываем сообщение
        if (data.session) {
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      toast.error("Ошибка", {
        description: error.message || "Произошла ошибка при регистрации",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Ошибка входа", {
          description: error.message,
        });
        return;
      }

      if (data.user) {
        // Check profile status
        const { data: profile } = await supabase
          .from('profiles')
          .select('employment_status, termination_date')
          .eq('id', data.user.id)
          .single();

        // Check if user is terminated
        if (profile?.employment_status === 'terminated') {
          await supabase.auth.signOut();
          
          const terminationDate = profile.termination_date 
            ? new Date(profile.termination_date).toLocaleDateString('ru-RU')
            : '';
          const message = terminationDate 
            ? `Доступ закрыт! Вы были уволены ${terminationDate}`
            : 'Доступ закрыт! Вы были уволены';
          
          toast.error(message, {
            duration: 10000,
          });
          return;
        }

        // Check if user is pending invitation (separate query for new column)
        const { data: invitationData } = await supabase
          .from('profiles')
          .select('invitation_status' as any)
          .eq('id', data.user.id)
          .single();

        if ((invitationData as any)?.invitation_status === 'pending') {
          window.location.href = '/awaiting-invitation';
          return;
        }

        toast.success("Вход выполнен успешно!", {
          description: "Добро пожаловать в систему.",
        });
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      toast.error("Ошибка", {
        description: error.message || "Произошла ошибка при входе",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: resetEmail }
      });

      if (error) {
        throw error;
      }

      toast.success("Ссылка отправлена", {
        description: "Если email существует в системе, ссылка для сброса пароля была отправлена на почту.",
      });
      
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast.error("Ошибка", {
        description: error.message || "Не удалось отправить ссылку для сброса пароля",
      });
    } finally {
      setResetLoading(false);
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Финансовый помощник</CardTitle>
          <CardDescription>
            Система управления финансами для ивент сферы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="w-full justify-center">
              <TabsTrigger value="signin">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="ваш@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Пароль</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Вход..." : "Войти"}
                </Button>
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm"
                    onClick={() => setShowForgotPassword(true)}
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
                    placeholder="••••••••"
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
                  disabled={loading || !agreedToTerms}
                >
                  {loading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  После регистрации администратор рассмотрит вашу заявку и предоставит доступ к системе
                </p>
              </form>
            </TabsContent>
          </Tabs>

          {showForgotPassword && (
            <div className="mt-6 p-4 border rounded-lg">
              <h3 className="text-lg font-medium mb-4">Сброс пароля</h3>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="ваш@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={resetLoading}>
                    {resetLoading ? "Отправка..." : "Отправить ссылку"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
