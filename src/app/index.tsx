import { Ionicons } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
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

export default function HomeScreen() {
  const [auth, setAuth] = useState<{ ready: boolean; session: Session | null }>({
    ready: !isSupabaseConfigured,
    session: null,
  });
  const [store, setStore] = useState<StoreState | null>(null);
  const [storeRetry, setStoreRetry] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scannedType, setScannedType] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>({ status: 'idle' });
  const lookupRequest = useRef(0);
  const userId = auth.session?.user.id;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
        setAuth({ ready: true, session });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getPrototypeStoreId()
      .then((storeId) => {
        if (!active) return;
        setStore(storeId
          ? { userId, status: 'ready', storeId }
          : { userId, status: 'no-access' });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStore({
          userId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not load store access.',
        });
      });
    return () => { active = false; };
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

  async function signOut() {
    lookupRequest.current += 1;
    setScannerOpen(false);
    setScannedCode(null);
    setLookupState({ status: 'idle' });
    setStore(null);
    await getSupabase().auth.signOut();
  }

  if (!isSupabaseConfigured) {
    return <MessageScreen message="Add the Supabase URL and publishable key to .env.local, then restart Expo." />;
  }
  if (!auth.ready) return <MessageScreen message="Loading account…" loading />;
  if (!auth.session) return <Redirect href="/login" />;
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
        onSignOut={() => { void signOut(); }}
      />
    );
  }
  if (store.status === 'no-access') {
    return (
      <MessageScreen
        message="This account does not have access to Prototype Store. Ask your manager."
        onSignOut={() => { void signOut(); }}
      />
    );
  }

  const storeId = store.storeId;
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Stock lookup</Text>
          <Pressable accessibilityRole="button" onPress={() => { void signOut(); }}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
        <Text style={styles.account}>{auth.session.user.email}</Text>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.scanButton}
          onPress={() => setScannerOpen(true)}>
          <Ionicons name="barcode-outline" size={40} color="#fff" />
          <Text style={styles.scanButtonText}>Scan Barcode</Text>
        </TouchableOpacity>

        {scannedCode && (
          <Text style={styles.result}>Last scanned: {scannedCode} ({scannedType})</Text>
        )}
        {lookupState.status === 'loading' && <ActivityIndicator accessibilityLabel="Looking up item" />}
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
        onScanned={(code, type) => { void handleScan(code, type, storeId); }}
      />
    </SafeAreaView>
  );
}

function ItemResult({ result }: { result: BarcodeLookup }) {
  const { item, stock, totalQuantity } = result;
  return (
    <View style={styles.card}>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.detail}>SKU: {item.sku}</Text>
      <Text style={styles.detail}>Price: ${item.price.toFixed(2)} per {item.unit}</Text>
      {item.description && <Text style={styles.detail}>{item.description}</Text>}
      <Text style={styles.stockTitle}>In stock: {totalQuantity}</Text>
      {stock.length === 0 ? (
        <Text style={styles.detail}>No stock recorded yet.</Text>
      ) : stock.map(({ location, quantity }) => (
        <View key={location.id} style={styles.stockRow}>
          <Text style={styles.location}>{location.code}</Text>
          <Text style={styles.detail}>Aisle {location.aisle} · Rack {location.rack} · Bin {location.bin}</Text>
          <Text style={styles.quantity}>{quantity}</Text>
        </View>
      ))}
    </View>
  );
}

function MessageScreen({
  message,
  loading = false,
  onRetry,
  onSignOut,
}: {
  message: string;
  loading?: boolean;
  onRetry?: () => void;
  onSignOut?: () => void;
}) {
  return (
    <SafeAreaView style={[styles.container, styles.center]}>
      {loading && <ActivityIndicator />}
      <Text style={styles.notice}>{message}</Text>
      {onRetry && <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.signOut}>Retry</Text></Pressable>}
      {onSignOut && <Pressable accessibilityRole="button" onPress={onSignOut}><Text style={styles.signOut}>Sign out</Text></Pressable>}
    </SafeAreaView>
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
      <View style={styles.modalContainer}>
        {!permission ? (
          <View style={styles.center}>
            <Text style={styles.white}>Loading…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.white}>Camera permission is required to scan barcodes</Text>
            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
              <Text style={styles.grantText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr'],
            }}
            onBarcodeScanned={handleScan}
          />
        )}

        <SafeAreaView style={styles.overlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.frame} />
          <Text style={styles.hint}>Align the barcode inside the frame</Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6f8', padding: 20 },
  content: { gap: 18, paddingBottom: 32 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700' },
  account: { color: '#4b5563', marginTop: -14 },
  signOut: { color: '#1e6ef2', fontWeight: '600' },
  scanButton: {
    backgroundColor: '#1e6ef2',
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  result: { fontSize: 14, color: '#333' },
  notice: { fontSize: 15, color: '#4b5563', textAlign: 'center' },
  error: { fontSize: 15, color: '#b91c1c' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 8 },
  itemName: { fontSize: 22, fontWeight: '700', color: '#111827' },
  detail: { color: '#4b5563', fontSize: 14 },
  stockTitle: { fontSize: 17, fontWeight: '700', marginTop: 10 },
  stockRow: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10, gap: 4 },
  location: { fontSize: 16, fontWeight: '600' },
  quantity: { fontSize: 16, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#000' },
  white: { color: '#fff', textAlign: 'center', fontSize: 16 },
  grantBtn: {
    backgroundColor: '#1e6ef2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  grantText: { color: '#fff', fontWeight: '600' },
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
