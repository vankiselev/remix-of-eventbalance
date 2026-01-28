import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AwaitingInvitationPage = () => {
  const { user, signOut, userProfile } = useAuth();
  const navigate = useNavigate();

  // Подписка на изменение статуса в реальном времени
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('invitation-status-change')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).invitation_status;
          if (newStatus === 'invited') {
            // Перезагружаем страницу для обновления контекста авторизации
            window.location.href = '/dashboard';
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Ожидание приглашения</CardTitle>
          <CardDescription className="text-base">
            Ваша заявка на регистрацию отправлена на рассмотрение
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{user?.email}</span>
            </div>
            {userProfile?.full_name && (
              <p className="text-sm text-muted-foreground">
                {userProfile.full_name}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Администратор системы рассмотрит вашу заявку и предоставит доступ.
            </p>
            <p>
              Вы получите уведомление, когда ваш аккаунт будет активирован.
            </p>
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AwaitingInvitationPage;
