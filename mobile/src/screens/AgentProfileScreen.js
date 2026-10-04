import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import api from '../api/client';
import LoadingOverlay from '../components/LoadingOverlay';
import ZonePicker from '../components/ZonePicker';
import ZoneMapPreview from '../components/ZoneMapPreview';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import Field from '../components/Field';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing, type } from '../constants/theme';

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
        <ScreenHeader title={user?.name} subtitle={user?.email} />
        <View style={styles.body}>
          <Field
            label="Phone"
            containerStyle={styles.firstField}
            value={phone}
            onChangeText={setPhone}
          />

          <Field label="Agency" value={agencyName} onChangeText={setAgencyName} />

          <Field
            label="Years experience"
            keyboardType="number-pad"
            value={yearsExperience}
            onChangeText={setYearsExperience}
          />

          <Field label="Bio" multiline value={bio} onChangeText={setBio} />

          <Text style={styles.label}>Areas served</Text>
          <ZonePicker
            zones={zones}
            selectedIds={selectedZones}
            onChange={setSelectedZones}
            multi
            placeholder="Select areas served"
          />
          <ZoneMapPreview zones={zones} selectedIds={selectedZones} height={200} />

          <Button title="Save profile" onPress={onSave} style={styles.save} />

          <Text style={styles.section} accessibilityRole="header">
            Your OpenAI credits (LLM)
          </Text>
          <Card>
            <Text style={styles.cardText}>
              Paste your personal OpenAI API key. Reel captions use your free/paid credits — not a
              shared platform key. Keys are stored encrypted and never shown again.
            </Text>
            <Text style={styles.statusLine}>
              Status: {hasOpenaiKey ? 'Key saved' : 'No key yet'}
            </Text>
            <Field
              label="OpenAI API key"
              value={openaiKeyInput}
              onChangeText={setOpenaiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              placeholder={hasOpenaiKey ? '•••• sk-... (enter to replace)' : 'sk-...'}
            />
            <Field
              label="Model"
              value={openaiModel}
              onChangeText={setOpenaiModel}
              autoCapitalize="none"
              placeholder="gpt-4o-mini"
            />
            <Button
              title={hasOpenaiKey ? 'Replace OpenAI key' : 'Save OpenAI key'}
              onPress={saveOpenaiKey}
              variant="secondary"
              style={styles.cardAction}
            />
            {hasOpenaiKey && (
              <Button
                title="Remove key"
                onPress={clearOpenaiKey}
                variant="danger"
                style={styles.cardActionNext}
              />
            )}
          </Card>

          <Text style={styles.section} accessibilityRole="header">
            Instagram Reels
          </Text>
          {igStatus?.connected ? (
            <Card>
              <Text style={styles.cardText}>
                Connected as @{igStatus.instagramUsername || 'business'}
              </Text>
              <Button
                title="Disconnect"
                onPress={disconnectInstagram}
                variant="danger"
                style={styles.cardActionNext}
              />
            </Card>
          ) : (
            <Card>
              <Text style={styles.cardText}>
                Connect an Instagram Business account linked to a Facebook Page to auto-publish
                Reels.
              </Text>
              <Button
                title="Connect Instagram"
                onPress={connectInstagram}
                variant="secondary"
                style={styles.cardActionNext}
              />
            </Card>
          )}

          <Button title="Logout" onPress={logout} variant="danger" style={styles.logout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  body: { paddingHorizontal: spacing.lg },
  firstField: { marginTop: -spacing.md },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  save: { marginTop: spacing.lg },
  section: { ...type.heading, marginTop: spacing.xl, marginBottom: spacing.sm },
  cardText: { ...type.secondary },
  statusLine: { ...type.secondary, color: colors.text, fontWeight: '600', marginTop: spacing.sm },
  cardAction: { marginTop: spacing.md },
  cardActionNext: { marginTop: spacing.sm },
  logout: { marginTop: spacing.lg },
});
