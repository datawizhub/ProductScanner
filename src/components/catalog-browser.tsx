import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/constants/theme';
import { useRemote } from '@/hooks/use-remote';
import { useStore } from '@/lib/store-access';
import { listCatalog, type CatalogItem } from '@/lib/warehouse';
import { Button, Copy, Field, Notice } from './warehouse-ui';

export function CatalogBrowser({ title, onChoose, header }: { title: string; onChoose: (item: CatalogItem) => void; header?: ReactNode }) {
  const { access } = useStore();
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const load = useCallback(() => access ? listCatalog(access.storeId, search, page * 50) : Promise.resolve([]),
    [access, search, page]);
  const { data, error, loading, reload } = useRemote('catalog:' + search + ':' + page, load);
  function applySearch() { setPage(0); setSearch(draft.trim()); }
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <FlatList data={data ?? []} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled"
      refreshing={loading} onRefresh={reload} contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 12 }}
      ListHeaderComponent={<View style={{ gap: 16, marginBottom: 8 }}>
        <Copy title>{title}</Copy>{header}
        <Field label="Search catalog" value={draft} onChangeText={setDraft} placeholder="Name, SKU or exact barcode"
          onSubmitEditing={applySearch} returnKeyType="search" />
        <Button title="Search" secondary onPress={applySearch} />
        <Notice error message={error} />
        {error ? <Button title="Retry" onPress={reload} /> : null}
      </View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={'Open ' + item.name}
        onPress={() => onChoose(item)} style={({ pressed }) => ({
          padding: 18, minHeight: 72, borderRadius: 12, backgroundColor: colors.backgroundElement, opacity: pressed ? 0.7 : 1,
        })}>
        <Copy title>{item.name}</Copy><Copy muted>{item.sku} · {'A$'}{Number(item.price).toFixed(2)} per {item.unit}</Copy>
      </Pressable>}
      ListEmptyComponent={loading ? <ActivityIndicator /> : <Copy muted>No matching items. Try a name, SKU or barcode.</Copy>}
      ListFooterComponent={<View style={{ gap: 12, paddingTop: 12 }}>
        <Copy muted>Page {page + 1}</Copy>
        {page > 0 ? <Button title="Previous page" secondary disabled={loading} onPress={() => setPage(n => n - 1)} /> : null}
        {data?.length === 50 ? <Button title="Next page" secondary disabled={loading} onPress={() => setPage(n => n + 1)} /> : null}
      </View>}
    />
  </SafeAreaView>;
}
