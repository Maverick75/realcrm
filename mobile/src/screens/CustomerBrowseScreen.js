import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import LoadingOverlay from '../components/LoadingOverlay';
import ZonePicker from '../components/ZonePicker';
import { LISTING_TYPES, PROPERTY_TYPE_LABELS, PROPERTY_TYPES } from '../constants/config';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

function formatPrice(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function CustomerBrowseScreen({ navigation }) {
  const { logout, user } = useAuth();
  const [items, setItems] = useState([]);
  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState(null);
  const [listingType, setListingType] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = {};
      if (zoneId) params.zone = zoneId;
      if (listingType) params.listingType = listingType;
      if (type) params.type = type;
      const [listRes, zonesRes] = await Promise.all([
        api.get('/api/marketplace/listings', { params }),
        zones.length ? Promise.resolve({ data: zones }) : api.get('/api/zones'),
      ]);
      setItems(listRes.data || []);
      if (!zones.length) setZones(zonesRes.data || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not load listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [zoneId, listingType, type])
  );

  const Chip = ({ label, active, onPress }) => (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LoadingOverlay visible={loading} />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Find a home</Text>
          <Text style={styles.sub}>Hi {user?.name} · {items.length} available</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Listing</Text>
        <View style={styles.chipRow}>
          <Chip label="Any" active={!listingType} onPress={() => setListingType('')} />
          {LISTING_TYPES.map((t) => (
            <Chip
              key={t}
              label={t}
              active={listingType === t}
              onPress={() => setListingType(t)}
            />
          ))}
        </View>
        <Text style={styles.filterLabel}>Type</Text>
        <View style={styles.chipRow}>
          <Chip label="Any" active={!type} onPress={() => setType('')} />
          {PROPERTY_TYPES.map((t) => (
            <Chip
              key={t}
              label={PROPERTY_TYPE_LABELS[t] || t}
              active={type === t}
              onPress={() => setType(t)}
            />
          ))}
        </View>
        <Text style={styles.filterLabel}>Area</Text>
        <ZonePicker
          zones={zones}
          selectedIds={zoneId ? [zoneId] : []}
          onChange={(ids) => setZoneId(ids[0] || null)}
          multi={false}
          placeholder="Any area"
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No listings match</Text>
              <Text style={styles.emptyText}>Try clearing filters</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const thumb = item.images?.[0];
          return (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate('CustomerListingDetail', { listingId: item._id })
              }
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPh]}>
                  <Text style={styles.thumbPhText}>No photo</Text>
                </View>
              )}
              <View style={styles.main}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {PROPERTY_TYPE_LABELS[item.type] || item.type} · {item.listingType}
                  {item.bhk != null ? ` · ${item.bhk} BHK` : ''}
                </Text>
                <Text style={styles.zone}>{item.zone?.name || 'Hyderabad'}</Text>
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.textMuted, marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.dangerLight,
  },
  logoutText: { color: colors.danger, fontWeight: '700' },
  filters: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  filterLabel: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: '#fff' },
  list: { padding: spacing.lg, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  thumb: { width: 96, height: 96, borderRadius: 12 },
  thumbPh: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPhText: { fontSize: 10, color: colors.textMuted },
  main: { flex: 1 },
  cardTitle: { fontWeight: '800', color: colors.text, fontSize: 16 },
  meta: { marginTop: 4, color: colors.textMuted, fontSize: 13 },
  zone: { marginTop: 4, color: colors.primaryDark, fontWeight: '600' },
  price: { marginTop: 6, fontWeight: '800', fontSize: 17, color: colors.text },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyTitle: { fontWeight: '700', fontSize: 17, color: colors.text },
  emptyText: { marginTop: 6, color: colors.textMuted },
});
