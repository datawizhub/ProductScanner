import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { errorMessage } from '@/lib/warehouse';

export function useRemote<T>(key: string, load: () => Promise<T>) {
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null; pending: boolean }>({
    key: '', data: null, error: null, pending: true,
  });
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.resolve(revision).then(load).then(data => {
      if (active) setState({ key, data, error: null, pending: false });
    }).catch(error => {
      if (active) setState(previous => ({
        key, data: previous.key === key ? previous.data : null, error: errorMessage(error), pending: false,
      }));
    });
    return () => { active = false; };
  }, [key, load, revision]));
  const reload = useCallback(() => {
    setState(previous => ({ ...previous, pending: true, error: null }));
    setRevision(n => n + 1);
  }, []);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: state.key !== key || state.pending, reload,
  };
}
