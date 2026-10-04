import React, { useEffect, useState } from 'react';
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
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingOverlay from '../components/LoadingOverlay';
import ZonePicker from '../components/ZonePicker';
import ZoneMapPreview from '../components/ZoneMapPreview';
import { colors, spacing } from '../constants/theme';

export default function AgentOnboardingScreen() {
  const { updateUser, logout } = useAuth();
  const [phone, setPhone] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState('0');
  const [zones, setZones] = useState([]);
  const [selectedZones, setSelectedZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [zonesRes, meRes] = await Promise.all([
          api.get('/api/zones'),
          api.get('/api/agents/me'),
        ]);
        setZones(zonesRes.data);
        setPhone(meRes.data.phone || '');
        setAgencyName(meRes.data.agencyName || '');
        setBio(meRes.data.bio || '');
        setYearsExperience(String(meRes.data.yearsExperience ?? 0));
        setSelectedZones((meRes.data.zones || []).map((z) => z._id));
      } catch (err) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to load onboarding');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onComplete = async () => {
    if (!phone.trim()) {
      Alert.alert('Required', 'Phone number is required.');
      return;
    }
    if (!selectedZones.length) {
      Alert.alert('Required', 'Select at least one area you serve.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/api/agents/me', {
        phone: phone.trim(),
        agencyName: agencyName.trim(),
        bio,
        yearsExperience: Number(yearsExperience) || 0,
        zoneIds: selectedZones,
        complete: true,
      });
      await updateUser({ onboardingComplete: !!data.onboardingComplete });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading || saving} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Agent onboarding</Text>
        <Text style={styles.subtitle}>
          Tell us about your dealership and the Hyderabad areas you serve.
        </Text>

        <Text style={styles.label}>Phone *</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 ..."
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Agency / Dealership</Text>
        <TextInput
          style={styles.input}
          value={agencyName}
          onChangeText={setAgencyName}
          placeholder="e.g. Westside Homes"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Years of experience</Text>
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
          placeholder="Specialties, languages, focus areas..."
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Areas served *</Text>
        <Text style={styles.hint}>Open the dropdown and pick one or more areas</Text>
        <ZonePicker
          zones={zones}
          selectedIds={selectedZones}
          onChange={setSelectedZones}
          multi
          placeholder="Select areas served"
        />
        <ZoneMapPreview zones={zones} selectedIds={selectedZones} height={200} />

        <Pressable style={styles.button} onPress={onComplete}>
          <Text style={styles.buttonText}>Complete onboarding</Text>
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
  content: { padding: spacing.lg, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 6, marginBottom: spacing.md, color: colors.textMuted, lineHeight: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
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
  notes: { minHeight: 90 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  logout: { marginTop: spacing.md, alignItems: 'center' },
  logoutText: { color: colors.danger, fontWeight: '600' },
});
