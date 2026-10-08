import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Copy, Notice } from './warehouse-ui';
import { useTheme } from '@/constants/theme';

export function BarcodeCamera({ onScan, onClose, binsOnly = false }: {
  onScan: (code: string, type: string) => void; onClose: () => void; binsOnly?: boolean;
}) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  function scan({ data, type }: BarcodeScanningResult) {
    if (locked.current) return;
    locked.current = true;
    onScan(data, type);
  }
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}><Button title="Close scanner" secondary onPress={onClose} /></View>
      <View style={styles.preview}>
        {permission?.granted && active && !error ? <CameraView style={StyleSheet.absoluteFill}
          facing="back" enableTorch={torch} barcodeScannerSettings={{
            barcodeTypes: binsOnly ? ['qr'] : ['ean13', 'ean8', 'upc_a', 'code128', 'qr'],
          }} onBarcodeScanned={scan} onMountError={() => setError('Camera could not start. Close the scanner and try again.')} /> :
          <View style={[styles.permission, { backgroundColor: colors.background }]}>
            <Copy>{error || (!permission ? 'Checking camera permission…' : 'Camera access is needed to scan labels.')}</Copy>
            {permission && !permission.granted ? <Button title={permission.canAskAgain ? 'Allow camera' : 'Open settings'}
              onPress={() => {
                if (permission.canAskAgain) void requestPermission().catch(() => setError('Camera permission could not be requested. Open device settings or use manual barcode lookup.'));
                else void Linking.openSettings().catch(() => setError('Open this app in device settings to enable camera access.'));
              }} /> : null}
          </View>}
        {permission?.granted && active && !error ? <View pointerEvents="none" style={styles.frame} /> : null}
      </View>
      <View style={styles.footer}>
        <Copy>{binsOnly ? 'Scan the QR label on a warehouse bin.' : 'Align the product barcode inside the frame.'}</Copy>
        <Notice message="The scanner closes after one label is read." />
        <Button title={torch ? 'Turn torch off' : 'Turn torch on'} secondary disabled={!permission?.granted || !!error}
          onPress={() => setTorch(value => !value)} />
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 },
  preview: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  permission: { padding: 24, gap: 16 },
  frame: { width: '78%', maxWidth: 360, height: 180, borderColor: '#ffffff', borderWidth: 3, borderRadius: 12 },
  footer: { padding: 24, gap: 12 },
});
