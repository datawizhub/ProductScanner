import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AccessGate, Button, Copy, Notice, Panel, Screen } from '@/components/warehouse-ui';
import { useRemote } from '@/hooks/use-remote';
import { useStore } from '@/lib/store-access';
import { movementHistory } from '@/lib/warehouse';
export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { access } = useStore();
  const [page, setPage] = useState(0);
  const load = useCallback(() => access ? movementHistory(access.storeId, id, page * 50) : Promise.resolve([]), [access, id, page]);
  const { data, error, loading, reload } = useRemote('history:' + id + ':' + page, load);
  return <AccessGate><Screen title="Movement history" back>
    {loading ? <ActivityIndicator /> : null}
    <Notice error message={error} />
    <Button secondary title="Refresh history" onPress={reload} disabled={loading} />
    {!loading && data?.length === 0 ? <Copy>No movements yet. Receive stock to start the ledger.</Copy> : null}
    {data?.map(movement => <Panel key={movement.id}>
      <Copy title>{movement.type.charAt(0).toUpperCase() + movement.type.slice(1)} · {movement.type === 'pick' ? '-' :
        movement.type === 'receive' || (movement.type === 'adjust' && movement.quantity > 0) ? '+' : ''}{movement.quantity}</Copy>
      <Copy>{movement.from_code || 'Outside warehouse'} → {movement.to_code || 'Outside warehouse'}</Copy>
      <Copy muted>{movement.actor_email}</Copy>
      <Copy muted>{new Date(movement.created_at).toLocaleString('en-AU')}</Copy>
      {movement.note ? <Copy>{movement.note}</Copy> : null}
    </Panel>)}
    <Copy muted>Page {page + 1} · newest first</Copy>
    {page > 0 ? <Button secondary title="Previous page" disabled={loading} onPress={() => setPage(n => n - 1)} /> : null}
    {data?.length === 50 ? <Button secondary title="Older movements" disabled={loading} onPress={() => setPage(n => n + 1)} /> : null}
  </Screen></AccessGate>;
}
