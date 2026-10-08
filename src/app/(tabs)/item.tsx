import { router } from 'expo-router';
import { CatalogBrowser } from '@/components/catalog-browser';
import { AccessGate, Button } from '@/components/warehouse-ui';
import { useStore } from '@/lib/store-access';
export default function ItemsScreen() {
  const { access } = useStore();
  return <AccessGate><CatalogBrowser title="Items"
    header={access?.role === 'manager' ? <Button title="Add item" onPress={() => router.push('/items/edit')} /> : null}
    onChoose={item => router.push({ pathname: '/items/[id]', params: { id: item.id } })} /></AccessGate>;
}
