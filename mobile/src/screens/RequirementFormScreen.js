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
import api from '../api/client';
import LoadingOverlay from '../components/LoadingOverlay';
import ZonePicker from '../components/ZonePicker';
import { LISTING_TYPES, REQUIREMENT_PROPERTY_TYPES } from '../constants/config';
import { colors, spacing } from '../constants/theme';

export default function RequirementFormScreen({ navigation }) {
  const [zones, setZones] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [listingType, setListingType] = useState('Sale');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [bhkMin, setBhkMin] = useState('2');
  const [bhkMax, setBhkMax] = useState('3');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [selectedZones, setSelectedZones] = useState([]);
  const [notes, setNotes] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('0');
  const [leadGenSharePercent, setLeadGenSharePercent] = useState('50');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/zones');
        setZones(data);
      } catch (err) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to load zones');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Buyer name is required.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/api/requirements', {
        customerPayload: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
        },
        listingType,
        propertyType,
        bhkMin: bhkMin === '' ? null : Number(bhkMin),
        bhkMax: bhkMax === '' ? null : Number(bhkMax),
        budgetMin: budgetMin === '' ? 0 : Number(budgetMin),
        budgetMax: budgetMax === '' ? null : Number(budgetMax),
        preferredZones: selectedZones,
        notes,
        commissionPercent: commissionPercent === '' ? 0 : Number(commissionPercent),
        leadGenSharePercent:
          leadGenSharePercent === '' ? 50 : Number(leadGenSharePercent),
      });
      navigation.replace('RequirementDetail', { requirementId: data._id });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const ChipRow = ({ options, value, onSelect }) => (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(opt)}
          style={[styles.chip, value === opt && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading || saving} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Buyer</Text>
        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.section}>Requirement</Text>
        <Text style={styles.label}>Listing</Text>
        <ChipRow options={LISTING_TYPES} value={listingType} onSelect={setListingType} />
        <Text style={styles.label}>Property type</Text>
        <ChipRow
          options={REQUIREMENT_PROPERTY_TYPES}
          value={propertyType}
          onSelect={setPropertyType}
        />

        <View style={styles.row2}>
          <View style={styles.half}>
            <Text style={styles.label}>BHK min</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={bhkMin}
              onChangeText={setBhkMin}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>BHK max</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={bhkMax}
              onChangeText={setBhkMax}
            />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={styles.half}>
            <Text style={styles.label}>Budget min ₹</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={budgetMin}
              onChangeText={setBudgetMin}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Budget max ₹</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={budgetMax}
              onChangeText={setBudgetMax}
            />
          </View>
        </View>

        <Text style={styles.label}>Preferred areas</Text>
        <ZonePicker
          zones={zones}
          selectedIds={selectedZones}
          onChange={setSelectedZones}
          multi
          placeholder="Select preferred areas"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          multiline
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />

        <Text style={styles.section}>Commission split (optional)</Text>
        <Text style={styles.hint}>
          Total brokerage % and your share as lead generator. Serving agent gets the rest.
        </Text>
        <View style={styles.row2}>
          <View style={styles.half}>
            <Text style={styles.label}>Total commission %</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={commissionPercent}
              onChangeText={setCommissionPercent}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Lead-gen share %</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={leadGenSharePercent}
              onChangeText={setLeadGenSharePercent}
            />
          </View>
        </View>

        <Pressable style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Save & find matches</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  section: {
    marginTop: spacing.md,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
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
    backgroundColor: colors.surface,
  },
  notes: { minHeight: 80 },
  hint: { marginTop: 4, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  row2: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
