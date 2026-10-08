import { useTheme } from '@/constants/theme';
import { getSupabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { errorMessage } from '@/lib/warehouse';
import { useAuth } from '@/lib/auth';
import {
    ActivityIndicator, KeyboardAvoidingView, Platform,
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
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { padding: spacing.four, gap: spacing.four }]}>

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
                        accessibilityLabel="Email"
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
                        accessibilityLabel="Password"
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

                <TouchableOpacity accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }}
                    onPress={() => router.push('/account-setup')}>
                    <Text style={[styles.needAccessLink, { color: colors.primary }]}>Forgot password or finish invitation?</Text>
                </TouchableOpacity>
                {/* Need access */}
                <TouchableOpacity accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }} onPress={handleNeedAccess}>
                    <Text style={[styles.needAccessLink, { color: colors.primary, textDecorationLine: 'underline' }]}>
                        Need Access?
                    </Text>
                </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
    </SafeAreaView>
    );
}

const styles = StyleSheet.create
({
    container: { flex: 1 },
    flex: { flex: 1 },
    content: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 640, alignSelf: 'center' },

    title: { fontSize: 28, fontWeight: '700' },
    subtitle: { fontSize: 15 },

    label: { fontSize: 13, fontWeight: '600' },

    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
             paddingVertical: 14, fontSize: 16 },

    passwordRow: { position: 'relative', justifyContent: 'center' },
    passwordInput: { paddingRight: 48 },
    eyeBtn: { position: 'absolute', right: 4, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

    signInBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center',
                 justifyContent: 'center', marginTop: 8 },
    signInBtnDisabled: { opacity: 0.5 },
    signInText: { fontSize: 16, fontWeight: '700' },

    needAccessLink: { textAlign: 'center', fontSize: 14, marginTop: 4, fontWeight: '600' },
});
