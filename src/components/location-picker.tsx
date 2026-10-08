import { useState } from 'react';
import { View } from 'react-native';
import { BarcodeCamera } from './barcode-camera';
import { Button, Copy, Field, Notice } from './warehouse-ui';
import { errorMessage, resolveBin, type Location } from '@/lib/warehouse';

export function LocationPicker({ label, storeId, locations, value, onChange, disabled = false }: {
  label: string; storeId: string; locations: Location[]; value: string; onChange: (id: string) => void; disabled?: boolean;
}) {
  const [camera, setCamera] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  return <View style={{ gap: 10 }}>
    <Copy title>{label}</Copy>
    <Field label={'Filter ' + label.toLowerCase()} placeholder="Aisle, rack, bin or code" value={search} onChangeText={setSearch} editable={!disabled} />
    {locations.filter(location => [location.code, location.aisle, location.rack, location.bin]
      .some(text => text.toLowerCase().includes(search.toLowerCase()))).map(location =>
      <Button key={location.id} title={(location.id === value ? 'Selected: ' : '') + location.code}
        secondary={location.id !== value} disabled={disabled} onPress={() => { onChange(location.id); setError(null); }} />)}
    {locations.length === 0 ? <Copy muted>No bins yet. Ask a manager to create one in Locations.</Copy> : null}
    <Button secondary title="Scan bin QR" disabled={disabled || !locations.length} onPress={() => setCamera(true)} />
    <Notice error message={error} />
    {camera ? <BarcodeCamera binsOnly onClose={() => setCamera(false)} onScan={code => {
      setCamera(false);
      try { onChange(resolveBin(code, storeId, locations).id); setError(null); }
      catch (cause) { setError(errorMessage(cause)); }
    }} /> : null}
  </View>;
}
