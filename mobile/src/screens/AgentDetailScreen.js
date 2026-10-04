import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import LoadingOverlay from '../components/LoadingOverlay';
import { colors, spacing, type } from '../constants/theme';

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={type.secondary}>{label}</Text>
      <Text style={type.body}>{value}</Text>
    </View>
  );
}

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

  const properties = agent?.properties || [];

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={type.heading}>{agent?.user?.name}</Text>
          <Text style={[type.secondary, styles.email]}>{agent?.user?.email}</Text>
          <InfoRow label="Agency" value={agent?.agencyName || 'Independent'} />
          <InfoRow label="Phone" value={agent?.phone || '—'} />
          <InfoRow label="Experience" value={`${agent?.yearsExperience ?? 0} yrs`} />
          <InfoRow
            label="Zones"
            value={(agent?.zones || []).map((z) => z.name).join(', ') || 'None'}
          />
          {!!agent?.bio && <InfoRow label="About" value={agent.bio} />}
        </Card>

        <Card>
          <Text style={type.heading}>Inventory ({properties.length})</Text>
          {properties.length === 0 && (
            <Text style={[type.secondary, styles.empty]}>No listings yet.</Text>
          )}
          {properties.map((p, index) => (
            <View key={p._id} style={[styles.listRow, index > 0 && styles.divider]}>
              <View style={styles.titleRow}>
                <Text style={[type.body, styles.listTitle]}>{p.title}</Text>
                <StatusBadge status={p.status} />
              </View>
              <Text style={[type.secondary, styles.rowLine]}>
                {p.type} · {p.listingType} · {p.zone?.name}
              </Text>
              <Text style={[type.body, styles.price]}>
                ₹{Number(p.price).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  email: { marginTop: 2 },
  infoRow: { marginTop: spacing.sm },
  empty: { marginTop: spacing.sm },
  listRow: { paddingVertical: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listTitle: { flex: 1, fontWeight: '600' },
  rowLine: { marginTop: spacing.xs },
  price: { marginTop: spacing.xs, fontWeight: '700' },
});
