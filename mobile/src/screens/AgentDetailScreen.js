import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingOverlay from '../components/LoadingOverlay';
import { colors, spacing } from '../constants/theme';

export default function AgentDetailScreen({ route }) {
  const { agentId } = route.params;
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        try {
          const { data } = await api.get(`/api/agents/${agentId}`);
          setAgent(data);
        } catch (err) {
          Alert.alert('Error', err.response?.data?.message || 'Failed to load agent');
        } finally {
          setLoading(false);
        }
      })();
    }, [agentId])
  );

  if (!agent && loading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay visible />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{agent?.user?.name}</Text>
        <Text style={styles.email}>{agent?.user?.email}</Text>
        <Text style={styles.agency}>{agent?.agencyName || 'Independent'}</Text>
        <Text style={styles.line}>Phone: {agent?.phone || '—'}</Text>
        <Text style={styles.line}>Experience: {agent?.yearsExperience ?? 0} yrs</Text>
        <Text style={styles.zones}>
          Zones: {(agent?.zones || []).map((z) => z.name).join(', ') || 'None'}
        </Text>
        {!!agent?.bio && <Text style={styles.bio}>{agent.bio}</Text>}

        <Text style={styles.section}>Inventory ({agent?.properties?.length || 0})</Text>
        {(agent?.properties || []).map((p) => (
          <View key={p._id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.cardTitle}>{p.title}</Text>
              <StatusBadge status={p.status} />
            </View>
            <Text style={styles.meta}>
              {p.type} · {p.listingType} · {p.zone?.name}
            </Text>
            <Text style={styles.price}>₹{Number(p.price).toLocaleString('en-IN')}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  email: { color: colors.textMuted, marginTop: 2 },
  agency: { marginTop: 8, color: colors.primaryDark, fontWeight: '700' },
  line: { marginTop: 4, color: colors.text },
  zones: { marginTop: 8, color: colors.text, fontWeight: '600' },
  bio: { marginTop: 10, color: colors.textMuted, lineHeight: 20 },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flex: 1, fontWeight: '700', color: colors.text, marginRight: 8 },
  meta: { marginTop: 4, color: colors.textMuted, fontSize: 13 },
  price: { marginTop: 4, fontWeight: '800', color: colors.text },
});
