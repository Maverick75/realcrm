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
import api from '../api/client';
import LoadingOverlay from '../components/LoadingOverlay';
import { PROPERTY_TYPE_LABELS } from '../constants/config';
import { colors, spacing } from '../constants/theme';

function formatPrice(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function CustomerListingDetailScreen({ route, navigation }) {
  const { listingId } = route.params;
  const [listing, setListing] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/api/marketplace/listings/${listingId}`);
        setListing(data);
      } catch (err) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to load');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId, navigation]);

  const enquire = async () => {
    setSending(true);
    try {
      await api.post('/api/marketplace/enquiries', {
        property: listingId,
        message: message.trim() || 'I am interested in this property.',
      });
      Alert.alert('Enquiry sent', 'A publisher will follow up with you soon.', [
        {
          text: 'OK',
          onPress: () =>
            navigation.navigate('CustomerHome', { screen: 'CustomerEnquiriesTab' }),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not send enquiry');
    } finally {
      setSending(false);
    }
  };

  if (!listing && loading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay visible />
      </View>
    );
  }

  const images = listing?.images || [];

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading || sending} />
      <ScrollView contentContainerStyle={styles.content}>
        {images[0] ? (
          <Image source={{ uri: images[0] }} style={styles.hero} />
        ) : (
          <View style={[styles.hero, styles.heroPh]}>
            <Text style={styles.heroPhText}>No photo</Text>
          </View>
        )}
        <Text style={styles.title}>{listing?.title}</Text>
        <Text style={styles.price}>{formatPrice(listing?.price)}</Text>
        <Text style={styles.meta}>
          {PROPERTY_TYPE_LABELS[listing?.type] || listing?.type} · {listing?.listingType}
          {listing?.bhk != null ? ` · ${listing.bhk} BHK` : ''}
        </Text>
        <Text style={styles.zone}>{listing?.zone?.name || 'Hyderabad'}</Text>
        {!!listing?.address && <Text style={styles.line}>{listing.address}</Text>}
        {!!listing?.facing && <Text style={styles.line}>Facing: {listing.facing}</Text>}
        {!!listing?.villaType && <Text style={styles.line}>{listing.villaType}</Text>}
        {!!listing?.plotSize && <Text style={styles.line}>Size: {listing.plotSize}</Text>}
        {(listing?.carpetArea || listing?.areaSqft) && (
          <Text style={styles.line}>
            Area: {listing.carpetArea || listing.areaSqft} sqft
          </Text>
        )}
        {!!listing?.notes && <Text style={styles.notes}>{listing.notes}</Text>}

        <Text style={styles.section}>Enquire</Text>
        <Text style={styles.hint}>Tell the publisher what you need — we will connect you.</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="I would like a site visit this weekend…"
          placeholderTextColor={colors.textMuted}
        />
        <Pressable style={styles.button} onPress={enquire}>
          <Text style={styles.buttonText}>Send enquiry</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
  hero: { width: '100%', height: 220, backgroundColor: colors.border },
  heroPh: { alignItems: 'center', justifyContent: 'center' },
  heroPhText: { color: colors.textMuted, fontWeight: '600' },
  title: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  price: {
    paddingHorizontal: spacing.lg,
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  meta: { paddingHorizontal: spacing.lg, marginTop: 6, color: colors.textMuted },
  zone: {
    paddingHorizontal: spacing.lg,
    marginTop: 6,
    color: colors.primary,
    fontWeight: '700',
  },
  line: { paddingHorizontal: spacing.lg, marginTop: 4, color: colors.text },
  notes: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    color: colors.textMuted,
    lineHeight: 20,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  hint: {
    paddingHorizontal: spacing.lg,
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  input: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  button: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
