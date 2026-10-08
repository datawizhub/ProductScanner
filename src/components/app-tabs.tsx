import { useTheme } from '@/constants/theme';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
export default function AppTabs() {
  const { colors } = useTheme();
  return <NativeTabs backgroundColor={colors.background} indicatorColor={colors.backgroundElement}
    labelStyle={{ selected: { color: colors.primary } }}>
    <NativeTabs.Trigger name="index">
      <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="barcode-outline" />} renderingMode="template" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="item">
      <NativeTabs.Trigger.Label>Items</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="cube-outline" />} renderingMode="template" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="locations">
      <NativeTabs.Trigger.Label>Locations</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="grid-outline" />} renderingMode="template" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="account">
      <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="person-outline" />} renderingMode="template" />
    </NativeTabs.Trigger>
  </NativeTabs>;
}
