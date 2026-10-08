import { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StockSection } from '@/components/stock-section';
import { AccessGate, Button, Copy, Notice, Panel, Screen } from '@/components/warehouse-ui';
import { useRemote } from '@/hooks/use-remote';
import { useStore } from '@/lib/store-access';
import { findItemById } from '@/lib/warehouse-lookup';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { access } = useStore();
  const load = useCallback(() => findItemById(id), [id]);
  const { data, error, loading, reload } = useRemote(id, load);
  return <AccessGate><Screen title="Item details" back>
    {loading && !data ? <ActivityIndicator /> : null}
    <Notice error message={error} />
    {error ? <Button title="Retry" onPress={reload} /> : null}
    {!loading && !error && !data ? <Copy>Item not found in your store.</Copy> : null}
    {data ? <>
      <Panel><Copy title>{data.item.name}</Copy><Copy muted>SKU: {data.item.sku}</Copy>
        <Copy>{'A$'}{Number(data.item.price).toFixed(2)} per {data.item.unit}</Copy>
        {data.item.description ? <Copy muted>{data.item.description}</Copy> : null}
      </Panel>
      {access?.role === 'manager' ? <Button secondary title="Edit item and barcodes"
        onPress={() => router.push({ pathname: '/items/edit', params: { id } })} /> : null}
      <StockSection itemId={id} />
    </> : null}
  </Screen></AccessGate>;
}
