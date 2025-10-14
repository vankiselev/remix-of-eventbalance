import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    // Check if user is terminated and sign them out
    const checkEmploymentStatus = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('employment_status')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error checking employment status:', error);
          return;
        }

        if (data?.employment_status === 'terminated') {
          console.log('User is terminated, signing out...');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error in checkEmploymentStatus:', error);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check employment status when user signs in or session is restored
        if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          await checkEmploymentStatus(session.user.id);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Check employment status for existing session
      if (session?.user) {
        await checkEmploymentStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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