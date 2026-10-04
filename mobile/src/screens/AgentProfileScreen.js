import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import api from '../api/client';
import LoadingOverlay from '../components/LoadingOverlay';
import ZonePicker from '../components/ZonePicker';
import ZoneMapPreview from '../components/ZoneMapPreview';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function AgentProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('0');
  const [zones, setZones] = useState([]);
  const [selectedZones, setSelectedZones] = useState([]);
  const [igStatus, setIgStatus] = useState(null);
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [zonesRes, meRes, igRes] = await Promise.all([
        api.get('/api/zones'),
        api.get('/api/agents/me'),
        api.get('/api/instagram/status').catch(() => ({ data: null })),
      ]);
      setZones(zonesRes.data);
      setPhone(meRes.data.phone || '');
      setAgencyName(meRes.data.agencyName || '');
      setBio(meRes.data.bio || '');
      setYearsExperience(String(meRes.data.yearsExperience ?? 0));
      setSelectedZones((meRes.data.zones || []).map((z) => z._id));
      setHasOpenaiKey(!!meRes.data.hasOpenaiKey);
      setOpenaiModel(meRes.data.openaiModel || 'gpt-4o-mini');
      setOpenaiKeyInput('');
      setIgStatus(igRes.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/api/agents/me', {
        phone: phone.trim(),
        agencyName: agencyName.trim(),
        bio,
        yearsExperience: Number(yearsExperience) || 0,
        zoneIds: selectedZones,
        complete: selectedZones.length > 0 && !!phone.trim(),
      });
      await updateUser({ onboardingComplete: !!data.onboardingComplete });
      Alert.alert('Saved', 'Profile updated');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const connectInstagram = async () => {
    try {
      setSaving(true);
      const { data } = await api.get('/api/instagram/oauth-url');
      await WebBrowser.openBrowserAsync(data.url);
      await load();
    } catch (err) {
      Alert.alert(
        'Instagram',
        err.response?.data?.message ||
          'Could not start Instagram connect. Configure META_APP_ID on the server.'
      );
    } finally {
      setSaving(false);
    }
  };

  const disconnectInstagram = async () => {
    try {
      setSaving(true);
      await api.post('/api/instagram/disconnect');
      await load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Disconnect failed');
    } finally {
      setSaving(false);
    }
  };

  const saveOpenaiKey = async () => {
    if (!openaiKeyInput.trim()) {
      Alert.alert('OpenAI key', 'Paste your API key from platform.openai.com');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/api/agents/me/openai-key', {
        apiKey: openaiKeyInput.trim(),
        model: openaiModel.trim() || 'gpt-4o-mini',
      });
      setHasOpenaiKey(!!data.hasOpenaiKey);
      setOpenaiKeyInput('');
      Alert.alert('Saved', data.message || 'Your OpenAI key is saved securely.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save OpenAI key');
    } finally {
      setSaving(false);
    }
  };

  const clearOpenaiKey = async () => {
    Alert.alert('Remove OpenAI key', 'Caption generation will stop until you add a key again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const { data } = await api.put('/api/agents/me/openai-key', { apiKey: '' });
            setHasOpenaiKey(!!data.hasOpenaiKey);
            setOpenaiKeyInput('');
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Could not remove key');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LoadingOverlay visible={loading || saving} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{user?.name}</Text>
        <Text style={styles.sub}>{user?.email}</Text>

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} />

        <Text style={styles.label}>Agency</Text>
        <TextInput style={styles.input} value={agencyName} onChangeText={setAgencyName} />

        <Text style={styles.label}>Years experience</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={yearsExperience}
          onChangeText={setYearsExperience}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          multiline
          value={bio}
          onChangeText={setBio}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Areas served</Text>
        <ZonePicker
          zones={zones}
          selectedIds={selectedZones}
          onChange={setSelectedZones}
          multi
          placeholder="Select areas served"
        />
        <ZoneMapPreview zones={zones} selectedIds={selectedZones} height={200} />

        <Text style={styles.section}>Your OpenAI credits (LLM)</Text>
        <View style={styles.igBox}>
          <Text style={styles.igText}>
            Paste your personal OpenAI API key. Reel captions use your free/paid credits — not a
            shared platform key. Keys are stored encrypted and never shown again.
          </Text>
          <Text style={styles.statusLine}>
            Status: {hasOpenaiKey ? 'Key saved' : 'No key yet'}
          </Text>
          <Text style={styles.label}>OpenAI API key</Text>
          <TextInput
            style={styles.input}
            value={openaiKeyInput}
            onChangeText={setOpenaiKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder={hasOpenaiKey ? '•••• sk-... (enter to replace)' : 'sk-...'}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={openaiModel}
            onChangeText={setOpenaiModel}
            autoCapitalize="none"
            placeholder="gpt-4o-mini"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable style={styles.button} onPress={saveOpenaiKey}>
            <Text style={styles.buttonText}>
              {hasOpenaiKey ? 'Replace OpenAI key' : 'Save OpenAI key'}
            </Text>
          </Pressable>
          {hasOpenaiKey && (
            <Pressable style={[styles.secondaryBtn, { marginTop: 8 }]} onPress={clearOpenaiKey}>
              <Text style={styles.secondaryText}>Remove key</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.section}>Instagram Reels</Text>
        {igStatus?.connected ? (
          <View style={styles.igBox}>
            <Text style={styles.igText}>
              Connected as @{igStatus.instagramUsername || 'business'}
            </Text>
            <Pressable style={styles.secondaryBtn} onPress={disconnectInstagram}>
              <Text style={styles.secondaryText}>Disconnect</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.igBox}>
            <Text style={styles.igText}>
              Connect an Instagram Business account linked to a Facebook Page to auto-publish
              Reels.
            </Text>
            <Pressable style={styles.button} onPress={connectInstagram}>
              <Text style={styles.buttonText}>Connect Instagram</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Save profile</Text>
        </Pressable>
        <Pressable onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.textMuted, marginBottom: spacing.md },
  section: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  notes: { minHeight: 80 },
  igBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  igText: { color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 20 },
  statusLine: {
    color: colors.primaryDark,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: colors.dangerLight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: colors.danger, fontWeight: '700' },
  logout: { marginTop: spacing.md, alignItems: 'center' },
  logoutText: { color: colors.danger, fontWeight: '600' },
});
