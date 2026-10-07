import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageScreen } from '@/components/message-screen';
import { useTheme } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { getPrototypeStoreId, lookupBarcode, type BarcodeLookup } from '@/lib/warehouse-lookup';

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'found'; result: BarcodeLookup }
  | { status: 'error'; message: string };

type StoreState =
  | { userId: string; status: 'ready'; storeId: string }
  | { userId: string; status: 'no-access' }
  | { userId: string; status: 'error'; message: string };

function useStyles() {
  const { colors, spacing } = useTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background, padding: spacing.four },
        content: { gap: spacing.three, paddingBottom: spacing.five },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        title: { fontSize: 24, fontWeight: '700', color: colors.text },
        account: { color: colors.textSecondary, marginTop: -spacing.three },
        link: { color: colors.primary, fontWeight: '600' },
        scanButton: {
          backgroundColor: colors.primary,
          borderRadius: 20,
          paddingVertical: spacing.five,
          alignItems: 'center',
          gap: spacing.two,
        },
        scanButtonText: { color: colors.primaryText, fontSize: 18, fontWeight: '700' },
        lastScanned: { fontSize: 14, color: colors.textSecondary },
        notice: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
        error: { fontSize: 15, color: colors.danger },
        card: {
          backgroundColor: colors.backgroundElement,
          borderRadius: 14,
          padding: spacing.three + 2,
          gap: spacing.two,
        },
        itemName: { fontSize: 22, fontWeight: '700', color: colors.text },
        detail: { color: colors.textSecondary, fontSize: 14 },
        stockTitle: { fontSize: 17, fontWeight: '700', marginTop: 10, color: colors.text },
        stockRow: {
          borderTopWidth: 1,
          borderTopColor: colors.backgroundSelected,
          paddingTop: 10,
          gap: spacing.one,
        },
        location: { fontSize: 16, fontWeight: '600', color: colors.text },
        quantity: { fontSize: 16, fontWeight: '700', color: colors.text },
        grantBtn: {
          backgroundColor: colors.primary,
          paddingHorizontal: spacing.four - 4,
          paddingVertical: 12,
          borderRadius: 10,
        },
        grantText: { color: colors.primaryText, fontWeight: '600' },
      }),
    [colors, spacing],
  );
}

export default function HomeScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [store, setStore] = useState<StoreState | null>(null);
  const [storeRetry, setStoreRetry] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedType, setScannedType] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>({ status: 'idle' });
  const lookupRequest = useRef(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getPrototypeStoreId()
      .then((storeId) => {
        if (!active) return;
        setStore(
          storeId ? { userId, status: 'ready', storeId } : { userId, status: 'no-access' },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStore({
          userId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not load store access.',
        });
      });
    return () => {
      active = false;
    };
  }, [userId, storeRetry]);

  async function handleScan(code: string, type: string, storeId: string) {
    const request = ++lookupRequest.current;
    setScannedCode(code);
    setScannedType(type);
    setScannerOpen(false);
    setLookupState({ status: 'loading' });

    try {
      const result = await lookupBarcode(storeId, code);
      if (lookupRequest.current !== request) return;
      setLookupState(result ? { status: 'found', result } : { status: 'not-found' });
    } catch (error) {
      if (lookupRequest.current !== request) return;
      setLookupState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not look up barcode.',
      });
    }
  }

  // The Stack.Protected guard in app/_layout.tsx sends the user to /login
  // once the session clears, so we only need to reset local state here.
  async function signOut() {
    lookupRequest.current += 1;
    setScannerOpen(false);
    setScannedCode(null);
    setScannedType(null);
    setLookupState({ status: 'idle' });
    setStore(null);
    setStoreRetry(0);
    await getSupabase().auth.signOut();
  }

  if (!session) return null;
  if (!store || store.userId !== userId) {
    return <MessageScreen message="Checking store access…" loading />;
  }
  if (store.status === 'error') {
    return (
      <MessageScreen
        message={store.message}
        onRetry={() => {
          setStore(null);
          setStoreRetry((count) => count + 1);
        }}
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }
  if (store.status === 'no-access') {
    return (
      <MessageScreen
        message="This account does not have access to Prototype Store. Ask your manager."
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  const storeId = store.storeId;
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Stock lookup</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void signOut();
            }}>
            <Text style={styles.link}>Sign out</Text>
          </Pressable>
        </View>
        <Text style={styles.account}>{session.user.email}</Text>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.scanButton}
          onPress={() => setScannerOpen(true)}>
          <Ionicons name="barcode-outline" size={40} color={colors.primaryText} />
          <Text style={styles.scanButtonText}>Scan Barcode</Text>
        </TouchableOpacity>

        {scannedCode && (
          <Text style={styles.lastScanned}>
            Last scanned: {scannedCode} ({scannedType})
          </Text>
        )}
        {lookupState.status === 'loading' && (
          <ActivityIndicator color={colors.primary} accessibilityLabel="Looking up item" />
        )}
        {lookupState.status === 'not-found' && (
          <Text style={styles.notice}>No item has this barcode in Prototype Store.</Text>
        )}
        {lookupState.status === 'error' && (
          <Text style={styles.error}>Lookup failed: {lookupState.message}</Text>
        )}
        {lookupState.status === 'found' && <ItemResult result={lookupState.result} />}
      </ScrollView>

      <ScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={(code, type) => {
          void handleScan(code, type, storeId);
        }}
      />
    </SafeAreaView>
  );
}

function ItemResult({ result }: { result: BarcodeLookup }) {
  const styles = useStyles();
  const { item, stock, totalQuantity } = result;

  return (
    <View style={styles.card}>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.detail}>SKU: {item.sku}</Text>
      <Text style={styles.detail}>
        Price: ${item.price.toFixed(2)} per {item.unit}
      </Text>
      {item.description && <Text style={styles.detail}>{item.description}</Text>}
      <Text style={styles.stockTitle}>In stock: {totalQuantity}</Text>
      {stock.length === 0 ? (
        <Text style={styles.detail}>No stock recorded yet.</Text>
      ) : (
        stock.map(({ location, quantity }) => (
          <View key={location.id} style={styles.stockRow}>
            <Text style={styles.location}>{location.code}</Text>
            <Text style={styles.detail}>
              Aisle {location.aisle} · Rack {location.rack} · Bin {location.bin}
            </Text>
            <Text style={styles.quantity}>{quantity}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function ScannerModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string, type: string) => void;
}) {
  const styles = useStyles();
  const [permission, requestPermission] = useCameraPermissions();
  const locked = useRef(false);

  useEffect(() => {
    if (visible) locked.current = false;
  }, [visible]);

  const handleScan = ({ data, type }: BarcodeScanningResult) => {
    if (locked.current) return;
    locked.current = true;
    onScanned(data, type);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      {/* The camera view is always black/white regardless of theme. */}
      <View style={scanner.container}>
        {!permission ? (
          <View style={scanner.center}>
            <Text style={scanner.text}>Loading…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={scanner.center}>
            <Text style={scanner.text}>Camera permission is required to scan barcodes</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.grantBtn}
              onPress={requestPermission}>
              <Text style={styles.grantText}>Grant permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            // QR is left out on purpose: it is reserved for bin/location labels.
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'upc_a'] }}
            onBarcodeScanned={handleScan}
          />
        )}

        <SafeAreaView style={scanner.overlay}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            style={scanner.closeBtn}
            onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={scanner.frame} />
          <Text style={scanner.hint}>Align the barcode inside the frame</Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const scanner = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  text: { color: '#fff', textAlign: 'center', fontSize: 16 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginRight: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 260,
    height: 160,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 16,
  },
  hint: { color: '#fff', fontSize: 14, opacity: 0.9 },
});
