import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Button, Copy, Notice, Screen } from '@/components/warehouse-ui';
import { useAuth } from '@/lib/auth';
import { verifyAccountLink } from '@/lib/account-setup';
import { errorMessage } from '@/lib/warehouse';
export default function AuthCallbackScreen() {
  const { incomingUrl, beginPasswordSetup, finishPasswordSetup } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef<string | null>(null);
  useEffect(() => {
    if (!incomingUrl || processed.current === incomingUrl) return;
    processed.current = incomingUrl;
    void (async () => {
      try {
        beginPasswordSetup();
        await verifyAccountLink(incomingUrl);
        router.replace('/account-setup');
      } catch (cause) { finishPasswordSetup(); setError(errorMessage(cause)); }
    })();
  }, [incomingUrl, beginPasswordSetup, finishPasswordSetup]);
  return <Screen title="Verify account"><Copy>Verifying your email link…</Copy><Notice error message={error} />
    <Button title="Account setup" onPress={() => router.replace('/account-setup')} />
  </Screen>;
}
