import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useRemote } from '@/hooks/use-remote';
import { useStore } from '@/lib/store-access';
import { findItemById } from '@/lib/warehouse-lookup';
import { Button, Copy, Notice, Panel, layout } from './warehouse-ui';

export function StockSection({ itemId }: { itemId: string }) {
  const { access } = useStore();
  const load = useCallback(() => findItemById(itemId), [itemId]);
  const { data, error, loading, reload } = useRemote('stock:' + itemId, load);
  return <View style={layout.stack}>
    <Panel>
      <Copy title>In stock: {data?.totalQuantity ?? '…'}</Copy>
      {loading ? <ActivityIndicator /> : null}
      <Notice error message={error} />
      {data?.stock.length === 0 ? <Copy muted>No stock recorded. Receive stock into a bin to get started.</Copy> : null}
      {data?.stock.map(({ location, quantity }) => <View key={location.id} style={layout.row}>
        <View style={{ flex: 1 }}>
          <Copy>{location.code}</Copy>
          <Copy muted>Aisle {location.aisle} · Rack {location.rack} · Bin {location.bin}</Copy>
        </View>
        <Copy title>{quantity}</Copy>
      </View>)}
      <Button secondary title="Refresh stock" onPress={reload} disabled={loading} />
    </Panel>
    <Copy title>Stock actions</Copy>
    <View style={layout.row}>
      {(['receive', 'move', 'pick', ...(access?.role === 'manager' ? ['adjust'] : [])] as const).map(action =>
        <Button key={action} title={action === 'adjust' ? 'Adjust count' : action.charAt(0).toUpperCase() + action.slice(1)}
          onPress={() => router.push({ pathname: '/stock/[id]', params: { id: itemId, action } })} />)}
    </View>
    <Button secondary title="Movement history" onPress={() => router.push({ pathname: '/items/history', params: { id: itemId } })} />
  </View>;
}
