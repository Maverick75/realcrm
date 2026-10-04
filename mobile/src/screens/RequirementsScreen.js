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
import { Ionicons } from '@expo/vector-icons';
import api from '../api/client';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Fab from '../components/Fab';
import ScreenHeader from '../components/ScreenHeader';
import StatusBadge from '../components/StatusBadge';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, TOUCH_TARGET, type } from '../constants/theme';

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
      <ScreenHeader
        title={user?.role === 'admin' ? 'Buyer requirements' : 'My leads'}
        subtitle="Capture needs · match · keep buyers happy"
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
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="clipboard-outline"
              title="No requirements yet"
              hint="Capture a buyer need to find matching agents"
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => navigation.navigate('RequirementDetail', { requirementId: item._id })}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.customer?.name || 'Buyer'}
              </Text>
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
          </Card>
        )}
      />

      {(user?.role === 'admin' ||
        user?.role === 'agent' ||
        user?.role === 'publisher' ||
        user?.role === 'owner') && (
        <Fab
          onPress={() => navigation.navigate('RequirementForm')}
          label="Add buyer requirement"
        />
      )}
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: { ...type.body, flex: 1, fontWeight: '700' },
  meta: { ...type.secondary, marginTop: spacing.sm },
  zones: { ...type.secondary, marginTop: spacing.xs },
  budget: { ...type.body, marginTop: spacing.sm, fontWeight: '700' },
  assigned: { ...type.secondary, marginTop: spacing.xs },
});
