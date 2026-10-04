import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ErrorBoundary from '../components/ErrorBoundary';
import { colors, spacing } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const { login, apiUrl, updateApiUrl } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState(apiUrl);
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showServer, setShowServer] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      if (baseUrl !== apiUrl) {
        await updateApiUrl(baseUrl);
      }
      await login(email.trim(), password);
    } catch (err) {
      const isNetwork =
        err.message === 'Network Error' ||
        err.code === 'ECONNABORTED' ||
        err.code === 'ERR_NETWORK';
      const message = isNetwork
        ? `Cannot reach API at ${baseUrl || apiUrl}.\n\nEmulator: http://10.0.2.2:5000\nPhone: http://YOUR_PC_LAN_IP:5000\n\nOpen Server settings and confirm the URL; keep backend running.`
        : err.response?.data?.message || err.message || 'Login failed';
      Alert.alert('Login error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LoadingOverlay visible={loading || googleBusy} />
      <View style={styles.hero}>
        <Text style={styles.brand}>RealCRM</Text>
        <Text style={styles.subtitle}>Match buyers to the right agents</Text>
      </View>

      <View style={styles.form}>
        <ErrorBoundary>
          <GoogleSignInButton label="Sign in with Google" onBusyChange={setGoogleBusy} />
        </ErrorBoundary>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or email</Text>
          <View style={styles.divider} />
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
        />

        <Pressable style={styles.button} onPress={onSubmit}>
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>
            New here? <Text style={styles.linkBold}>Create an account</Text>
          </Text>
        </Pressable>

        <Pressable onPress={() => setShowServer((v) => !v)} style={styles.serverToggle}>
          <Text style={styles.serverToggleText}>
            {showServer ? 'Hide server settings' : 'Server settings'}
          </Text>
        </Pressable>

        {showServer && (
          <View>
            <Text style={styles.label}>API Base URL</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder="http://10.0.2.2:5000"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.hint}>
              Emulator: http://10.0.2.2:5000{'\n'}
              Phone on Wi‑Fi: http://192.168.1.6:5000 (this PC)
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 16,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.textMuted,
  },
  linkBold: {
    color: colors.primary,
    fontWeight: '700',
  },
  serverToggle: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  serverToggleText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
});
