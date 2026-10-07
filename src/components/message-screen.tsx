import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/constants/theme';

type Props = 
{
  message: string;
  loading?: boolean;
  onRetry?: () => void;
  onSignOut?: () => void;
};

export function MessageScreen({ message, loading = false, onRetry, onSignOut }: Props) 
{
  const { colors, spacing } = useTheme();

  return (
    <SafeAreaView
      style=
      {[
        styles.container, { backgroundColor: colors.background, padding: spacing.four, gap: spacing.three },
      ]}>
      {loading && <ActivityIndicator color={colors.primary} />}
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text style={[styles.action, { color: colors.primary }]}>Retry</Text>
        </Pressable>
      )}
      {onSignOut && (
        <Pressable accessibilityRole="button" onPress={onSignOut}>
          <Text style={[styles.action, { color: colors.primary }]}>Sign out</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 15, textAlign: 'center' },
  action: { fontWeight: '600' },
});
