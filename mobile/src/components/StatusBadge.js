import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STATUS_COLORS } from '../constants/config';

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#64748B';
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
