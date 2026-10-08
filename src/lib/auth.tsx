import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { appStorage } from './session-storage';

type AuthState = { ready: boolean; session: Session | null };
const SETUP_KEY = 'warehouse-password-setup';
type AuthContextValue = AuthState & { needsPassword: boolean; incomingUrl: string | null; beginPasswordSetup: () => void; finishPasswordSetup: () => void };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [needsPassword, setNeedsPassword] = useState(() => {
    try { return appStorage.getItem(SETUP_KEY) === 'true'; } catch { return false; }
  });
  const [incomingUrl, setIncomingUrl] = useState<string | null>(null);
  const beginPasswordSetup = useCallback(() => { appStorage.setItem(SETUP_KEY, 'true'); setNeedsPassword(true); }, []);
  const finishPasswordSetup = useCallback(() => { appStorage.removeItem(SETUP_KEY); setNeedsPassword(false); }, []);
  useEffect(() => {
    let active = true;
    void Linking.getInitialURL().then(url => { if (active) setIncomingUrl(url); });
    const listener = Linking.addEventListener('url', event => setIncomingUrl(event.url));
    return () => { active = false; listener.remove(); };
  }, []);
  const [auth, setAuth] = useState<AuthState>({
    ready: !isSupabaseConfigured,
    session: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        appStorage.setItem(SETUP_KEY, 'true'); setNeedsPassword(true);
      }
      if (event === 'SIGNED_OUT') {
        appStorage.removeItem(SETUP_KEY); setNeedsPassword(false);
      }
      setAuth({ ready: true, session });
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ ...auth, needsPassword, incomingUrl, beginPasswordSetup, finishPasswordSetup }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
