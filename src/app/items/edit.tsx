import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BarcodeCamera } from '@/components/barcode-camera';
import { AccessGate, Button, Copy, Field, Notice, Panel, Screen } from '@/components/warehouse-ui';
import { useRemote } from '@/hooks/use-remote';
import { useStore } from '@/lib/store-access';
import { findItemById } from '@/lib/warehouse-lookup';
import { attachBarcode, errorMessage, listBarcodes, removeBarcode, saveCatalogItem, validBarcode, type CatalogFields } from '@/lib/warehouse';

export default function EditItemScreen() {
  const { id, barcode } = useLocalSearchParams<{ id?: string; barcode?: string }>();
  const load = useCallback(() => id ? findItemById(id) : Promise.resolve(null), [id]);
  const { data, error, loading, reload } = useRemote('edit:' + (id || 'new'), load);
  return <AccessGate manager><Screen title={id ? 'Edit item' : 'Add item'} back>
    {loading ? <ActivityIndicator /> : null}<Notice error message={error} />
    {error ? <Button title="Retry" onPress={reload} /> : null}
    {!loading && !error && (!id || data) ? <CatalogForm key={id || 'new'} itemId={id} barcode={barcode}
      initial={data ? { name: data.item.name, sku: data.item.sku, price: Number(data.item.price),
        unit: data.item.unit, description: data.item.description || '' } : undefined} /> : null}
    {!loading && !error && id && !data ? <Copy>Item not found.</Copy> : null}
    {id && data ? <BarcodeManager itemId={id} /> : null}
  </Screen></AccessGate>;
}
function CatalogForm({ itemId, initial, barcode: scanned }: { itemId?: string; initial?: CatalogFields; barcode?: string }) {
  const { access } = useStore();
  const [name, setName] = useState(initial?.name || '');
  const [sku, setSku] = useState(initial?.sku || '');
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [unit, setUnit] = useState(initial?.unit || 'each');
  const [description, setDescription] = useState(initial?.description || '');
  const [barcode, setBarcode] = useState(scanned || '');
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  async function save() {
    if (locked.current || !access) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      if (![name, sku, unit].every(value => value.trim())) throw new Error('Enter a name, SKU and unit.');
      if (!/^\d+(\.\d{1,2})?$/.test(price.trim()) || Number(price) > 9999999999.99) throw new Error('Enter a valid price with at most two decimal places.');
      const id = await saveCatalogItem(access.storeId, { name: name.trim(), sku: sku.trim(), price: Number(price),
        unit: unit.trim(), description: description.trim() }, itemId, !itemId && barcode.trim() ? validBarcode(barcode) : undefined);
      router.replace({ pathname: '/items/[id]', params: { id } });
    } catch (cause) { setError(errorMessage(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <View style={{ gap: 16 }}>
    <Field label="Name" value={name} onChangeText={setName} editable={!busy} maxLength={200} />
    <Field label="SKU" value={sku} onChangeText={setSku} editable={!busy} autoCapitalize="none" maxLength={100} />
    <Field label="Price (AUD)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" editable={!busy} />
    <Field label="Unit" value={unit} onChangeText={setUnit} editable={!busy} maxLength={50} />
    <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline editable={!busy} maxLength={1000} />
    {!itemId ? <>
      <Field label="Product barcode (optional)" value={barcode} onChangeText={setBarcode} autoCapitalize="none" editable={!busy} maxLength={500} />
      <Button secondary title="Scan product barcode" onPress={() => setCamera(true)} disabled={busy} />
    </> : null}
    <Notice error message={error} /><Button title="Save item" busy={busy} onPress={() => { void save(); }} />
    {camera ? <BarcodeCamera onClose={() => setCamera(false)} onScan={code => { setCamera(false); setBarcode(code); }} /> : null}
  </View>;
}
function BarcodeManager({ itemId }: { itemId: string }) {
  const { access } = useStore();
  const storeId = access!.storeId;
  const load = useCallback(() => listBarcodes(storeId, itemId), [storeId, itemId]);
  const remote = useRemote('barcodes:' + itemId, load);
  const [barcode, setBarcode] = useState('');
  const [camera, setCamera] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  async function mutate(remove?: string) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      if (remove) await removeBarcode(storeId, itemId, remove);
      else await attachBarcode(storeId, itemId, validBarcode(barcode));
      setBarcode(''); setConfirmRemove(null); remote.reload();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <Panel><Copy title>Item barcodes</Copy>
    <Notice error message={remote.error || error} />
    {remote.loading ? <ActivityIndicator /> : null}
    {remote.data?.map(code => <View key={code} style={{ gap: 6 }}>
      <Copy>{code}</Copy><Button secondary title={'Remove ' + code} disabled={busy} onPress={() => setConfirmRemove(code)} />
    </View>)}
    {confirmRemove ? <View style={{ gap: 12 }}><Copy>Remove barcode {confirmRemove} from this item?</Copy>
      <Button danger title="Confirm removal" busy={busy} onPress={() => { void mutate(confirmRemove); }} />
      <Button secondary title="Cancel removal" disabled={busy} onPress={() => setConfirmRemove(null)} /></View> : null}
    <Field label="Add another barcode" value={barcode} onChangeText={setBarcode} autoCapitalize="none" maxLength={500} editable={!busy} />
    <Button secondary title="Scan barcode" disabled={busy} onPress={() => setCamera(true)} />
    <Button title="Link barcode" busy={busy} disabled={!barcode.trim()} onPress={() => { void mutate(); }} />
    {camera ? <BarcodeCamera onClose={() => setCamera(false)} onScan={code => { setCamera(false); setBarcode(code); }} /> : null}
  </Panel>;
}
