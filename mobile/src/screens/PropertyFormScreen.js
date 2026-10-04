import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import ZonePicker from '../components/ZonePicker';
import {
  FACING_OPTIONS,
  LISTING_TYPES,
  PROPERTY_STATUSES,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  RESIDENCE_STYLES,
  VILLA_TYPES,
} from '../constants/config';
import { colors, spacing } from '../constants/theme';
import { sharePropertyOnWhatsApp } from '../utils/whatsappShare';
import { useAuth } from '../context/AuthContext';

export default function PropertyFormScreen({ navigation, route }) {
  const { mode = 'create', propertyId: initialId } = route.params || {};
  const { user } = useAuth();
  const [propertyId, setPropertyId] = useState(initialId || null);
  const [zones, setZones] = useState([]);
  const [property, setProperty] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Apartment');
  const [listingType, setListingType] = useState('Sale');
  const [residenceStyle, setResidenceStyle] = useState('');
  const [facing, setFacing] = useState('');
  const [carpetArea, setCarpetArea] = useState('');
  const [bhk, setBhk] = useState('');
  const [villaType, setVillaType] = useState('');
  const [plotSize, setPlotSize] = useState('');
  const [price, setPrice] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [zoneId, setZoneId] = useState(null);
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('Available');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState([]);
  const [caption, setCaption] = useState('');
  const [script, setScript] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [loading, setLoading] = useState(true);

  const hydrate = (data) => {
    setProperty(data);
    setPropertyId(data._id);
    setTitle(data.title || '');
    setType(data.type || 'Apartment');
    setListingType(data.listingType || 'Sale');
    setResidenceStyle(data.residenceStyle || '');
    setFacing(data.facing || '');
    setCarpetArea(data.carpetArea != null ? String(data.carpetArea) : '');
    setBhk(data.bhk != null ? String(data.bhk) : '');
    setVillaType(data.villaType || '');
    setPlotSize(data.plotSize || '');
    setPrice(data.price != null ? String(data.price) : '');
    setAreaSqft(data.areaSqft != null ? String(data.areaSqft) : '');
    setZoneId(data.zone?._id || data.zone);
    setAddress(data.address || '');
    setStatus(data.status || 'Available');
    setNotes(data.notes || '');
    setImages(data.images || []);
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
        if (mode === 'edit' && initialId) {
          const { data } = await api.get(`/api/properties/${initialId}`);
          hydrate(data);
        }
      } catch (err) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to load');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, initialId, navigation]);

  const buildPayload = () => ({
    title: title.trim(),
    type,
    listingType,
    residenceStyle: type === 'Apartment' || type === 'Villa' ? residenceStyle : '',
    facing: type === 'Apartment' || type === 'Plot' ? facing : '',
    carpetArea:
      type === 'Apartment' && carpetArea !== '' ? Number(carpetArea) : null,
    bhk: type === 'Apartment' && bhk !== '' ? Number(bhk) : null,
    villaType: type === 'Villa' ? villaType : '',
    plotSize: type === 'Plot' ? plotSize.trim() : '',
    price: Number(price),
    areaSqft:
      (type === 'Commercial' || type === 'Plot' || type === 'Villa') && areaSqft !== ''
        ? Number(areaSqft)
        : type === 'Apartment'
          ? carpetArea !== ''
            ? Number(carpetArea)
            : null
          : areaSqft === ''
            ? null
            : Number(areaSqft),
    zone: zoneId,
    address,
    status,
    notes,
  });

  const onSave = async () => {
    if (!title.trim() || !price || !zoneId) {
      Alert.alert('Validation', 'Title, price, and area (zone) are required.');
      return;
    }
    setLoading(true);
    const payload = buildPayload();
    try {
      if (propertyId) {
        const { data } = await api.put(`/api/properties/${propertyId}`, payload);
        hydrate(data);
        Alert.alert('Saved', 'Property updated');
      } else {
        const { data } = await api.post('/api/properties', payload);
        hydrate(data);
        navigation.setOptions({ title: 'Edit property' });
        navigation.replace('PropertyForm', { mode: 'edit', propertyId: data._id });
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadImages = async () => {
    if (!propertyId) {
      Alert.alert('Save first', 'Save the property before uploading photos.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 8,
    });
    if (result.canceled || !result.assets?.length) return;

    const form = new FormData();
    result.assets.forEach((asset, idx) => {
      form.append('images', {
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}-${idx}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
    });

    setLoading(true);
    try {
      const { data } = await api.post(`/api/properties/${propertyId}/images`, form, {
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
    if (!propertyId) return;
    setLoading(true);
    try {
      const { data } = await api.delete(`/api/properties/${propertyId}/images`, {
        data: { url },
      });
      hydrate(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not remove image');
    } finally {
      setLoading(false);
    }
  };

  const pickAndUploadVideo = async () => {
    if (!propertyId) {
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
      Alert.alert('Uploaded', 'Video clip attached.');
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
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Caption failed');
    } finally {
      setLoading(false);
    }
  };

  const publishReel = async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/api/properties/${propertyId}/publish-reel`, {
        caption,
      });
      hydrate(data.property || data);
      Alert.alert('Published', 'Reel sent to Instagram.');
    } catch (err) {
      Alert.alert('Publish failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const onWhatsApp = async () => {
    const snapshot = {
      ...property,
      title,
      type,
      listingType,
      bhk: bhk === '' ? null : Number(bhk),
      price: price === '' ? null : Number(price),
      address,
      notes,
      zone: zones.find((z) => z._id === zoneId) || property?.zone,
      images,
    };
    await sharePropertyOnWhatsApp(snapshot, agentPhone);
  };

  const onDelete = () => {
    if (!propertyId) {
      navigation.goBack();
      return;
    }
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

  const ChipRow = ({ options, value, onSelect, labels, allowClear = false }) => (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(allowClear && value === opt ? '' : opt)}
          style={[styles.chip, value === opt && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
            {labels?.[opt] || opt}
          </Text>
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

        <Text style={styles.label}>Property type</Text>
        <ChipRow
          options={PROPERTY_TYPES}
          value={type}
          onSelect={setType}
          labels={PROPERTY_TYPE_LABELS}
        />

        <Text style={styles.label}>Listing</Text>
        <ChipRow options={LISTING_TYPES} value={listingType} onSelect={setListingType} />

        {(type === 'Apartment' || type === 'Villa') && (
          <>
            <Text style={styles.label}>Gated / Independent</Text>
            <ChipRow
              options={RESIDENCE_STYLES}
              value={residenceStyle}
              onSelect={setResidenceStyle}
              allowClear
            />
          </>
        )}

        {type === 'Apartment' && (
          <>
            <Text style={styles.section}>Flat details</Text>
            <Text style={styles.label}>Facing</Text>
            <ChipRow
              options={FACING_OPTIONS}
              value={facing}
              onSelect={setFacing}
              allowClear
            />
            <Text style={styles.label}>Carpet area (sqft)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={carpetArea}
              onChangeText={setCarpetArea}
              placeholder="e.g. 1250"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.label}>BHK</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={bhk}
              onChangeText={setBhk}
              placeholder="e.g. 3"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        {type === 'Commercial' && (
          <>
            <Text style={styles.section}>Commercial details</Text>
            <Text style={styles.label}>Area (sqft)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={areaSqft}
              onChangeText={setAreaSqft}
              placeholder="e.g. 2400"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        {type === 'Villa' && (
          <>
            <Text style={styles.section}>Villa details</Text>
            <Text style={styles.label}>Villa type</Text>
            <ChipRow
              options={VILLA_TYPES}
              value={villaType}
              onSelect={setVillaType}
              allowClear
            />
            <Text style={styles.label}>Built-up area (sqft)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={areaSqft}
              onChangeText={setAreaSqft}
              placeholder="e.g. 3200"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        {type === 'Plot' && (
          <>
            <Text style={styles.section}>Plot details</Text>
            <Text style={styles.label}>Facing</Text>
            <ChipRow
              options={FACING_OPTIONS}
              value={facing}
              onSelect={setFacing}
              allowClear
            />
            <Text style={styles.label}>Size</Text>
            <TextInput
              style={styles.input}
              value={plotSize}
              onChangeText={setPlotSize}
              placeholder="e.g. 200 sq yards"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.label}>Area (sqft)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={areaSqft}
              onChangeText={setAreaSqft}
              placeholder="e.g. 1800"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        <Text style={styles.label}>Price (₹) *</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={styles.label}>Zone / Area *</Text>
        <ZonePicker
          zones={zones}
          selectedIds={zoneId ? [zoneId] : []}
          onChange={(ids) => setZoneId(ids[0] || null)}
          multi={false}
          placeholder="Select area"
        />

        <Text style={styles.label}>Status</Text>
        <ChipRow options={PROPERTY_STATUSES} value={status} onSelect={setStatus} />

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
        {!propertyId ? (
          <Text style={styles.hint}>Save the property first, then add photos.</Text>
        ) : null}

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
          <Text style={styles.buttonText}>
            {propertyId ? 'Update' : 'Add'} property
          </Text>
        </Pressable>

        {propertyId && (
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
