import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { errorMessage, getStoreAccess, type StoreAccess } from './warehouse';

type State = { userId?: string; access: StoreAccess | null; error: string | null; revision: number };
const Context = createContext<{ access: StoreAccess | null; ready: boolean; error: string | null; reload: () => void } | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [state, setState] = useState<State>({ access: null, error: null, revision: -1 });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    getStoreAccess(userId).then(access => {
      if (active) setState({ userId, access, error: null, revision });
    }).catch(error => {
      if (active) setState({ userId, access: null, error: errorMessage(error), revision });
    });
    return () => { active = false; };
  }, [userId, revision]);
  const current = state.userId === userId && state.revision === revision;
  return <Context.Provider value={{
    access: current ? state.access : null, error: current ? state.error : null,
    ready: !userId || current, reload: () => setRevision(n => n + 1),
  }}>{children}</Context.Provider>;
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error('StoreProvider is missing.');
  return value;
}
