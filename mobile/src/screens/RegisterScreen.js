import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { colors, spacing } from '../constants/theme';

function networkHint(err, apiUrl) {
  const isNetwork =
    err.message === 'Network Error' ||
    err.code === 'ECONNABORTED' ||
    err.code === 'ERR_NETWORK';
  if (!isNetwork) return err.response?.data?.message || err.message || 'Registration failed';
  return (
    `Cannot reach API at ${apiUrl}.\n\n` +
    `• Android emulator: http://10.0.2.2:5000\n` +
    `• Physical phone (same Wi‑Fi): http://YOUR_PC_LAN_IP:5000\n` +
    `• Ensure backend is running (npm run dev in backend/)\n\n` +
    `Open Server settings below and set the correct URL.`
  );
}

export default function RegisterScreen({ navigation }) {
  const { register, apiUrl, updateApiUrl } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('publisher');
  const [baseUrl, setBaseUrl] = useState(apiUrl);
  const [showServer, setShowServer] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    setBaseUrl(apiUrl);
  }, [apiUrl]);

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Invalid form', 'Name, email, and password (6+ chars) are required.');
      return;
    }
    setLoading(true);
    const url = (baseUrl || apiUrl).trim().replace(/\/$/, '');
    try {
      await updateApiUrl(url);
      await register(name.trim(), email.trim(), password, role);
    } catch (err) {
      Alert.alert('Register error', networkHint(err, url));
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Publisher posts homes (as Agent or Owner). Customer browses & enquires.
          Use admin@realcrm.app for Business Owner.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            <Pressable
              style={[styles.roleChip, role === 'publisher' && styles.roleChipActive]}
              onPress={() => setRole('publisher')}
            >
              <Text
                style={[styles.roleText, role === 'publisher' && styles.roleTextActive]}
              >
                Publisher
              </Text>
            </Pressable>
            <Pressable
              style={[styles.roleChip, role === 'customer' && styles.roleChipActive]}
              onPress={() => setRole('customer')}
            >
              <Text
                style={[styles.roleText, role === 'customer' && styles.roleTextActive]}
              >
                Customer
              </Text>
            </Pressable>
          </View>

          <GoogleSignInButton
            label="Sign up with Google"
            onBusyChange={setGoogleBusy}
            role={role}
          />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or email</Text>
            <View style={styles.divider} />
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ada Lovelace"
            placeholderTextColor={colors.textMuted}
          />

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
            placeholder="Min 6 characters"
            placeholderTextColor={colors.textMuted}
          />

          <Pressable style={styles.button} onPress={onSubmit}>
            <Text style={styles.buttonText}>Register</Text>
          </Pressable>

          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Already have an account? Sign in</Text>
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
                autoCorrect={false}
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="http://192.168.1.6:5000"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.hint}>
                Emulator: http://10.0.2.2:5000{'\n'}
                Phone on Wi‑Fi: http://192.168.1.6:5000 (this PC){'\n'}
                Backend must be running on port 5000.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 40,
    justifyContent: 'center',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    color: colors.textMuted,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  roleChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  roleText: {
    fontWeight: '700',
    color: colors.textMuted,
  },
  roleTextActive: {
    color: colors.primary,
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
    color: colors.primary,
    fontWeight: '600',
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
    lineHeight: 18,
  },
});
