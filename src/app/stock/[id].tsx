import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { AccessGate, Button, Copy, Field, Notice, Panel, Screen } from '@/components/warehouse-ui';
import { LocationPicker } from '@/components/location-picker';
import { useRemote } from '@/hooks/use-remote';
import { useStore } from '@/lib/store-access';
import { useAuth } from '@/lib/auth';
import { appStorage } from '@/lib/session-storage';
import { findItemById } from '@/lib/warehouse-lookup';
import { cancelStockReceipt, errorMessage, listLocations, mayDiscardReceipt, StockRpcError, stockMovement, stockQuantity, type StockAction } from '@/lib/warehouse';

type Receipt = { requestId: string; quantity: number; locationId: string; toLocationId: string; note: string };
function readReceipt(key: string): Receipt | null {
  try {
    const data = JSON.parse(appStorage.getItem(key) || 'null') as Receipt | null;
    return data && typeof data.requestId === 'string' && Number.isSafeInteger(data.quantity)
      && typeof data.locationId === 'string' && typeof data.toLocationId === 'string' && typeof data.note === 'string' ? data : null;
  } catch { return null; }
}
const titles: Record<StockAction, string> = { receive: 'Receive stock', move: 'Move stock', pick: 'Pick stock', adjust: 'Adjust count' };
export default function StockScreen() {
  const params = useLocalSearchParams<{ id: string; action: string }>();
  const action = params.action as StockAction;
  if (!Object.hasOwn(titles, action)) return <Screen title="Stock action" back><Copy>Choose an action from the item screen.</Copy></Screen>;
  return <AccessGate manager={action === 'adjust'}><StockForm key={params.id + action} itemId={params.id} action={action} /></AccessGate>;
}
function StockForm({ itemId, action }: { itemId: string; action: StockAction }) {
  const { access } = useStore();
  const { session } = useAuth();
  const storeId = access!.storeId;
  const storageKey = 'warehouse-receipt:' + session!.user.id + ':' + storeId + ':' + itemId + ':' + action;
  const [pending, setPending] = useState<Receipt | null>(() => readReceipt(storageKey));
  const [quantity, setQuantity] = useState(() => pending ? String(pending.quantity) : '');
  const [locationId, setLocationId] = useState(() => pending?.locationId ?? '');
  const [toLocationId, setToLocationId] = useState(() => pending?.toLocationId ?? '');
  const [note, setNote] = useState(() => pending?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const locked = useRef(false);
  const load = useCallback(async () => {
    const [item, locations] = await Promise.all([findItemById(itemId), listLocations(storeId)]);
    return { item, locations };
  }, [itemId, storeId]);
  const remote = useRemote('stock-form:' + itemId, load);
  const disabled = busy || !!pending || saved;
  async function submit() {
    if (locked.current || saved) return;
    locked.current = true;
    setError(null); setNotice(null); setBusy(true);
    let attempted = false;
    const wasPending = !!pending;
    try {
      if (!remote.data?.item) throw new Error('Item not found.');
      const count = stockQuantity(quantity, action === 'adjust');
      if (!locationId) throw new Error('Select a bin.');
      if (action === 'move' && (!toLocationId || toLocationId === locationId)) throw new Error('Select a different destination bin.');
      if (action === 'adjust' && !note.trim()) throw new Error('Enter the reason for the adjustment.');
      const receipt = pending ?? { requestId: randomUUID(), quantity: count, locationId, toLocationId, note: note.trim() };
      appStorage.setItem(storageKey, JSON.stringify(receipt));
      setPending(receipt);
      attempted = true;
      await stockMovement(storeId, itemId, action, receipt.quantity, receipt.locationId,
        receipt.requestId, receipt.toLocationId || undefined, receipt.note);
      appStorage.removeItem(storageKey);
      setPending(null); setSaved(true);
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      if (mayDiscardReceipt(wasPending, attempted, cause instanceof StockRpcError && cause.definitive)) {
        appStorage.removeItem(storageKey);
        setPending(null);
      }
    } finally { locked.current = false; setBusy(false); }
  }
  async function resolvePending() {
    if (!pending || locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try {
      const outcome = await cancelStockReceipt(storeId, itemId, action, pending.quantity,
        pending.locationId, pending.requestId, pending.toLocationId || undefined, pending.note);
      appStorage.removeItem(storageKey);
      setPending(null);
      if (outcome === 'applied') setSaved(true);
      else { setNotice('The pending action was cancelled. It has not changed stock.'); remote.reload(); }
    } catch (cause) { setError(errorMessage(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <Screen title={titles[action]} back>
    {remote.loading ? <ActivityIndicator /> : null}
    <Notice error message={remote.error || error} /><Notice message={notice} />
    {remote.error ? <Button title="Retry loading" onPress={remote.reload} /> : null}
    {saved ? <>
      <Panel><Copy title>Stock updated</Copy><Copy>The change is recorded in movement history.</Copy></Panel>
      <Button title="View updated item" onPress={() => router.replace({ pathname: '/items/[id]', params: { id: itemId } })} />
    </> : remote.data?.item ? <>
      <Panel><Copy title>{remote.data.item.item.name}</Copy><Copy>Current total: {remote.data.item.totalQuantity}</Copy></Panel>
      {pending ? <Notice message="A previous stock action is awaiting confirmation. Retry it safely, or cancel it. If it already succeeded, cancellation will confirm that result instead." /> : null}
      <LocationPicker label={action === 'move' ? 'From bin' : 'Bin'} storeId={storeId}
        locations={remote.data.locations} value={locationId} onChange={setLocationId} disabled={disabled} />
      {locationId ? <Copy muted>Current quantity in this bin: {remote.data.item.stock.find(row => row.location.id === locationId)?.quantity ?? 0}</Copy> : null}
      {action === 'move' ? <LocationPicker label="To bin" storeId={storeId} locations={remote.data.locations}
        value={toLocationId} onChange={setToLocationId} disabled={disabled} /> : null}
      <Field label={action === 'adjust' ? 'New absolute count' : 'Quantity'} value={quantity} onChangeText={setQuantity}
        keyboardType="number-pad" editable={!disabled} />
      <Field label={action === 'adjust' ? 'Reason (required)' : 'Note (optional)'} value={note} onChangeText={setNote}
        multiline maxLength={1000} editable={!disabled} />
      <Button title={pending ? 'Confirm pending action' : titles[action]} busy={busy}
        disabled={remote.loading || !locationId || !quantity.trim()}
        onPress={() => { void submit(); }} />
      {pending ? <Button secondary title="Cancel pending action" busy={busy}
        onPress={() => { void resolvePending(); }} /> : null}
    </> : !remote.loading ? <Copy>Item not found.</Copy> : null}
  </Screen>;
}
