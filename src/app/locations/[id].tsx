import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { AccessGate, Button, Copy, Notice, Panel, Screen } from '@/components/warehouse-ui';
import { useRemote } from '@/hooks/use-remote';
import { useStore } from '@/lib/store-access';
import { getSupabase } from '@/lib/supabase';
import { binLabel, deleteLocation, errorMessage, listLocations } from '@/lib/warehouse';
export default function BinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { access } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const load = useCallback(async () => {
    if (!access) return null;
    const client = getSupabase();
    const [locations, stock] = await Promise.all([
      listLocations(access.storeId),
      client.from('stock').select('item_id,quantity').eq('store_id', access.storeId).eq('location_id', id).gt('quantity', 0),
    ]);
    if (stock.error) throw stock.error;
    const location = locations.find(row => row.id === id);
    if (!location) return null;
    if (!stock.data?.length) return { location, contents: [] };
    const { data: items, error: itemError } = await client.from('items').select('id,name,sku')
      .eq('store_id', access.storeId).in('id', stock.data.map(row => row.item_id));
    if (itemError) throw itemError;
    const byId = new Map(items?.map(item => [item.id, item]));
    return { location, contents: stock.data.map(row => ({ ...row, item: byId.get(row.item_id) })) };
  }, [access, id]);
  const remote = useRemote('bin:' + id, load);
  async function remove() {
    if (!access || locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try { await deleteLocation(access.storeId, id); router.replace('/(tabs)/locations'); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <AccessGate><Screen title={remote.data?.location.code || 'Bin details'} back>
    {remote.loading ? <ActivityIndicator /> : null}<Notice error message={remote.error || error} />
    {remote.error ? <Button title="Retry" onPress={remote.reload} /> : null}
    {!remote.loading && !remote.data && !remote.error ? <Copy>Location not found.</Copy> : null}
    {remote.data && access ? <>
      <Copy>Aisle {remote.data.location.aisle} · Rack {remote.data.location.rack} · Bin {remote.data.location.bin}</Copy>
      <Copy title>Bin QR label</Copy>
      <View accessibilityLabel={'QR label for bin ' + remote.data.location.code} style={{ backgroundColor: '#ffffff', padding: 24, alignSelf: 'center' }}>
        <QRCode value={binLabel(access.storeId, id)} size={220} quietZone={16} color="#000000" backgroundColor="#ffffff" />
      </View>
      <Copy muted>Scan this label when receiving or moving stock. It keeps working if the location code changes.</Copy>
      {access.role === 'manager' ? <Button secondary title="Edit location"
        onPress={() => router.push({ pathname: '/locations/edit', params: { id } })} /> : null}
      <Copy title>Stock in this bin</Copy>
      {remote.data.contents.length === 0 ? <Copy muted>This bin currently has no stock.</Copy> : null}
      {remote.data.contents.map(row => <Panel key={row.item_id}>
        <Copy title>{row.item?.name || row.item_id}</Copy><Copy>{row.quantity} units</Copy>
        <Button secondary title="Open item" onPress={() => router.push({ pathname: '/items/[id]', params: { id: row.item_id } })} />
      </Panel>)}
      <Button secondary title="Refresh bin contents" onPress={remote.reload} disabled={remote.loading} />
      {access.role === 'manager' ? <>
        <Button secondary title="Delete unused location" disabled={busy} onPress={() => setConfirm(true)} />
        {confirm ? <Panel><Copy>Delete {remote.data.location.code}? Locations with stock or movement history cannot be deleted.</Copy>
          <Button danger title="Confirm deletion" busy={busy} onPress={() => { void remove(); }} />
          <Button secondary title="Cancel" disabled={busy} onPress={() => setConfirm(false)} /></Panel> : null}
      </> : null}
    </> : null}
  </Screen></AccessGate>;
}
