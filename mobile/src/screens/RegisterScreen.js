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
import { colors, spacing } from '../constants/theme';

export default function RegisterScreen({ navigation }) {
  const { register, apiUrl, updateApiUrl } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('agent');
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const onSubmit = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      Alert.alert('Invalid form', 'Name, email, and password (6+ chars) are required.');
      return;
    }
    setLoading(true);
    try {
      await updateApiUrl(apiUrl);
      await register(name.trim(), email.trim(), password, role);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      Alert.alert('Register error', message);
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
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>
        Choose Agent or Property Owner. Use admin@realcrm.app for admin.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>I am a</Text>
        <View style={styles.roleRow}>
          <Pressable
            style={[styles.roleChip, role === 'agent' && styles.roleChipActive]}
            onPress={() => setRole('agent')}
          >
            <Text style={[styles.roleText, role === 'agent' && styles.roleTextActive]}>
              Agent
            </Text>
          </Pressable>
          <Pressable
            style={[styles.roleChip, role === 'owner' && styles.roleChipActive]}
            onPress={() => setRole('owner')}
          >
            <Text style={[styles.roleText, role === 'owner' && styles.roleTextActive]}>
              Property Owner
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
});
