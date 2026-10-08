import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Copy, Field, Notice, Screen } from '@/components/warehouse-ui';
import { useAuth } from '@/lib/auth';
import { accountCallbackUrl, verifyAccountLink } from '@/lib/account-setup';
import { getSupabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/warehouse';
export default function AccountSetupScreen() {
  const { email: initialEmail } = useLocalSearchParams<{ email?: string }>();
  const { session, needsPassword, beginPasswordSetup, finishPasswordSetup } = useAuth();
  const [email, setEmail] = useState(initialEmail || '');
  const [link, setLink] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const locked = useRef(false);
  async function run(task: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try { await task(); } catch (cause) { setError(errorMessage(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  async function requestReset() {
    if (!email.trim()) throw new Error('Enter your invited account email.');
    const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: accountCallbackUrl() });
    if (resetError) throw resetError;
    setNotice('If this account exists, a reset email has been sent. Installed builds can open the link on this phone. In Expo Go, copy the link address directly from your inbox without opening it, then paste it below. Avoid apps that preview links.');
  }
  async function verify() {
    beginPasswordSetup();
    try { await verifyAccountLink(link); setLink(''); setNotice(null); }
    catch (cause) { finishPasswordSetup(); throw cause; }
  }
  async function update() {
    if (password.length < 8) throw new Error('Use at least 8 characters.');
    if (password !== confirm) throw new Error('The passwords do not match.');
    const { error: updateError } = await getSupabase().auth.updateUser({ password });
    if (updateError) throw updateError;
    setPassword(''); setConfirm(''); finishPasswordSetup(); router.replace('/');
  }
  return <Screen title={needsPassword && session ? 'Choose your password' : 'Account setup'}>
    <Notice error message={error} /><Notice message={notice} />
    {needsPassword && session ? <>
      <Copy>Set a password to finish your invitation or reset.</Copy>
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
        autoComplete="new-password" editable={!busy} />
      <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" editable={!busy} />
      <Button title="Save password" busy={busy} onPress={() => { void run(update); }} />
      <Button secondary title="Cancel and sign out" disabled={busy} onPress={() => { void run(async () => {
        const { error: signOutError } = await getSupabase().auth.signOut();
        if (signOutError) throw signOutError;
        router.replace('/login');
      }); }} />
    </> : <>
      <Copy>Use your warehouse invitation, or request a password reset for an existing account.</Copy>
      <Notice message="In Expo Go, copy the original email link address without opening it. One-time links can be consumed by previews." />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
        autoComplete="email" editable={!busy} />
      <Button title="Send reset email" busy={busy} onPress={() => { void run(requestReset); }} />
      <Field label="Invitation or reset link" value={link} onChangeText={setLink} autoCapitalize="none" editable={!busy}
        placeholder="Paste the link address from your email" />
      <Button secondary title="Verify email link" busy={busy} disabled={!link.trim()} onPress={() => { void run(verify); }} />
      <Button secondary title={session ? 'Back to app' : 'Back to login'} disabled={busy}
        onPress={() => router.replace(session ? '/' : '/login')} />
    </>}
  </Screen>;
}
