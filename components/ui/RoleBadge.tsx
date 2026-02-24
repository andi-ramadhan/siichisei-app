import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import type { UserRole } from '@/lib/types';
import { StyleSheet, Text, View } from 'react-native';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

const roleConfig: Record<UserRole, { label: string; color: string; bg: string }> = {
  teacher: { label: 'Teacher', color: Colors.roleTeacher, bg: Colors.primaryFaded },
  admin: { label: 'Admin', color: Colors.roleAdmin, bg: Colors.accentFaded },
  student: { label: 'Student', color: Colors.roleStudent, bg: '#EEF2FF' },
};

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const config = roleConfig[role];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, size === 'md' ? styles.badgeMd : null]}>
      <Text style={[styles.text, { color: config.color }, size === 'md' ? styles.textMd : null]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  text: {
    ...Typography.small,
    fontWeight: '600',
  },
  textMd: {
    ...Typography.captionBold,
  },
});
