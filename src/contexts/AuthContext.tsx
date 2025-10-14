import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check employment status and update session/user
  const checkEmploymentStatusAndSetUser = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    // Check employment status before setting user
    const { data: profile } = await supabase
      .from('profiles')
      .select('employment_status, termination_date')
      .eq('id', currentSession.user.id)
      .single();

    if (profile?.employment_status === 'terminated') {
      const terminationDate = profile.termination_date 
        ? new Date(profile.termination_date).toLocaleDateString('ru-RU')
        : '';
      const message = terminationDate 
        ? `Доступ закрыт! Вы были уволены ${terminationDate}`
        : 'Доступ закрыт! Вы были уволены';
      toast.error(message, { duration: 10000 });
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    // If not terminated, set the session and user
    setSession(currentSession);
    setUser(currentSession.user);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
        } else {
          await checkEmploymentStatusAndSetUser(session);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await checkEmploymentStatusAndSetUser(session);
    });

    return () => subscription.unsubscribe();
  }, [checkEmploymentStatusAndSetUser]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};