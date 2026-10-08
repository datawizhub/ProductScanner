import { useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/constants/theme';
import { useStore } from '@/lib/store-access';
import { getSupabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/warehouse';

export function Button({ title, onPress, busy = false, disabled = false, secondary = false, danger = false }: {
  title: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean; danger?: boolean;
}) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button, {
      backgroundColor: secondary ? colors.backgroundElement : danger ? colors.danger : colors.primary,
      opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1,
    }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.text : colors.primaryText} /> :
      <Text style={{ fontWeight: '600', fontSize: 16, color: secondary ? colors.text : colors.primaryText }}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return <View style={{ gap: 6 }}>
    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.textSecondary} autoCorrect={false}
      {...props} style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement,
        borderColor: colors.backgroundSelected, opacity: props.editable === false ? 0.6 : 1 }, props.style]} />
  </View>;
}
export function Copy({ children, title = false, muted = false }: { children: ReactNode; title?: boolean; muted?: boolean }) {
  const { colors } = useTheme();
  return <Text style={{ color: muted ? colors.textSecondary : colors.text, fontSize: title ? 21 : 16,
    fontWeight: title ? '700' : '400', lineHeight: title ? 28 : 23 }}>{children}</Text>;
}
export function Notice({ message, error = false }: { message?: string | null; error?: boolean }) {
  const { colors } = useTheme();
  return message ? <Text accessibilityLiveRegion={error ? 'assertive' : 'polite'}
    style={{ color: error ? colors.danger : colors.textSecondary, fontSize: 15, lineHeight: 22 }}>{message}</Text> : null;
}
export function Panel({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.panel, { backgroundColor: colors.backgroundElement }]}>{children}</View>;
}
export function Screen({ title, children, back = false }: { title: string; children: ReactNode; back?: boolean }) {
  const { colors } = useTheme();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
        {back ? <Button secondary title="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /> : null}
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>{title}</Text>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function AccessGate({ children, manager = false }: { children: ReactNode; manager?: boolean }) {
  const { access, ready, error, reload } = useStore();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true); setSignOutError(null);
    try {
      const { error: failure } = await getSupabase().auth.signOut();
      if (failure) throw failure;
    } catch (cause) { setSignOutError(errorMessage(cause)); }
    finally { setBusy(false); }
  }
  if (!ready) return <Screen title="Warehouse"><ActivityIndicator /><Copy>Checking store access…</Copy></Screen>;
  if (error || !access) return <Screen title="Store access">
    <Notice error={!!error} message={error || 'Your account needs a store membership. Contact your warehouse administrator.'} />
    <Button title="Retry" onPress={reload} />
    <Notice error message={signOutError} />
    <Button secondary title="Sign out" busy={busy} onPress={() => { void signOut(); }} />
  </Screen>;
  if (manager && access.role !== 'manager') return <Screen title="Manager access" back>
    <Copy>This action requires a manager. You can still scan and manage stock.</Copy>
  </Screen>;
  return children;
}
export const layout = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  stack: { gap: 16 },
});
const styles = StyleSheet.create({
  screen: { padding: 24, gap: 20, paddingBottom: 48, width: '100%', maxWidth: 720, alignSelf: 'center' },
  panel: { padding: 18, borderRadius: 14, gap: 12 },
  button: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, minHeight: 48 },
});
