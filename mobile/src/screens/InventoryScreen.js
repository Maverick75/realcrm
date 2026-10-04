import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { colors, spacing } from '../constants/theme';
import { sharePropertyOnWhatsApp } from '../utils/whatsappShare';

function formatPrice(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function InventoryScreen({ navigation }) {
  const { logout, user } = useAuth();
  const [items, setItems] = useState([]);
  const [agentPhone, setAgentPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [propsRes, meRes] = await Promise.all([
        api.get('/api/properties'),
        api.get('/api/agents/me').catch(() => ({ data: {} })),
      ]);
      setItems(propsRes.data);
      setAgentPhone(meRes.data.phone || '');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not load inventory');
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LoadingOverlay visible={loading} />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My inventory</Text>
          <Text style={styles.sub}>{user?.name} · {items.length} listings</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
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
              <Text style={styles.emptyTitle}>No properties yet</Text>
              <Text style={styles.emptyText}>Add inventory so admins can match you to buyers</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              onPress={() =>
                navigation.navigate('PropertyForm', { mode: 'edit', propertyId: item._id })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.meta}>
                {item.type} · {item.listingType}
                {item.bhk != null ? ` · ${item.bhk} BHK` : ''}
              </Text>
              <Text style={styles.zone}>{item.zone?.name || 'No zone'}</Text>
              <Text style={styles.price}>{formatPrice(item.price)}</Text>
            </Pressable>
            <Pressable
              style={styles.shareBtn}
              onPress={() => sharePropertyOnWhatsApp(item, agentPhone)}
            >
              <Text style={styles.shareText}>WhatsApp</Text>
            </Pressable>
          </View>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('PropertyForm', { mode: 'create' })}
      >
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, marginRight: 8 },
  meta: { marginTop: 6, color: colors.textMuted, fontSize: 13 },
  zone: { marginTop: 4, color: colors.primaryDark, fontWeight: '600' },
  price: { marginTop: 6, fontWeight: '800', color: colors.text, fontSize: 16 },
  shareBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#DCF8C6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareText: { color: '#075E54', fontWeight: '700', fontSize: 13 },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { marginTop: 6, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 24 },
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
});
