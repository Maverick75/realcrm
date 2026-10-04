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
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Fab from '../components/Fab';
import ScreenHeader from '../components/ScreenHeader';
import StatusBadge from '../components/StatusBadge';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth } from '../context/AuthContext';
import { PROPERTY_TYPE_LABELS } from '../constants/config';
import { colors, radius, shadow, spacing, TOUCH_TARGET, type } from '../constants/theme';

const THUMB = 76;
const OPTION_MIN_HEIGHT = 56;

function formatPrice(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function ChooserOption({ icon, title, hint, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
    >
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={type.secondary}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
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
      <ScreenHeader
        title="My posts"
        subtitle={`${user?.name} · Agent ${counts.agent} · Owner ${counts.owner}`}
        right={
          <Pressable
            onPress={logout}
            accessibilityRole="button"
            accessibilityLabel="Log out"
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
          </Pressable>
        }
      />

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.postAs}-${item._id}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="home-outline"
              title="No posts yet"
              hint="Post as Agent (inventory) or as Owner (with T&Cs)"
            />
          ) : null
        }
        renderItem={({ item }) => {
          const thumb = item.images?.[0];
          const isOwner = item.postAs === 'owner';
          return (
            <Card
              style={styles.card}
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
                  <Ionicons name="image-outline" size={24} color={colors.primary} />
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
                  <View style={styles.modeBadge}>
                    <Text style={[styles.modeBadgeText, isOwner && styles.ownerBadgeText]}>
                      {isOwner ? 'Owner' : 'Agent'}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {PROPERTY_TYPE_LABELS[item.type] || item.type} · {item.listingType}
                  </Text>
                </View>
                <Text style={styles.zone}>{item.zone?.name || 'No area'}</Text>
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
              </View>
            </Card>
          );
        }}
      />

      {chooserOpen && (
        <Card style={styles.chooser}>
          <Text style={styles.chooserTitle}>Post property as</Text>
          <ChooserOption
            icon="briefcase-outline"
            title="Agent inventory"
            hint="Matchable stock, Instagram, WhatsApp"
            onPress={() => {
              setChooserOpen(false);
              navigation.navigate('PropertyForm', { mode: 'create' });
            }}
          />
          <ChooserOption
            icon="home-outline"
            title="Property owner"
            hint="T&Cs accept + publish to marketplace"
            onPress={() => {
              setChooserOpen(false);
              navigation.navigate('OwnerListingForm', { mode: 'create' });
            }}
          />
          <Button variant="text" title="Cancel" onPress={() => setChooserOpen(false)} />
        </Card>
      )}

      <Fab onPress={() => setChooserOpen(true)} label="Post a property" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  logoutBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutPressed: { backgroundColor: colors.primaryLight },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 104 },
  card: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.control },
  thumbPh: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { ...type.body, flex: 1, fontWeight: '700' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  modeBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight,
  },
  modeBadgeText: { ...type.caption, color: colors.primary },
  ownerBadgeText: { color: colors.accent },
  meta: { ...type.secondary, flex: 1 },
  zone: { ...type.secondary, marginTop: spacing.xs },
  price: { ...type.body, marginTop: spacing.xs, fontWeight: '700' },
  chooser: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 96,
    marginBottom: 0,
    ...shadow.raised,
  },
  chooserTitle: { ...type.heading, marginBottom: spacing.sm },
  option: {
    minHeight: OPTION_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.control,
  },
  optionPressed: { backgroundColor: colors.primaryLight },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: { ...type.body, fontWeight: '600' },
});
