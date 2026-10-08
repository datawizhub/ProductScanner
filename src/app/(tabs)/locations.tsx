import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { BarcodeCamera } from '@/components/barcode-camera';
import { AccessGate, Button, Copy, Field, Notice, Panel, Screen } from '@/components/warehouse-ui';
import { useRemote } from '@/hooks/use-remote';
import { useStore } from '@/lib/store-access';
import { errorMessage, listLocations, resolveBin } from '@/lib/warehouse';
export default function LocationsScreen() {
  const { access } = useStore();
  const [search, setSearch] = useState('');
  const [camera, setCamera] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const load = useCallback(() => access ? listLocations(access.storeId) : Promise.resolve([]), [access]);
  const { data, error, loading, reload } = useRemote('locations', load);
  return <AccessGate><Screen title="Locations">
    {access?.role === 'manager' ? <Button title="Add location" onPress={() => router.push('/locations/edit')} /> : null}
    <Button secondary title="Scan bin QR" disabled={loading} onPress={() => setCamera(true)} />
    <Field label="Filter locations" value={search} onChangeText={setSearch} placeholder="Aisle, rack, bin or code" />
    <Notice error message={error || scanError} />
    {loading ? <ActivityIndicator /> : null}
    {error ? <Button title="Retry" onPress={reload} /> : null}
    {!loading && data?.length === 0 ? <Copy muted>No locations yet. A manager can add aisle/rack/bin locations here.</Copy> : null}
    {data?.filter(location => [location.code, location.aisle, location.rack, location.bin]
      .some(value => value.toLowerCase().includes(search.toLowerCase()))).map(location => <Panel key={location.id}>
      <Copy title>{location.code}</Copy><Copy muted>Aisle {location.aisle} · Rack {location.rack} · Bin {location.bin}</Copy>
      <Button secondary title="View bin and QR label" onPress={() => router.push({ pathname: '/locations/[id]', params: { id: location.id } })} />
    </Panel>)}
    <Button secondary title="Refresh locations" onPress={reload} disabled={loading} />
    {camera && access ? <BarcodeCamera binsOnly onClose={() => setCamera(false)} onScan={code => {
      setCamera(false);
      try {
        const location = resolveBin(code, access.storeId, data || []);
        router.push({ pathname: '/locations/[id]', params: { id: location.id } });
      } catch (cause) { setScanError(errorMessage(cause)); }
    }} /> : null}
  </Screen></AccessGate>;
}
