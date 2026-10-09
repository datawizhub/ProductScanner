import { useTheme } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/warehouse';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
    ActivityIndicator, ImageBackground, KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() 
{
    const { colors, spacing } = useTheme();
    const { finishPasswordSetup } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [load, setLoad] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const locked = useRef(false);

    const handleSignIn = async () => {
        if (locked.current) return;
        if (!email.trim() || !password) {
            setError('Please enter both email and password.');
            return;
        }

        locked.current = true;
        setLoad(true); setError(null);
        try {
            const { data, error } = await getSupabase().auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            if (error) throw error;
            if (!data.session) throw new Error('Could not start a session. Please try again.');
            finishPasswordSetup();
        } catch (error) {
            setError(errorMessage(error));
        } finally {
            setLoad(false);
            locked.current = false;
        }
    };

    // Need Access
    const handleNeedAccess = () => 
    {
        setError('Contact your warehouse administrator to create your app account and assign store access.');
    };

    const canSubmit = email.trim().length > 0 && password.length > 0 && !load;

    return (
        <View style={[styles.container, { backgroundColor: colors.backgroundElement }]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>

                {/* header */}
                <ImageBackground source={require('../../assets/images/login.png')} resizeMode="cover" style={styles.header}>
                    <SafeAreaView edges={['top']} style={styles.headerInner}>
                        <Text style={styles.headerTitle}>Welcome back</Text>
                    </SafeAreaView>
                </ImageBackground>

                {/* Card */}
                <View style={[styles.card, { backgroundColor: colors.background, padding: spacing.four, gap: spacing.four }]}>
                <View pointerEvents="none" style={styles.cardCircle} />

                {/* Email */}
                <View style={{ gap: spacing.one }}>
                    <Text style={[styles.label, { color: colors.accent }]}>Email</Text>
                    <TextInput
                        accessibilityLabel="Email"
                        style=
                        {[
                            styles.input,
                            {
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
                    <Text style={[styles.label, { color: colors.accent }]}>Password</Text>
                    <View style={styles.passwordRow}>
                    <TextInput
                        accessibilityLabel="Password"
                        style=
                        {[
                            styles.input,
                            styles.passwordInput,
                            {
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
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
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

                <TouchableOpacity accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-end' }}
                    onPress={() => router.push('/account-setup')}>
                    <Text style={[styles.forgotLink, { color: colors.text }]}>Forgot password or finish invitation?</Text>
                </TouchableOpacity>

                {error ? <Text accessibilityLiveRegion="assertive" style={{ color: colors.danger }}>{error}</Text> : null}
                {/* Sign in */}
                <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => { void handleSignIn(); }}
                    disabled={!canSubmit}
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

                <View style={styles.spacer} />

                {/* Need access */}
                <View style={styles.footer}>
                    <TouchableOpacity accessibilityRole="button" style={{ minHeight: 100, justifyContent: 'center' }} onPress={handleNeedAccess}>
                        <Text style={[styles.needAccessLink, { color: colors.text }]}>
                            Need Access?
                        </Text>
                    </TouchableOpacity>
                </View>
                </View>
                </ScrollView>
            </KeyboardAvoidingView>
    </View>
    );
}

const styles = StyleSheet.create
({
    container: { flex: 1 },
    flex: { flex: 1 },
    scroll: { flexGrow: 1 },

    header: { minHeight: 260, overflow: 'hidden' },
    headerInner: { flex: 1, paddingHorizontal: 32, paddingTop: 40, paddingBottom: 72, justifyContent: 'center' },
    headerTitle: { color: '#ffffff', fontSize: 40, fontWeight: '700', lineHeight: 50 },

    card: { flex: 1, marginTop: -48, borderTopLeftRadius: 48, borderTopRightRadius: 48, overflow: 'hidden',
            width: '100%', maxWidth: 640, alignSelf: 'center' },
    cardCircle: { position: 'absolute', bottom: -90, left: -80, width: 240, height: 240,
                  borderRadius: 120, backgroundColor: '#fdbf2d', opacity: 0.25 },

    label: { fontSize: 15, fontWeight: '600' },

    input: { borderBottomWidth: 2, paddingHorizontal: 0, paddingVertical: 10, fontSize: 16 },

    passwordRow: { position: 'relative', justifyContent: 'center' },
    passwordInput: { paddingRight: 48 },
    eyeBtn: { position: 'absolute', right: 0, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

    signInBtn: { borderRadius: 999, paddingVertical: 18, alignItems: 'center',
                 justifyContent: 'center', marginTop: 8 },
    signInBtnDisabled: { opacity: 0.5 },
    signInText: { fontSize: 17, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },

    spacer: { flexGrow: 1, minHeight: 24 },
    footer: { alignItems: 'flex-end' },
    forgotLink: { fontSize: 14, fontWeight: '500' },
    needAccessLink: { textAlign: 'right', fontSize: 17, fontWeight: '700' },
});
