export type AccountLink =
  | { kind: 'token'; tokenHash: string; type: 'invite' | 'recovery' }
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string };
export function parseAccountLink(value: string, projectUrl: string, callbackUrl: string): AccountLink {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('Paste the full account setup link from your email.'); }
  const project = new URL(projectUrl);
  const callback = new URL(callbackUrl);
  const isVerification = url.origin === project.origin && url.pathname === '/auth/v1/verify';
  const isCallback = url.protocol === callback.protocol && url.host === callback.host && url.pathname === callback.pathname;
  if (!isVerification && !isCallback) throw new Error('This link does not belong to this warehouse app.');
  const fragment = new URLSearchParams(url.hash.slice(1));
  const error = url.searchParams.get('error_description') || fragment.get('error_description');
  if (error) throw new Error(error);
  const type = url.searchParams.get('type') || fragment.get('type');
  if (isVerification) {
    if (type !== 'invite' && type !== 'recovery') throw new Error('Use an invitation or password reset email.');
    const tokenHash = url.searchParams.get('token_hash') || url.searchParams.get('token');
    if (!tokenHash) throw new Error('The email link is missing its verification token.');
    return { kind: 'token', tokenHash, type };
  }
  const code = url.searchParams.get('code');
  if (code) return { kind: 'code', code };
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken };
  throw new Error('This setup link has no session. Request a fresh email.');
}
