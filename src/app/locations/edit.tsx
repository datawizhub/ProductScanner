import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AccessGate, Button, Copy, Field, Notice, Screen } from '@/components/warehouse-ui';
import { useRemote } from '@/hooks/use-remote';
import { useStore } from '@/lib/store-access';
import { errorMessage, listLocations, saveLocation, type Location } from '@/lib/warehouse';
export default function LocationEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { access } = useStore();
  const load = useCallback(async () => id && access ? (await listLocations(access.storeId)).find(row => row.id === id) : null, [id, access]);
  const { data, error, loading, reload } = useRemote('edit-location:' + (id || 'new'), load);
  return <AccessGate manager><Screen title={id ? 'Edit location' : 'Add location'} back>
    {loading ? <ActivityIndicator /> : null}<Notice error message={error} />
    {error ? <Button title="Retry" onPress={reload} /> : null}
    {!loading && !error && (!id || data) ? <LocationForm key={id || 'new'} initial={data || undefined} /> : null}
    {!loading && !error && id && !data ? <Copy>Location not found.</Copy> : null}
  </Screen></AccessGate>;
}
function LocationForm({ initial }: { initial?: Location }) {
  const { access } = useStore();
  const [aisle, setAisle] = useState(initial?.aisle || '');
  const [rack, setRack] = useState(initial?.rack || '');
  const [bin, setBin] = useState(initial?.bin || '');
  const [code, setCode] = useState(initial?.code || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  async function save() {
    if (!access || locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      const fields = { aisle: aisle.trim(), rack: rack.trim(), bin: bin.trim(),
        code: code.trim() || [aisle.trim(), rack.trim(), bin.trim()].join('-') };
      if (![fields.aisle, fields.rack, fields.bin].every(value => value.length > 0)) throw new Error('Enter aisle, rack and bin.');
      const id = await saveLocation(access.storeId, fields, initial?.id);
      router.replace({ pathname: '/locations/[id]', params: { id } });
    } catch (cause) { setError(errorMessage(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <View style={{ gap: 16 }}>
    <Field label="Aisle" value={aisle} onChangeText={setAisle} placeholder="A" maxLength={50} editable={!busy} />
    <Field label="Rack" value={rack} onChangeText={setRack} placeholder="01" maxLength={50} editable={!busy} />
    <Field label="Bin" value={bin} onChangeText={setBin} placeholder="01" maxLength={50} editable={!busy} />
    <Field label="Location code (optional)" value={code} onChangeText={setCode} placeholder="A-01-01" maxLength={100} editable={!busy} />
    <Copy muted>If left blank, the code uses aisle-rack-bin.</Copy><Notice error message={error} />
    <Button title="Save location" busy={busy} onPress={() => { void save(); }} />
  </View>;
}
