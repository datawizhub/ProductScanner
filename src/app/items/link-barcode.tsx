import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { CatalogBrowser } from '@/components/catalog-browser';
import { AccessGate, Button, Copy, Notice, Panel } from '@/components/warehouse-ui';
import { useStore } from '@/lib/store-access';
import { attachBarcode, errorMessage, validBarcode, type CatalogItem } from '@/lib/warehouse';
export default function LinkBarcodeScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { access } = useStore();
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  async function link() {
    if (!access || !selected || locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      await attachBarcode(access.storeId, selected.id, validBarcode(barcode));
      router.replace({ pathname: '/items/[id]', params: { id: selected.id } });
    } catch (cause) { setError(errorMessage(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <AccessGate manager><CatalogBrowser title="Link barcode" onChoose={item => { if (!busy) setSelected(item); }}
    header={<>
      <Button title="Back" secondary disabled={busy} onPress={() => router.back()} /><Copy>Barcode: {barcode}</Copy>
      <Notice error message={error} />
      {selected ? <Panel><Copy title>{selected.name}</Copy><Copy>{selected.sku}</Copy>
        <Button title="Confirm link to this item" busy={busy} onPress={() => { void link(); }} /></Panel> :
        <Copy muted>Find the existing item that this barcode belongs to.</Copy>}
    </>} /></AccessGate>;
}
