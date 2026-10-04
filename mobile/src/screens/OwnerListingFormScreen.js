import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api/client';
import LoadingOverlay from '../components/LoadingOverlay';
import ZonePicker from '../components/ZonePicker';
import { LISTING_TYPES, PROPERTY_TYPES } from '../constants/config';
import { colors, spacing } from '../constants/theme';

export default function OwnerListingFormScreen({ navigation, route }) {
  const { mode = 'create', listingId: initialId } = route.params || {};
  const [listingId, setListingId] = useState(initialId || null);
  const [zones, setZones] = useState([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Apartment');
  const [listingType, setListingType] = useState('Sale');
  const [bhk, setBhk] = useState('');
  const [price, setPrice] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [zoneId, setZoneId] = useState(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [listedViaAgent, setListedViaAgent] = useState(false);
  const [viaAgentNote, setViaAgentNote] = useState('');
  const [termsText, setTermsText] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState('Draft');
  const [loading, setLoading] = useState(true);

  const hydrate = (data) => {
    setListingId(data._id);
    setTitle(data.title || '');
    setType(data.type || 'Apartment');
    setListingType(data.listingType || 'Sale');
    setBhk(data.bhk != null ? String(data.bhk) : '');
    setPrice(data.price != null ? String(data.price) : '');
    setAreaSqft(data.areaSqft != null ? String(data.areaSqft) : '');
    setZoneId(data.zone?._id || data.zone);
    setAddress(data.address || '');
    setNotes(data.notes || '');
    setListedViaAgent(!!data.listedViaAgent);
    setViaAgentNote(data.viaAgentNote || '');
    setTermsText(data.termsText || '');
    setImages(data.images || []);
    setStatus(data.status || 'Draft');
    setTermsAccepted(!!data.termsAcceptedAt);
  };

  useEffect(() => {
    (async () => {
      try {
        const [zonesRes, templateRes] = await Promise.all([
          api.get('/api/zones'),
          api.get('/api/listings/terms-template', { params: { listingType: 'Sale' } }),
        ]);
        setZones(zonesRes.data);
        if (mode === 'edit' && initialId) {
          const { data } = await api.get(`/api/listings/${initialId}`);
          hydrate(data);
        } else {
          setTermsText(templateRes.data.text || '');
        }
      } catch (err) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to load');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, initialId, navigation]);

  const refreshTermsForType = async (nextType) => {
    setListingType(nextType);
    if (listingId) return;
    try {
      const { data } = await api.get('/api/listings/terms-template', {
        params: { listingType: nextType },
      });
      setTermsText(data.text || '');
    } catch {
      // keep current terms
    }
  };

  const buildPayload = () => ({
    title: title.trim(),
    type,
    listingType,
    bhk: bhk === '' ? null : Number(bhk),
    price: Number(price),
    areaSqft: areaSqft === '' ? null : Number(areaSqft),
    zone: zoneId,
    address,
    notes,
    listedViaAgent,
    viaAgentNote,
    termsText,
  });

  const ensureSaved = async () => {
    if (!title.trim() || !price || !zoneId) {
      Alert.alert('Validation', 'Title, price, and zone are required.');
      return null;
    }
    const payload = buildPayload();
    if (listingId) {
      const { data } = await api.put(`/api/listings/${listingId}`, payload);
      hydrate(data);
      return data;
    }
    const { data } = await api.post('/api/listings', payload);
    hydrate(data);
    navigation.setOptions({ title: 'Edit listing' });
    return data;
  };

  const onSaveDraft = async () => {
    setLoading(true);
    try {
      await ensureSaved();
      Alert.alert('Saved', 'Draft listing saved.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const onPublish = async () => {
    if (!termsAccepted) {
      Alert.alert('Accept T&Cs', 'Check “I accept the Terms & Conditions” to publish.');
      return;
    }
    setLoading(true);
    try {
      const saved = await ensureSaved();
      if (!saved) {
        setLoading(false);
        return;
      }
      if (!(saved.images || []).length) {
        Alert.alert('Photos required', 'Add at least one photo before publishing.');
        setLoading(false);
        return;
      }
      const { data } = await api.post(`/api/listings/${saved._id}/publish`, {
        accepted: true,
      });
      hydrate(data);
      Alert.alert('Published', 'Listing is now Available.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Publish failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadImages = async () => {
    setLoading(true);
    try {
      const saved = await ensureSaved();
      if (!saved) {
        setLoading(false);
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to upload images.');
        setLoading(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 8,
      });
      if (result.canceled || !result.assets?.length) {
        setLoading(false);
        return;
      }

      const form = new FormData();
      result.assets.forEach((asset, idx) => {
        form.append('images', {
          uri: asset.uri,
          name: asset.fileName || `photo-${Date.now()}-${idx}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
      });

      const { data } = await api.post(`/api/listings/${saved._id}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      hydrate(data);
    } catch (err) {
      Alert.alert('Upload failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = async (url) => {
    if (!listingId) return;
    setLoading(true);
    try {
      const { data } = await api.delete(`/api/listings/${listingId}/images`, {
        data: { url },
      });
      hydrate(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not remove image');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    if (!listingId) {
      navigation.goBack();
      return;
    }
    Alert.alert('Delete listing?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await api.delete(`/api/listings/${listingId}`);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Delete failed');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const ChipRow = ({ options, value, onChange }) => (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>Status: {status}</Text>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="3BHK in Gachibowli"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Property type</Text>
        <ChipRow options={PROPERTY_TYPES} value={type} onChange={setType} />

        <Text style={styles.label}>Listing type</Text>
        <ChipRow options={LISTING_TYPES} value={listingType} onChange={refreshTermsForType} />

        <Text style={styles.label}>BHK</Text>
        <TextInput
          style={styles.input}
          value={bhk}
          onChangeText={setBhk}
          keyboardType="numeric"
          placeholder="3"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Price (₹)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="8500000"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Area (sqft)</Text>
        <TextInput
          style={styles.input}
          value={areaSqft}
          onChangeText={setAreaSqft}
          keyboardType="numeric"
          placeholder="1450"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Area</Text>
        <ZonePicker
          zones={zones}
          selectedIds={zoneId ? [zoneId] : []}
          onChange={(ids) => setZoneId(ids[0] || null)}
          multi={false}
          placeholder="Select area"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={address}
          onChangeText={setAddress}
          multiline
          placeholder="Flat / street / landmark"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Facing, floor, amenities…"
          placeholderTextColor={colors.textMuted}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.labelInline}>Listed via agent</Text>
            <Text style={styles.switchHint}>Informational only — no agent claim yet</Text>
          </View>
          <Switch value={listedViaAgent} onValueChange={setListedViaAgent} />
        </View>
        {listedViaAgent ? (
          <>
            <Text style={styles.label}>Via-agent note</Text>
            <TextInput
              style={styles.input}
              value={viaAgentNote}
              onChangeText={setViaAgentNote}
              placeholder="e.g. Working with ABC Realty"
              placeholderTextColor={colors.textMuted}
            />
          </>
        ) : null}

        <Text style={styles.label}>Photos</Text>
        <View style={styles.imageGrid}>
          {images.map((url) => (
            <View key={url} style={styles.imageWrap}>
              <Image source={{ uri: url }} style={styles.thumb} />
              <Pressable style={styles.removeImg} onPress={() => removeImage(url)}>
                <Text style={styles.removeImgText}>×</Text>
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.addImg} onPress={pickAndUploadImages}>
            <Text style={styles.addImgText}>+ Add</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Terms & Conditions</Text>
        <TextInput
          style={[styles.input, styles.terms]}
          value={termsText}
          onChangeText={setTermsText}
          multiline
          textAlignVertical="top"
        />

        <Pressable
          style={styles.acceptRow}
          onPress={() => setTermsAccepted((v) => !v)}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]}>
            {termsAccepted ? <Text style={styles.checkMark}>✓</Text> : null}
          </View>
          <Text style={styles.acceptText}>I accept these Terms & Conditions</Text>
        </Pressable>

        <Pressable style={styles.primaryBtn} onPress={onPublish}>
          <Text style={styles.primaryBtnText}>Publish</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onSaveDraft}>
          <Text style={styles.secondaryBtnText}>Save draft</Text>
        </Pressable>
        <Pressable style={styles.dangerBtn} onPress={onDelete}>
          <Text style={styles.dangerBtnText}>
            {listingId ? 'Delete listing' : 'Cancel'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  hint: { color: colors.textMuted, marginBottom: spacing.sm, fontWeight: '600' },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  labelInline: { fontSize: 14, fontWeight: '700', color: colors.text },
  switchHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
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
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  terms: { minHeight: 180, fontSize: 13, lineHeight: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  chipText: { fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primary },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: 12,
  },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageWrap: { width: 88, height: 88, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  removeImg: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImgText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  addImg: {
    width: 88,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addImgText: { color: colors.primary, fontWeight: '700' },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontWeight: '800', fontSize: 12 },
  acceptText: { flex: 1, color: colors.text, fontWeight: '600' },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  dangerBtn: { marginTop: spacing.md, paddingVertical: 12, alignItems: 'center' },
  dangerBtnText: { color: '#EF4444', fontWeight: '700' },
});
