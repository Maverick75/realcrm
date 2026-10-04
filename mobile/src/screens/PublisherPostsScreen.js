import React, { useCallback, useMemo, useState } from 'react';
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
import StatusBadge from '../components/StatusBadge';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth } from '../context/AuthContext';
import { PROPERTY_TYPE_LABELS, STATUS_COLORS } from '../constants/config';
import { colors, spacing } from '../constants/theme';

function formatPrice(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function PublisherPostsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [invRes, ownRes] = await Promise.all([
        api.get('/api/properties').catch(() => ({ data: [] })),
        api.get('/api/listings/mine').catch(() => ({ data: [] })),
      ]);
      const inventory = (invRes.data || []).map((p) => ({
        ...p,
        postAs: 'agent',
      }));
      const owned = (ownRes.data || []).map((p) => ({
        ...p,
        postAs: 'owner',
      }));
      const merged = [...inventory, ...owned].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setItems(merged);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const counts = useMemo(() => {
    return {
      agent: items.filter((i) => i.postAs === 'agent').length,
      owner: items.filter((i) => i.postAs === 'owner').length,
    };
  }, [items]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LoadingOverlay visible={loading} />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My posts</Text>
          <Text style={styles.sub}>
            {user?.name} · Agent {counts.agent} · Owner {counts.owner}
          </Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.postAs}-${item._id}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>
                Post as Agent (inventory) or as Owner (with T&Cs)
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const thumb = item.images?.[0];
          const accent = STATUS_COLORS[item.status] || colors.border;
          return (
            <Pressable
              style={[styles.card, { borderLeftColor: accent }]}
              onPress={() => {
                if (item.postAs === 'owner') {
                  navigation.navigate('OwnerListingForm', {
                    mode: 'edit',
                    listingId: item._id,
                  });
                } else {
                  navigation.navigate('PropertyForm', {
                    mode: 'edit',
                    propertyId: item._id,
                  });
                }
              }}
            >
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPh]}>
                  <Text style={styles.thumbPhText}>No photo</Text>
                </View>
              )}
              <View style={styles.main}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <StatusBadge status={item.status} />
                </View>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.modeBadge,
                      item.postAs === 'owner' ? styles.ownerBadge : styles.agentBadge,
                    ]}
                  >
                    <Text style={styles.modeBadgeText}>
                      {item.postAs === 'owner' ? 'Owner' : 'Agent'}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {PROPERTY_TYPE_LABELS[item.type] || item.type} · {item.listingType}
                  </Text>
                </View>
                <Text style={styles.zone}>{item.zone?.name || 'No area'}</Text>
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      {chooserOpen && (
        <View style={styles.chooser}>
          <Text style={styles.chooserTitle}>Post property as</Text>
          <Pressable
            style={styles.chooserBtn}
            onPress={() => {
              setChooserOpen(false);
              navigation.navigate('PropertyForm', { mode: 'create' });
            }}
          >
            <Text style={styles.chooserBtnText}>Agent inventory</Text>
            <Text style={styles.chooserHint}>Matchable stock, Instagram, WhatsApp</Text>
          </Pressable>
          <Pressable
            style={styles.chooserBtn}
            onPress={() => {
              setChooserOpen(false);
              navigation.navigate('OwnerListingForm', { mode: 'create' });
            }}
          >
            <Text style={styles.chooserBtnText}>Property owner</Text>
            <Text style={styles.chooserHint}>T&Cs accept + publish to marketplace</Text>
          </Pressable>
          <Pressable onPress={() => setChooserOpen(false)}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.fab} onPress={() => setChooserOpen(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    gap: 12,
  },
  thumb: { width: 76, height: 76, borderRadius: 10 },
  thumbPh: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPhText: { fontSize: 10, color: colors.textMuted },
  main: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  modeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  agentBadge: { backgroundColor: colors.primaryLight },
  ownerBadge: { backgroundColor: '#EDE9FE' },
  modeBadgeText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  meta: { color: colors.textMuted, fontSize: 12, flex: 1 },
  zone: { marginTop: 4, color: colors.primaryDark, fontWeight: '600' },
  price: { marginTop: 4, fontWeight: '800', color: colors.text },
  empty: { marginTop: 60, alignItems: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { marginTop: 6, color: colors.textMuted, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
  chooser: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 100,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 6,
  },
  chooserTitle: { fontWeight: '800', fontSize: 16, color: colors.text, marginBottom: 12 },
  chooserBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: 10,
    backgroundColor: colors.background,
  },
  chooserBtnText: { fontWeight: '800', color: colors.text },
  chooserHint: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
  cancel: { textAlign: 'center', color: colors.textMuted, fontWeight: '700', marginTop: 4 },
});
