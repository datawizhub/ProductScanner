import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() 
{
  const { colors } = useTheme();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Home</Text>

      <TouchableOpacity style={[styles.scanButton, { backgroundColor: colors.primary }]}
          onPress={() => setScannerOpen(true)}>
        <Ionicons name="barcode-outline" size={40} color={colors.primaryText} />
        <Text style={[styles.scanButtonText, { color: colors.primaryText }]}>Scan Barcode</Text>
      </TouchableOpacity>

      {scannedCode && (
        <Text style={[styles.result, { color: colors.text }]}>Last scanned: {scannedCode}</Text>
      )}

      <ScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={(code) => {
          setScannedCode(code);
          setScannerOpen(false);
          // TODO: look up item details here
        }}
      />
    </SafeAreaView>
  );
}

/* ---------- Scanner Modal ---------- */

function ScannerModal
({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  const handleScan = ({ data }: BarcodeScanningResult) => 
  {
    if (locked) return;
    setLocked(true);
    onScanned(data);
    setTimeout(() => setLocked(false), 1000);
  };

  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {!permission ? 
        (
          <View style={styles.center}>
            <Text style={[styles.overlayText, { color: colors.text }]}>Loading…</Text>
          </View>
        ) : !permission.granted ? 
        (
          <View style={styles.center}>
            <Text style={[styles.overlayText, { color: colors.text }]}>
              Camera permission is required to scan barcodes
            </Text>
            <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
              <Text style={[styles.grantText, { color: colors.text }]}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'upc_a', 'qr'],
            }}
            onBarcodeScanned={locked ? undefined : handleScan}
          />
        )}

        {/* Close button */}
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
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

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 20 },
  title: { fontSize: 24, fontWeight: '700' },

  scanButton: 
  {
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  scanButtonText: { fontSize: 18, fontWeight: '700' },
  result: { fontSize: 14 },

  modalContainer: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  overlayText: { color: '#fff', textAlign: 'center', fontSize: 16 },

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