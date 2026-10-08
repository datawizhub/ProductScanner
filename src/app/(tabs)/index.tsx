import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { BarcodeCamera } from '@/components/barcode-camera';
import { AccessGate, Button, Copy, Field, Notice, Panel, Screen } from '@/components/warehouse-ui';
import { useStore } from '@/lib/store-access';
import { listLocations, resolveBin, errorMessage, validBarcode } from '@/lib/warehouse';
import { lookupBarcode } from '@/lib/warehouse-lookup';

export default function ScannerScreen() {
  const { access } = useStore();
  const [camera, setCamera] = useState(false);
  const [code, setCode] = useState('');
  const [unknown, setUnknown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function lookup(value: string) {
    if (!access || inFlight.current) return;
    inFlight.current = true;
    setCamera(false); setBusy(true); setError(null); setUnknown(null);
    try {
      if (value.startsWith('warehouse-bin:')) {
        const location = resolveBin(value, access.storeId, await listLocations(access.storeId));
        router.push({ pathname: '/locations/[id]', params: { id: location.id } });
      } else {
        const barcode = validBarcode(value);
        setCode(barcode);
        const result = await lookupBarcode(access.storeId, barcode);
        if (result) router.push({ pathname: '/items/[id]', params: { id: result.item.id } });
        else setUnknown(barcode);
      }
    } catch (cause) { setError(errorMessage(cause)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <AccessGate><Screen title="Scan stock">
    <Copy muted>{access?.storeName} · {access?.role}</Copy>
    <Button title="Scan a barcode" disabled={busy} onPress={() => setCamera(true)} />
    <Copy muted>Scan a product for its quantity and location, or a bin QR label to see its contents.</Copy>
    <Field label="Barcode" value={code} onChangeText={setCode} autoCapitalize="none"
      placeholder="Enter a barcode if its label is damaged" editable={!busy}
      onSubmitEditing={() => { void lookup(code); }} />
    <Button title="Look up barcode" busy={busy} onPress={() => { void lookup(code); }} disabled={!code.trim()} secondary />
    <Notice error message={error} />
    {unknown ? <Panel>
      <Copy title>Product not found</Copy><Copy>{unknown}</Copy>
      {access?.role === 'manager' ? <>
        <Button title="Add a new item" onPress={() => router.push({ pathname: '/items/edit', params: { barcode: unknown } })} />
        <Button secondary title="Link to an existing item" onPress={() => router.push({ pathname: '/items/link-barcode', params: { barcode: unknown } })} />
      </> : <Copy muted>Ask a manager to add this barcode to the catalog.</Copy>}
    </Panel> : null}
    {camera ? <BarcodeCamera onClose={() => setCamera(false)} onScan={value => { void lookup(value); }} /> : null}
  </Screen></AccessGate>;
}
