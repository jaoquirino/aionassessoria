import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // When user signs up or signs in, check for first admin assignment
        if (event === 'SIGNED_IN' && session?.access_token) {
          setTimeout(() => {
            assignRoleIfNeeded(session.access_token);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const assignRoleIfNeeded = async (token: string) => {
    try {
      const response = await supabase.functions.invoke('assign-first-admin', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data?.isFirstAdmin) {
        console.log('First admin created successfully');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
    }
  };

  const checkHasAdmin = async (): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke('check-has-admin');
      return response.data?.hasAdmin ?? false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, makeAdmin: boolean = false) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          make_admin: makeAdmin,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth/reset-password`;
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { data, error };
  };

  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    checkHasAdmin,
  };
}
