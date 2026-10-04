import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, spacing } from '../constants/theme';

/**
 * Combo-style zone dropdown (search + pick).
 * multi=true → Areas served / preferred zones
 * multi=false → single zone (property / listing)
 */
export default function ZonePicker({
  zones = [],
  selectedIds = [],
  onChange,
  multi = true,
  placeholder = 'Select area(s)',
  label,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const selectedZones = useMemo(
    () => zones.filter((z) => selectedSet.has(String(z._id))),
    [zones, selectedSet]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(
      (z) =>
        z.name?.toLowerCase().includes(q) ||
        z.city?.toLowerCase().includes(q) ||
        z.slug?.toLowerCase().includes(q)
    );
  }, [zones, query]);

  const summary = (() => {
    if (!selectedZones.length) return placeholder;
    if (!multi) return selectedZones[0].name;
    if (selectedZones.length <= 2) return selectedZones.map((z) => z.name).join(', ');
    return `${selectedZones[0].name}, ${selectedZones[1].name} +${selectedZones.length - 2}`;
  })();

  const toggle = (id) => {
    const sid = String(id);
    if (!multi) {
      onChange([id]);
      setOpen(false);
      setQuery('');
      return;
    }
    if (selectedSet.has(sid)) {
      onChange(selectedIds.filter((x) => String(x) !== sid));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const clearAll = () => onChange([]);

  return (
    <View>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <Pressable
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[styles.triggerText, !selectedZones.length && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {summary}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {multi && selectedZones.length > 0 ? (
        <View style={styles.selectedRow}>
          {selectedZones.map((z) => (
            <Pressable
              key={z._id}
              style={styles.selectedChip}
              onPress={() => toggle(z._id)}
            >
              <Text style={styles.selectedChipText}>{z.name} ×</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {multi ? 'Areas served' : 'Select area'}
              </Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search areas…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {multi ? (
              <View style={styles.actions}>
                <Text style={styles.count}>{selectedIds.length} selected</Text>
                {selectedIds.length > 0 ? (
                  <Pressable onPress={clearAll}>
                    <Text style={styles.clear}>Clear all</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item._id)}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>No areas match your search</Text>
              }
              renderItem={({ item }) => {
                const active = selectedSet.has(String(item._id));
                return (
                  <Pressable
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => toggle(item._id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionName, active && styles.optionNameActive]}>
                        {item.name}
                      </Text>
                      {item.city ? (
                        <Text style={styles.optionCity}>{item.city}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.check}>{active ? (multi ? '✓' : '●') : ''}</Text>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** @deprecated alias — use ZonePicker; kept so existing screens keep working */
export function ZoneChipsWrap({ zones, selectedIds, onChange, multi = true, placeholder }) {
  return (
    <ZonePicker
      zones={zones}
      selectedIds={selectedIds}
      onChange={onChange}
      multi={multi}
      placeholder={placeholder || (multi ? 'Select areas served' : 'Select area')}
    />
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  trigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerOpen: {
    borderColor: colors.primary,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  triggerPlaceholder: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 8,
    color: colors.textMuted,
    fontSize: 16,
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  selectedChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  selectedChipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '75%',
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  done: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  search: {
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  count: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  clear: { color: colors.danger || '#EF4444', fontSize: 12, fontWeight: '700' },
  list: { marginTop: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionActive: {
    backgroundColor: colors.primary + '12',
  },
  optionName: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionNameActive: { color: colors.primaryDark },
  optionCity: { marginTop: 2, fontSize: 12, color: colors.textMuted },
  check: {
    minWidth: 22,
    textAlign: 'right',
    color: colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    padding: spacing.lg,
  },
});
