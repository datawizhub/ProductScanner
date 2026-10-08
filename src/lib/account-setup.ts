import { parseAccountLink } from './account-links';
import { getSupabase } from './supabase';
export function accountCallbackUrl() { return 'productscanner://auth-callback'; }
export async function verifyAccountLink(value: string) {
  const link = parseAccountLink(value, process.env.EXPO_PUBLIC_SUPABASE_URL || '', accountCallbackUrl());
  const auth = getSupabase().auth;
  const result = link.kind === 'token'
    ? await auth.verifyOtp({ token_hash: link.tokenHash, type: link.type })
    : link.kind === 'code' ? await auth.exchangeCodeForSession(link.code)
      : await auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
  if (result.error) throw result.error;
  if (!result.data.session) throw new Error('Could not verify this link. Request a new email.');
}
