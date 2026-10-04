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
import LoadingOverlay from '../components/LoadingOverlay';
import { colors, spacing } from '../constants/theme';

export default function AgentsDirectoryScreen({ navigation }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/api/agents');
      setAgents(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not load agents');
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
        <Text style={styles.title}>Agents & dealers</Text>
        <Text style={styles.sub}>{agents.length} onboarded profiles</Text>
      </View>

      <FlatList
        data={agents}
        keyExtractor={(item) => item._id || item.user?._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No agents yet</Text>
              <Text style={styles.emptyText}>Agents appear after they register and onboard</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate('AgentDetail', { agentId: item.user?._id || item.user })
            }
          >
            <Text style={styles.name}>{item.user?.name || 'Agent'}</Text>
            <Text style={styles.agency}>{item.agencyName || 'Independent dealer'}</Text>
            <Text style={styles.zones}>
              {(item.zones || []).map((z) => z.name).join(', ') || 'No zones set'}
            </Text>
            <Text style={styles.meta}>
              {item.availableCount ?? 0} available · {item.inventoryCount ?? 0} total
              {item.onboardingComplete ? '' : ' · Incomplete onboarding'}
            </Text>
            {!!item.phone && <Text style={styles.phone}>{item.phone}</Text>}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.textMuted, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  agency: { marginTop: 4, color: colors.primaryDark, fontWeight: '600' },
  zones: { marginTop: 4, color: colors.textMuted },
  meta: { marginTop: 6, fontSize: 12, color: colors.textMuted },
  phone: { marginTop: 4, color: colors.text, fontWeight: '600' },
  empty: { marginTop: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { marginTop: 6, color: colors.textMuted, textAlign: 'center' },
});
