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
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingOverlay from '../components/LoadingOverlay';
import { INTERACTION_TYPES } from '../constants/config';
import { colors, spacing } from '../constants/theme';

export default function CustomerDetailScreen({ navigation, route }) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('Call');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [custRes, intRes] = await Promise.all([
        api.get(`/api/customers/${customerId}`),
        api.get(`/api/interactions/${customerId}`),
      ]);
      setCustomer(custRes.data);
      setInteractions(intRes.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [customerId])
  );

  const logInteraction = async () => {
    if (!notes.trim()) {
      Alert.alert('Validation', 'Add a short note for the interaction.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/api/interactions', {
        customer: customerId,
        type,
        notes: notes.trim(),
      });
      setInteractions((prev) => [data, ...prev]);
      setNotes('');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not log interaction');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    Alert.alert('Delete customer', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/customers/${customerId}`);
            navigation.navigate('Dashboard');
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  if (!customer && loading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay visible />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading || saving} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.name}>{customer?.name}</Text>
            <StatusBadge status={customer?.status} />
          </View>
          <Text style={styles.company}>{customer?.phone || 'No phone'}</Text>
          <Text style={styles.row}>Email: {customer?.email || '—'}</Text>
          <Text style={styles.row}>
            Agent: {customer?.assignedAgent?.name || 'Unassigned'}
          </Text>
          {!!customer?.notes && (
            <Text style={styles.notesBlock}>Notes: {customer.notes}</Text>
          )}

          <View style={styles.actions}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() =>
                navigation.navigate('CustomerForm', { mode: 'edit', customerId })
              }
            >
              <Text style={styles.secondaryBtnText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.dangerBtn} onPress={onDelete}>
              <Text style={styles.dangerBtnText}>Delete</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Log interaction</Text>
        <View style={styles.typeRow}>
          {INTERACTION_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[styles.chip, type === t && styles.chipActive]}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.input, styles.notesInput]}
          multiline
          placeholder="What happened?"
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />
        <Pressable style={styles.primaryBtn} onPress={logInteraction}>
          <Text style={styles.primaryBtnText}>Save activity</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Activity history</Text>
        {interactions.length === 0 ? (
          <Text style={styles.empty}>No interactions logged yet.</Text>
        ) : (
          interactions.map((item) => (
            <View key={item._id} style={styles.activity}>
              <View style={styles.activityTop}>
                <Text style={styles.activityType}>{item.type}</Text>
                <Text style={styles.activityDate}>
                  {new Date(item.date).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.activityNotes}>{item.notes}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text },
  company: { marginTop: 8, color: colors.primaryDark, fontWeight: '600' },
  row: { marginTop: 4, color: colors.textMuted },
  notesBlock: { marginTop: 10, color: colors.text, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.primaryDark, fontWeight: '700' },
  dangerBtn: {
    flex: 1,
    backgroundColor: colors.dangerLight,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: { color: colors.danger, fontWeight: '700' },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
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
  notesInput: { minHeight: 80 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  empty: { color: colors.textMuted },
  activity: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  activityType: { fontWeight: '800', color: colors.primary },
  activityDate: { fontSize: 12, color: colors.textMuted },
  activityNotes: { color: colors.text, lineHeight: 20 },
});
