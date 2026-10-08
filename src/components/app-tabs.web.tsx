import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '@/constants/theme';
export default function WebTabs() {
  const { colors } = useTheme();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSecondary, tabBarStyle: { backgroundColor: colors.background } }}>
    <Tabs.Screen name="index" options={{ title: 'Scan', tabBarIcon: ({ color, size }) => <Ionicons name="barcode-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="item" options={{ title: 'Items', tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="locations" options={{ title: 'Locations', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
  </Tabs>;
}
