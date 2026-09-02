import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { Me } from '../lib/types';

interface AuthState {
  session: Session | null;
  sessionLoading: boolean;
  me: Me | null;
  meError: string | null;
  can: (permission: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  sessionLoading: true,
  me: null,
  meError: null,
  can: () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  const meQuery = useQuery({
    queryKey: ['me', session?.user.id],
    queryFn: () => api.get<Me>('/me'),
    enabled: !!session,
    staleTime: 60_000,
    retry: false,
  });

  const value = useMemo<AuthState>(
    () => ({
      session,
      sessionLoading,
      me: meQuery.data ?? null,
      meError: meQuery.error ? String((meQuery.error as Error).message) : null,
      can: (permission) => meQuery.data?.permissions.includes(permission) ?? false,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, sessionLoading, meQuery.data, meQuery.error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
