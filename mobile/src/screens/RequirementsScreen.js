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

function formatBudget(min, max) {
  const fmt = (n) => (n == null ? null : `₹${Number(n).toLocaleString('en-IN')}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return 'Budget open';
}

export default function RequirementsScreen({ navigation }) {
  const { logout, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/api/requirements');
      setItems(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not load requirements');
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
          <Text style={styles.title}>
            {user?.role === 'admin' ? 'Buyer requirements' : 'My leads'}
          </Text>
          <Text style={styles.sub}>Capture needs · match · keep buyers happy</Text>
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
              <Text style={styles.emptyTitle}>No requirements yet</Text>
              <Text style={styles.emptyText}>Capture a buyer need to find matching agents</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('RequirementDetail', { requirementId: item._id })}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.customer?.name || 'Buyer'}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.meta}>
              {item.propertyType} · {item.listingType}
              {item.bhkMin || item.bhkMax
                ? ` · ${item.bhkMin || '?'}–${item.bhkMax || '?'} BHK`
                : ''}
            </Text>
            <Text style={styles.zones}>
              {(item.preferredZones || []).map((z) => z.name).join(', ') || 'Any zone'}
            </Text>
            <Text style={styles.budget}>{formatBudget(item.budgetMin, item.budgetMax)}</Text>
            {item.assignedAgent && (
              <Text style={styles.assigned}>Agent: {item.assignedAgent.name}</Text>
            )}
          </Pressable>
        )}
      />

      {(user?.role === 'admin' ||
        user?.role === 'agent' ||
        user?.role === 'publisher' ||
        user?.role === 'owner') && (
        <Pressable
          style={styles.fab}
          onPress={() => navigation.navigate('RequirementForm')}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      )}
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
  zones: { marginTop: 4, color: colors.primaryDark, fontWeight: '600' },
  budget: { marginTop: 6, fontWeight: '700', color: colors.text },
  assigned: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
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
