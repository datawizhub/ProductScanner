import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text,
         TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/constants/theme';
import { findItemById, type ItemDetailByID } from '@/lib/warehouse-lookup';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const [data, setData] = useState<ItemDetailByID | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const result = await findItemById(id);
        setData(result);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load item');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: 'red' }}>{error ?? 'Item not found'}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { item, stock, totalQuantity } = data;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.four, gap: spacing.three }}>

      {/* Item card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.backgroundSelected,
          },
        ]}>
        <Text style={[styles.itemName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>
          SKU: {item.sku}
        </Text>
        <Text style={[styles.detail, { color: colors.textSecondary }]}>
          Price: ${Number(item.price).toFixed(2)} per {item.unit}
        </Text>
        {item.description ? (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        ) : null}
      </View>

      {/* Stock card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.backgroundSelected,
          },
        ]}>
        <Text style={[styles.stockTitle, { color: colors.text }]}>
          In stock: {totalQuantity}
        </Text>

        {stock.length === 0 ? (
          <Text style={[styles.detail, { color: colors.textSecondary }]}>
            No stock recorded yet.
          </Text>
        ) : (
          stock.map(({ location, quantity }) => (
            <View
              key={location.id}
              style={[
                styles.stockRow,
                { borderTopColor: colors.backgroundSelected },
              ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.location, { color: colors.text }]}>
                  {location.code}
                </Text>
                <Text style={[styles.detail, { color: colors.textSecondary }]}>
                  Aisle {location.aisle} · Rack {location.rack} · Bin {location.bin}
                </Text>
              </View>
              <Text style={[styles.quantity, { color: colors.primary }]}>
                {quantity}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },

  itemName: { fontSize: 22, fontWeight: '700' },
  detail: { fontSize: 14 },

  stockTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  location: { fontSize: 15, fontWeight: '600' },
  quantity: { fontSize: 18, fontWeight: '700' },
});