import { useState } from 'react';
import { router } from 'expo-router';
import { AccessGate, Button, Copy, Notice, Panel, Screen } from '@/components/warehouse-ui';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store-access';
import { getSupabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/warehouse';
export default function AccountScreen() {
  const { session } = useAuth();
  const { access, reload } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    setBusy(true); setError(null);
    try {
      const { error: signOutError } = await getSupabase().auth.signOut();
      if (signOutError) throw signOutError;
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  return <AccessGate><Screen title="Account">
    <Panel><Copy title>{session?.user.email}</Copy><Copy>{access?.storeName}</Copy><Copy>Role: {access?.role}</Copy></Panel>
    <Copy muted>{access?.role === 'manager' ? 'You can edit catalog and locations, receive, move, pick and adjust stock.' :
      'You can scan, view stock, receive, move and pick. Ask a manager for catalog changes or count adjustments.'}</Copy>
    <Button secondary title="Refresh access" onPress={reload} />
    <Button secondary title="Reset password" onPress={() => router.push({ pathname: '/account-setup', params: { email: session?.user.email || '' } })} />
    <Notice message="Need another account? Your warehouse administrator creates it and assigns staff or manager access." />
    <Notice error message={error} /><Button title="Sign out" busy={busy} onPress={() => { void signOut(); }} />
  </Screen></AccessGate>;
}
