import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth } from '../context/AuthContext';
import { CARE_INTERACTION_TYPES } from '../constants/config';
import { colors, spacing } from '../constants/theme';
import { shareLeadRequestOnWhatsApp } from '../utils/whatsappShare';

function starsLabel(avg, count) {
  if (!count) return 'No ratings yet';
  return `★ ${Number(avg).toFixed(1)} · ${count} review${count === 1 ? '' : 's'}`;
}

export default function RequirementDetailScreen({ route }) {
  const { requirementId } = route.params;
  const { user } = useAuth();
  const [requirement, setRequirement] = useState(null);
  const [matches, setMatches] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [commissionPercent, setCommissionPercent] = useState('0');
  const [leadGenSharePercent, setLeadGenSharePercent] = useState('50');
  const [commissionNotes, setCommissionNotes] = useState('');
  const [buyerHappyNotes, setBuyerHappyNotes] = useState('');

  const [careType, setCareType] = useState('FollowUp');
  const [careNotes, setCareNotes] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const isAdmin = user?.role === 'admin';
  const uid = String(user?.id || user?._id || '');
  const canEditCommission =
    isAdmin ||
    String(requirement?.createdBy?._id || requirement?.createdBy) === uid ||
    String(requirement?.leadGenerator?._id || requirement?.leadGenerator) === uid;
  const canMatch = !!requirement; // access already enforced by API
  const servingAgentId =
    requirement?.assignedAgent?._id || requirement?.assignedAgent || null;

  const hydrateCommission = (data) => {
    setCommissionPercent(String(data.commissionPercent ?? 0));
    setLeadGenSharePercent(String(data.leadGenSharePercent ?? 50));
    setCommissionNotes(data.commissionNotes || '');
    setBuyerHappyNotes(data.buyerHappyNotes || '');
    if (data.nextFollowUpAt) {
      setNextFollowUpAt(String(data.nextFollowUpAt).slice(0, 10));
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const reqRes = await api.get(`/api/requirements/${requirementId}`);
      setRequirement(reqRes.data);
      hydrateCommission(reqRes.data);

      if (reqRes.data.customer?._id) {
        const intRes = await api
          .get(`/api/interactions/${reqRes.data.customer._id}`, {
            params: { requirement: requirementId },
          })
          .catch(() => ({ data: [] }));
        setInteractions(intRes.data || []);
      }

      if (canMatch || isAdmin || user?.role === 'agent') {
        const matchRes = await api.get(`/api/requirements/${requirementId}/matches`);
        setMatches(matchRes.data.matches || []);
        if (matchRes.data.requirement) {
          setRequirement(matchRes.data.requirement);
          hydrateCommission(matchRes.data.requirement);
        }
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [requirementId])
  );

  const assign = (agentId, agentName) => {
    Alert.alert('Assign to serve', `Connect this buyer to ${agentName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Assign',
        onPress: async () => {
          setBusy(true);
          try {
            const { data } = await api.post(`/api/requirements/${requirementId}/assign`, {
              agentId,
            });
            setRequirement(data);
            Alert.alert('Assigned', `${agentName} will serve this buyer.`);
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Assign failed');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const saveCommission = async () => {
    setBusy(true);
    try {
      const { data } = await api.put(`/api/requirements/${requirementId}`, {
        commissionPercent: Number(commissionPercent) || 0,
        leadGenSharePercent: Number(leadGenSharePercent) || 0,
        commissionNotes,
        buyerHappyNotes,
        nextFollowUpAt: nextFollowUpAt || null,
      });
      setRequirement(data);
      hydrateCommission(data);
      Alert.alert('Saved', 'Commission split and care notes updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const addCareFollowUp = async () => {
    if (!requirement?.customer?._id) return;
    if (!careNotes.trim()) {
      Alert.alert('Notes', 'Add a short note about how you helped the buyer.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        customer: requirement.customer._id,
        requirement: requirementId,
        type: careType,
        notes: careNotes.trim(),
        nextFollowUpAt: nextFollowUpAt || null,
      };
      const { data } = await api.post('/api/interactions', payload);
      setInteractions((prev) => [data, ...prev]);
      setCareNotes('');
      if (nextFollowUpAt || buyerHappyNotes) {
        const { data: reqData } = await api.put(`/api/requirements/${requirementId}`, {
          nextFollowUpAt: nextFollowUpAt || null,
          buyerHappyNotes,
        });
        setRequirement(reqData);
      }
      Alert.alert('Logged', 'Buyer-care follow-up saved.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not log follow-up');
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!servingAgentId) return;
    setBusy(true);
    try {
      await api.post(`/api/agents/${servingAgentId}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim(),
        requirement: requirementId,
      });
      Alert.alert('Thank you', 'Your rating helps the community pick great agents.');
      setReviewComment('');
      await load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Review failed');
    } finally {
      setBusy(false);
    }
  };

  const markClosed = async () => {
    setBusy(true);
    try {
      const { data } = await api.put(`/api/requirements/${requirementId}`, {
        status: 'Closed',
      });
      setRequirement(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const servingShare = Math.max(
    0,
    100 - (Number(leadGenSharePercent) || 0)
  );

  if (!requirement && loading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay visible />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading || busy} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>{requirement?.customer?.name}</Text>
            <StatusBadge status={requirement?.status} />
          </View>
          <Text style={styles.meta}>
            {requirement?.customer?.phone || 'No phone'} ·{' '}
            {requirement?.customer?.email || 'No email'}
          </Text>
          <Text style={styles.line}>
            Looking for {requirement?.propertyType} · {requirement?.listingType}
          </Text>
          <Text style={styles.line}>
            BHK {requirement?.bhkMin ?? '—'}–{requirement?.bhkMax ?? '—'}
          </Text>
          <Text style={styles.line}>
            Budget ₹{(requirement?.budgetMin || 0).toLocaleString('en-IN')}
            {requirement?.budgetMax != null
              ? ` – ₹${Number(requirement.budgetMax).toLocaleString('en-IN')}`
              : '+'}
          </Text>
          <Text style={styles.zones}>
            Zones:{' '}
            {(requirement?.preferredZones || []).map((z) => z.name).join(', ') || 'Any'}
          </Text>
          {requirement?.leadGenerator && (
            <Text style={styles.assigned}>
              Lead generator: {requirement.leadGenerator.name}
            </Text>
          )}
          {requirement?.assignedAgent && (
            <Text style={styles.assigned}>
              Serving agent: {requirement.assignedAgent.name} (
              {requirement.assignedAgent.email})
            </Text>
          )}
          {!!requirement?.notes && <Text style={styles.notes}>{requirement.notes}</Text>}
        </View>

        {canEditCommission && (
          <View style={styles.card}>
            <Text style={styles.sectionInline}>Commission split</Text>
            <Text style={styles.hint}>
              Total brokerage on the deal, then how much goes to the lead generator vs serving
              agent.
            </Text>
            <View style={styles.row2}>
              <View style={styles.half}>
                <Text style={styles.label}>Total %</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={commissionPercent}
                  onChangeText={setCommissionPercent}
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Lead-gen share %</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={leadGenSharePercent}
                  onChangeText={setLeadGenSharePercent}
                />
              </View>
            </View>
            <Text style={styles.computed}>
              Serving agent share: {servingShare}% of commission
              {Number(commissionPercent) > 0
                ? ` (${((Number(commissionPercent) * servingShare) / 100).toFixed(2)} pts of deal)`
                : ''}
            </Text>
            <Text style={styles.label}>Commission notes</Text>
            <TextInput
              style={styles.input}
              value={commissionNotes}
              onChangeText={setCommissionNotes}
              placeholder="e.g. Shared intro, site visits by serving agent"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.label}>Buyer-happy notes</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={buyerHappyNotes}
              onChangeText={setBuyerHappyNotes}
              multiline
              placeholder="What would make this buyer feel cared for?"
              placeholderTextColor={colors.textMuted}
            />
            <Pressable style={styles.secondaryBtn} onPress={saveCommission}>
              <Text style={styles.secondaryBtnText}>Save commission & care notes</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.section}>Buyer care follow-ups</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>
            Community service mindset — check in, listen, and keep the buyer happy.
          </Text>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {CARE_INTERACTION_TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setCareType(t)}
                style={[styles.chip, careType === t && styles.chipActive]}
              >
                <Text style={[styles.chipText, careType === t && styles.chipTextActive]}>
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={careNotes}
            onChangeText={setCareNotes}
            multiline
            placeholder="What did you do for the buyer today?"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Next follow-up (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={nextFollowUpAt}
            onChangeText={setNextFollowUpAt}
            placeholder="2026-10-10"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable style={styles.primaryBtn} onPress={addCareFollowUp}>
            <Text style={styles.primaryBtnText}>Log follow-up</Text>
          </Pressable>
          {interactions.map((item) => (
            <View key={item._id} style={styles.activity}>
              <Text style={styles.activityType}>
                {item.type} · {item.createdBy?.name || 'You'}
              </Text>
              <Text style={styles.activityNotes}>{item.notes}</Text>
              {item.nextFollowUpAt ? (
                <Text style={styles.activityMeta}>
                  Next: {String(item.nextFollowUpAt).slice(0, 10)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <Text style={styles.section}>Matched agents</Text>
        {matches.length === 0 ? (
          <Text style={styles.empty}>
            No strong matches yet. Ask agents to complete onboarding and add inventory.
          </Text>
        ) : (
          matches.map((m) => (
            <View key={m.agent.id} style={styles.matchCard}>
              <View style={styles.row}>
                <Text style={styles.matchName}>{m.agent.name}</Text>
                <Text style={styles.score}>{m.score}</Text>
              </View>
              <Text style={styles.agency}>{m.agent.agencyName || 'Independent'}</Text>
              <Text style={styles.rating}>
                {starsLabel(m.agent.ratingAvg, m.agent.ratingCount)}
                {m.agent.yearsExperience
                  ? ` · ${m.agent.yearsExperience} yrs`
                  : ''}
              </Text>
              <Text style={styles.matchMeta}>
                {(m.agent.zones || []).map((z) => z.name).join(', ') || 'No zones'}
              </Text>
              <Text style={styles.matchMeta}>
                {m.matchingPropertyCount} matching · {m.inventoryCount} total listings
              </Text>
              <View style={styles.reasons}>
                {(m.reasons || []).map((r) => (
                  <View key={r} style={styles.reasonChip}>
                    <Text style={styles.reasonText}>{r}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={styles.assignBtn}
                onPress={() => assign(m.agent.id, m.agent.name)}
              >
                <Text style={styles.assignText}>Assign to serve</Text>
              </Pressable>
              <Pressable
                style={styles.shareBtn}
                onPress={() => shareLeadRequestOnWhatsApp(requirement, m.agent)}
              >
                <Text style={styles.shareText}>Share request on WhatsApp</Text>
              </Pressable>
            </View>
          ))
        )}

        {servingAgentId && canEditCommission && (
          <View style={styles.card}>
            <Text style={styles.sectionInline}>Rate serving agent</Text>
            <Text style={styles.hint}>Help the community recognize great buyer care.</Text>
            <View style={styles.chipRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setReviewRating(n)}
                  style={[styles.chip, reviewRating === n && styles.chipActive]}
                >
                  <Text style={[styles.chipText, reviewRating === n && styles.chipTextActive]}>
                    {n}★
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              placeholder="Optional comment"
              placeholderTextColor={colors.textMuted}
            />
            <Pressable style={styles.secondaryBtn} onPress={submitReview}>
              <Text style={styles.secondaryBtnText}>Submit rating</Text>
            </Pressable>
            {requirement?.status !== 'Closed' && (
              <Pressable style={styles.dangerBtn} onPress={markClosed}>
                <Text style={styles.dangerText}>Mark lead closed</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row2: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  name: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text, marginRight: 8 },
  meta: { marginTop: 6, color: colors.textMuted },
  line: { marginTop: 4, color: colors.text },
  zones: { marginTop: 8, color: colors.primaryDark, fontWeight: '600' },
  assigned: { marginTop: 8, color: colors.text, fontWeight: '700' },
  notes: { marginTop: 10, color: colors.textMuted, lineHeight: 20 },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  sectionInline: { fontSize: 16, fontWeight: '800', color: colors.text },
  hint: { marginTop: 4, marginBottom: 8, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  computed: { marginTop: 8, color: colors.primaryDark, fontWeight: '700' },
  empty: { color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  matchName: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  score: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    minWidth: 36,
    textAlign: 'right',
  },
  agency: { marginTop: 4, color: colors.primaryDark, fontWeight: '600' },
  rating: { marginTop: 2, color: colors.text, fontWeight: '600', fontSize: 13 },
  matchMeta: { marginTop: 2, color: colors.textMuted, fontSize: 13 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  reasonChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  reasonText: { color: colors.primaryDark, fontSize: 11, fontWeight: '600' },
  assignBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  assignText: { color: '#fff', fontWeight: '700' },
  shareBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  shareText: { color: colors.text, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
    marginRight: 6,
    marginBottom: 6,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  chipText: { fontWeight: '600', color: colors.textMuted, fontSize: 12 },
  chipTextActive: { color: colors.primary },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.text, fontWeight: '700' },
  dangerBtn: { marginTop: spacing.md, paddingVertical: 10, alignItems: 'center' },
  dangerText: { color: '#EF4444', fontWeight: '700' },
  activity: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activityType: { fontWeight: '700', color: colors.text },
  activityNotes: { marginTop: 4, color: colors.textMuted },
  activityMeta: { marginTop: 2, fontSize: 12, color: colors.primaryDark },
});
