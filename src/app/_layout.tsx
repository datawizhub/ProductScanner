import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { MessageScreen } from '@/components/message-screen';
import { ThemeContextProvider } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { StoreProvider } from '@/lib/store-access';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { ready, session, needsPassword } = useAuth();

  if (!isSupabaseConfigured) 
  {
    return (
      <MessageScreen message="Add the Supabase URL and publishable key to .env.local, then restart Expo." />
    );
  }
  // The splash overlay covers the screen until the session is known.
  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session && !needsPassword}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="items" options={{ headerShown: false }} />
        <Stack.Screen name="locations" />
        <Stack.Screen name="stock" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Screen name="account-setup" />
      <Stack.Screen name="auth-callback" />
      
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ThemeContextProvider>
        <AuthProvider>
          <StoreProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
          </StoreProvider>
        </AuthProvider>
      </ThemeContextProvider>
    </ThemeProvider>
  );
}
