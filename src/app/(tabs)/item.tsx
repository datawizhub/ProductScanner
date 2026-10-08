import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/constants/theme';
import { fetchAllItem, type Item } from '@/lib/warehouse-lookup';
import { router } from 'expo-router';

const FLEX = {
  id: 1,
  name: 3,
  sku: 2,
};

const H_PADDING = 16;

export default function ItemsScreen() {
  const { colors } = useTheme();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    try {
      setError(null);
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      const data = await fetchAllItem();
      setItems(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: 'red' }}>{error}</Text>
        <TouchableOpacity onPress={() => load()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const borderColor = colors.backgroundSelected;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: H_PADDING }}>
        {/* Header */}
        <View
          style={[
            styles.headerRow,
            { backgroundColor: colors.backgroundElement, borderColor },
          ]}>
          <View style={{ flex: FLEX.id }}>
            <Text style={[styles.headerCell, { color: colors.text }]}>ID</Text>
          </View>
          <View style={{ flex: FLEX.name }}>
            <Text style={[styles.headerCell, { color: colors.text }]}>Name</Text>
          </View>
          <View style={{ flex: FLEX.sku }}>
            <Text style={[styles.headerCell, { color: colors.text }]}>SKU</Text>
          </View>
        </View>

        {/* Rows */}
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
              tintColor={colors.textSecondary}
            />
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/items/[id]', params: { id: item.id } })}
              style={[
                styles.row,
                {
                  backgroundColor:
                    index % 2 === 0 ? colors.background : colors.backgroundElement,
                  borderColor,
                },
              ]}>
              <View style={{ flex: FLEX.id }}>
                <Text
                  style={[styles.cell, { color: colors.textSecondary }]}
                  numberOfLines={1}>
                  {item.id}
                </Text>
              </View>
              <View style={{ flex: FLEX.name }}>
                <Text
                  style={[styles.cell, { color: colors.text, fontWeight: '600' }]}
                  numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <View style={{ flex: FLEX.sku }}>
                <Text
                  style={[styles.cell, { color: colors.text }]}
                  numberOfLines={1}>
                  {item.sku}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.textSecondary }}>No items yet</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 12,
    textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cell: {
    fontSize: 14,
    paddingHorizontal: 12,
  },
});