// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('employment_status, termination_date')
          .eq('id', data.user.id)
          .single();

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

        // Pending check is handled by ProtectedRoute via AuthContext.isPendingInvitation

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
