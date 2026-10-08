import { Stack } from 'expo-router';

export default function ItemsLayout() 
{
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" options={{ title: 'Item details', headerBackTitle: 'Items' }}/>
    </Stack>
  );
}
