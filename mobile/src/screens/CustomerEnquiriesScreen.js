import React, { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import StatusBadge from '../components/StatusBadge';
import LoadingOverlay from '../components/LoadingOverlay';
import { colors, spacing, type } from '../constants/theme';

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
      <ScreenHeader title="My enquiries" />
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
              icon="chatbubbles-outline"
              title="No enquiries yet"
              hint="Browse homes and send an enquiry"
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card
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
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { ...type.body, flex: 1, fontWeight: '700' },
  meta: { ...type.secondary, marginTop: spacing.sm },
  message: { ...type.secondary, marginTop: spacing.sm, color: colors.text },
});
