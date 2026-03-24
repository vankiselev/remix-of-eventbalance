import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AwaitingInvitationPage = () => {
  const { user, signOut, userProfile, isPendingInvitation } = useAuth();
  const navigate = useNavigate();

  // If user already has membership, redirect to dashboard
  useEffect(() => {
    if (user && !isPendingInvitation) {
      window.location.href = '/';
    }
  }, [user, isPendingInvitation]);

  // Listen for membership creation in realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('membership-approval')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tenant_memberships',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Membership created — admin approved! Reload to get fresh context.
          window.location.href = '/';
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Poll fallback every 15s in case realtime doesn't fire
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('tenant_memberships')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (data && data.length > 0) {
        window.location.href = '/';
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user]);

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
          <CardTitle className="text-2xl">Ожидание одобрения</CardTitle>
          <CardDescription className="text-base">
            Ваш аккаунт создан и ожидает одобрения администратора
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
              Администратор рассмотрит вашу заявку и предоставит доступ.
            </p>
            <p>
              Страница обновится автоматически после одобрения.
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
