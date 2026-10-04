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
import * as ImagePicker from 'expo-image-picker';
import api from '../api/client';
import LoadingOverlay from '../components/LoadingOverlay';
import { ZoneChipsWrap } from '../components/ZonePicker';
import {
  LISTING_TYPES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from '../constants/config';
import { colors, spacing } from '../constants/theme';
import { sharePropertyOnWhatsApp } from '../utils/whatsappShare';
import { useAuth } from '../context/AuthContext';

export default function PropertyFormScreen({ navigation, route }) {
  const { mode = 'create', propertyId } = route.params || {};
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [property, setProperty] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Apartment');
  const [listingType, setListingType] = useState('Sale');
  const [bhk, setBhk] = useState('');
  const [price, setPrice] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [zoneId, setZoneId] = useState(null);
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('Available');
  const [notes, setNotes] = useState('');
  const [caption, setCaption] = useState('');
  const [script, setScript] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [loading, setLoading] = useState(true);

  const hydrate = (data) => {
    setProperty(data);
    setTitle(data.title || '');
    setType(data.type || 'Apartment');
    setListingType(data.listingType || 'Sale');
    setBhk(data.bhk != null ? String(data.bhk) : '');
    setPrice(data.price != null ? String(data.price) : '');
    setAreaSqft(data.areaSqft != null ? String(data.areaSqft) : '');
    setZoneId(data.zone?._id || data.zone);
    setAddress(data.address || '');
    setStatus(data.status || 'Available');
    setNotes(data.notes || '');
    setCaption(data.generatedCaption || '');
    setScript(data.generatedScript || '');
  };

  useEffect(() => {
    (async () => {
      try {
        const [zonesRes, meRes] = await Promise.all([
          api.get('/api/zones'),
          api.get('/api/agents/me').catch(() => ({ data: {} })),
        ]);
        setZones(zonesRes.data);
        setAgentPhone(meRes.data.phone || '');
        if (mode === 'edit' && propertyId) {
          const { data } = await api.get(`/api/properties/${propertyId}`);
          hydrate(data);
        }
      } catch (err) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to load');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, propertyId, navigation]);

  const onSave = async () => {
    if (!title.trim() || !price || !zoneId) {
      Alert.alert('Validation', 'Title, price, and zone are required.');
      return;
    }
    setLoading(true);
    const payload = {
      title: title.trim(),
      type,
      listingType,
      bhk: bhk === '' ? null : Number(bhk),
      price: Number(price),
      areaSqft: areaSqft === '' ? null : Number(areaSqft),
      zone: zoneId,
      address,
      status,
      notes,
    };
    try {
      if (mode === 'edit') {
        const { data } = await api.put(`/api/properties/${propertyId}`, payload);
        hydrate(data);
        Alert.alert('Saved', 'Property updated');
      } else {
        const { data } = await api.post('/api/properties', payload);
        navigation.replace('PropertyForm', { mode: 'edit', propertyId: data._id });
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadVideo = async () => {
    if (mode !== 'edit' || !propertyId) {
      Alert.alert('Save first', 'Save the property before uploading a reel clip.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow media access to pick a video clip.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const form = new FormData();
    form.append('video', {
      uri: asset.uri,
      name: asset.fileName || `reel-${Date.now()}.mp4`,
      type: asset.mimeType || 'video/mp4',
    });

    setLoading(true);
    try {
      const { data } = await api.post(`/api/properties/${propertyId}/video`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      hydrate(data);
      Alert.alert('Uploaded', 'Video clip attached. Use HTTPS public URL for Instagram.');
    } catch (err) {
      Alert.alert('Upload failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCaption = async () => {
    if (!propertyId) {
      Alert.alert('Save first', 'Save the property before generating a caption.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/api/properties/${propertyId}/generate-caption`);
      setCaption(data.caption || '');
      setScript(data.script || '');
      if (data.property) hydrate(data.property);
    } catch (err) {
      Alert.alert('LLM error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const publishReel = async () => {
    if (!propertyId) return;
    Alert.alert('Publish Reel', 'Post this clip to your connected Instagram account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          setLoading(true);
          try {
            const { data } = await api.post(`/api/properties/${propertyId}/publish-reel`, {
              caption,
            });
            if (data.property) hydrate(data.property);
            Alert.alert('Published', `Reel id: ${data.reelId}`);
          } catch (err) {
            Alert.alert('Publish failed', err.response?.data?.message || err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const onWhatsApp = async () => {
    const snapshot = {
      title,
      type,
      listingType,
      bhk: bhk === '' ? null : Number(bhk),
      price: price === '' ? null : Number(price),
      address,
      notes,
      zone: zones.find((z) => z._id === zoneId) || property?.zone,
    };
    await sharePropertyOnWhatsApp(snapshot, agentPhone);
  };

  const onDelete = () => {
    Alert.alert('Delete property', 'Remove this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/properties/${propertyId}`);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Delete failed');
          }
        },
      },
    ]);
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
      <LoadingOverlay visible={loading} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Type</Text>
        <ChipRow options={PROPERTY_TYPES} value={type} onSelect={setType} />

        <Text style={styles.label}>Listing</Text>
        <ChipRow options={LISTING_TYPES} value={listingType} onSelect={setListingType} />

        <Text style={styles.label}>BHK</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={bhk}
          onChangeText={setBhk}
          placeholder="e.g. 3"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Price (₹) *</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={styles.label}>Area (sqft)</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={areaSqft}
          onChangeText={setAreaSqft}
        />

        <Text style={styles.label}>Zone *</Text>
        <ZoneChipsWrap
          zones={zones}
          selectedIds={zoneId ? [zoneId] : []}
          onChange={(ids) => setZoneId(ids[ids.length - 1] || null)}
        />

        <Text style={styles.label}>Status</Text>
        <ChipRow options={PROPERTY_STATUSES} value={status} onSelect={setStatus} />

        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          multiline
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />

        <Pressable style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>{mode === 'edit' ? 'Update' : 'Add'} property</Text>
        </Pressable>

        {mode === 'edit' && (
          <>
            <Text style={styles.section}>Share & publish</Text>
            <Pressable style={styles.secondaryBtn} onPress={onWhatsApp}>
              <Text style={styles.secondaryText}>Share on WhatsApp</Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={pickAndUploadVideo}>
              <Text style={styles.secondaryText}>
                {property?.videoUrl ? 'Replace reel video clip' : 'Upload reel video clip'}
              </Text>
            </Pressable>
            {!!property?.videoUrl && (
              <Text style={styles.hint} numberOfLines={2}>
                Video: {property.videoUrl}
              </Text>
            )}

            <Pressable style={styles.secondaryBtn} onPress={generateCaption}>
              <Text style={styles.secondaryText}>Generate caption (your OpenAI key)</Text>
            </Pressable>
            <Text style={styles.hint}>
              Uses the OpenAI API key saved on your Profile (your credits).
            </Text>

            <Text style={styles.label}>Instagram caption</Text>
            <TextInput
              style={[styles.input, styles.notes]}
              multiline
              value={caption}
              onChangeText={setCaption}
              textAlignVertical="top"
            />
            {!!script && (
              <>
                <Text style={styles.label}>Spoken script</Text>
                <Text style={styles.script}>{script}</Text>
              </>
            )}

            <Pressable style={styles.button} onPress={publishReel}>
              <Text style={styles.buttonText}>Publish Reel to Instagram</Text>
            </Pressable>
            {!!property?.lastInstagramReelId && (
              <Text style={styles.hint}>
                Last reel: {property.lastInstagramReelId}
                {property.lastInstagramPostedAt
                  ? ` · ${new Date(property.lastInstagramPostedAt).toLocaleString()}`
                  : ''}
              </Text>
            )}

            <Pressable style={styles.dangerBtn} onPress={onDelete}>
              <Text style={styles.dangerText}>Delete</Text>
            </Pressable>
            <Text style={styles.footerHint}>
              Agent: {user?.name}. Connect Instagram under Profile before publishing.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  section: {
    marginTop: spacing.lg,
    fontSize: 17,
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
  notes: { minHeight: 90 },
  script: {
    color: colors.textMuted,
    lineHeight: 20,
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: 10,
  },
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    marginTop: spacing.sm,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  secondaryText: { color: colors.primaryDark, fontWeight: '700' },
  dangerBtn: {
    marginTop: spacing.sm,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.dangerLight,
  },
  dangerText: { color: colors.danger, fontWeight: '700' },
  hint: { marginTop: 6, fontSize: 12, color: colors.textMuted },
  footerHint: { marginTop: spacing.md, fontSize: 12, color: colors.textMuted },
});
