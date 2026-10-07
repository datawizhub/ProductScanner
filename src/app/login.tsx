import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() 
{
    const { colors, spacing } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [load, setLoad] = useState(false);

    // Sign In
    const handleSignIn = async () => 
        {
            if (!email.trim() || !password) 
            {
                Alert.alert('Missing info', 'Please enter both email and password.');
                return;
            }

            setLoad(true);
            try 
            {
            // TODO: replace with your real auth call
            // const res = await fetch('https://your-api.com/login', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ email, password }),
            // });
            // const data = await res.json();
            // if (!res.ok) throw new Error(data.message || 'Login failed');

            await new Promise((r) => setTimeout(r, 800)); // mock delay

            // TODO: store token, navigate to home
            // router.replace('/(tabs)');
            } 
            catch (err: any) 
            {
                Alert.alert('Sign in failed', err.message ?? 'Please try again.');
            } 
            finally 
            {
                setLoad(false);
            }
    };

    // Need Access
    const handleNeedAccess = () => 
    {
        // TODO: navigate to request access screen / open mail / open URL
        Alert.alert('Need access?', 'Contact your warehouse admin.');
    };

    const canSubmit = email.trim().length > 0 && password.length > 0 && !load;

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={[styles.content, { padding: spacing.four, gap: spacing.four }]}>

                {/* Header */}
                <View style={{ gap: spacing.one, marginBottom: spacing.two }}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Welcome back
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Sign in to continue
                    </Text>
                </View>

                {/* Email */}
                <View style={{ gap: spacing.one }}>
                    <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                    <TextInput
                        style=
                        {[
                            styles.input,
                            {
                                backgroundColor: colors.backgroundElement,
                                borderColor: colors.backgroundSelected,
                                color: colors.text,
                            },
                        ]}
                        placeholder="youremail@example.com"
                        placeholderTextColor={colors.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        textContentType="emailAddress"
                    />
                </View>

                {/* Password */}
                <View style={{ gap: spacing.one }}>
                    <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                    <View style={styles.passwordRow}>
                    <TextInput
                        style=
                        {[
                            styles.input,
                            styles.passwordInput,
                            {
                                backgroundColor: colors.backgroundElement,
                                borderColor: colors.backgroundSelected,
                                color: colors.text,
                            },
                        ]}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textSecondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        textContentType="password"
                    />
                    <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword((v) => !v)}>
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={22}
                                color={colors.textSecondary}
                            />
                    </TouchableOpacity>
                    </View>
                </View>

                {/* Sign in */}
                <TouchableOpacity
                    style=
                    {[styles.signInBtn, { backgroundColor: colors.primary },
                        !canSubmit && styles.signInBtnDisabled, ]}>
                    {load ? 
                    ( <ActivityIndicator color={colors.primaryText} /> ) : (
                        <Text style={[styles.signInText, { color: colors.primaryText }]}>
                            Sign In
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Need access */}
                <TouchableOpacity onPress={handleNeedAccess}>
                    <Text style={[styles.needAccessLink, { color: colors.primary, textDecorationLine: 'underline' }]}>
                        Need Access?
                    </Text>
                </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
    </SafeAreaView>
    );
}

const styles = StyleSheet.create
({
    container: { flex: 1 },
    flex: { flex: 1 },
    content: { flex: 1, justifyContent: 'center' },

    title: { fontSize: 28, fontWeight: '700' },
    subtitle: { fontSize: 15 },

    label: { fontSize: 13, fontWeight: '600' },

    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
             paddingVertical: 14, fontSize: 16 },

    passwordRow: { position: 'relative', justifyContent: 'center' },
    passwordInput: { paddingRight: 48 },
    eyeBtn: { position: 'absolute', right: 12, padding: 4 },

    signInBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center',
                 justifyContent: 'center', marginTop: 8 },
    signInBtnDisabled: { opacity: 0.5 },
    signInText: { fontSize: 16, fontWeight: '700' },

    needAccessLink: { textAlign: 'center', fontSize: 14, marginTop: 4, fontWeight: '600' },
});