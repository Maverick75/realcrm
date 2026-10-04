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
import { colors, spacing } from '../constants/theme';

export default function CustomerEnquiriesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/api/marketplace/enquiries/mine');
      setItems(data || []);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not load enquiries');
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
      <Text style={styles.title}>My enquiries</Text>
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
              <Text style={styles.emptyTitle}>No enquiries yet</Text>
              <Text style={styles.emptyText}>Browse homes and send an enquiry</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              item.property?._id &&
              navigation.navigate('CustomerListingDetail', {
                listingId: item.property._id,
              })
            }
          >
            <View style={styles.row}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.property?.title || 'Property'}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.meta}>
              {item.property?.zone?.name || '—'} ·{' '}
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
            </Text>
            {!!item.message && (
              <Text style={styles.message} numberOfLines={3}>
                {item.message}
              </Text>
            )}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  list: { padding: spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 16 },
  meta: { marginTop: 6, color: colors.textMuted, fontSize: 12 },
  message: { marginTop: 8, color: colors.text, lineHeight: 20 },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyTitle: { fontWeight: '700', fontSize: 17, color: colors.text },
  emptyText: { marginTop: 6, color: colors.textMuted },
});
