import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { VOCAL_TYPES, type VocalType } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const { profile, signOut, updateProfile, isLoading } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [vocalType, setVocalType] = useState<VocalType | null>(profile?.vocal_type ?? null);
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const displayLabel = vocalType
    ? `${profile.display_name} - ${vocalType}`
    : profile.display_name;

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }
    setSaving(true);
    const { error } = await updateProfile({
      display_name: displayName.trim(),
      full_name: fullName.trim() || null,
      vocal_type: vocalType,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(profile.display_name);
    setFullName(profile.full_name ?? '');
    setVocalType(profile.vocal_type ?? null);
    setIsEditing(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.avatarSection}>
          <Avatar name={profile.display_name} imageUrl={profile.avatar_url} size={80} />
          <Text style={styles.name}>{displayLabel}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <RoleBadge role={profile.role} size="md" />
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Profile Info</Text>
          {!isEditing ? (
            <Pressable
              onPress={() => setIsEditing(true)}
              style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="pencil" size={16} color={Colors.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <Input
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              autoCapitalize="words"
            />
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name (optional)"
              autoCapitalize="words"
            />

            <View style={styles.vocalSection}>
              <Text style={styles.vocalLabel}>Vocal Type</Text>
              <View style={styles.vocalGrid}>
                {VOCAL_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setVocalType(vocalType === type ? null : type)}
                    style={({ pressed }) => [
                      styles.vocalChip,
                      vocalType === type ? styles.vocalChipActive : null,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.vocalChipText,
                        vocalType === type ? styles.vocalChipTextActive : null,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.editActions}>
              <Button title="Cancel" onPress={handleCancel} variant="ghost" />
              <Button title="Save" onPress={handleSave} loading={saving} />
            </View>
          </View>
        ) : (
          <View style={styles.infoRows}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Display Name</Text>
              <Text style={styles.infoValue}>{profile.display_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{profile.full_name ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vocal Type</Text>
              <Text style={styles.infoValue}>{profile.vocal_type ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {new Date(profile.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.signOutSection}>
        <Button
          title="Sign Out"
          onPress={signOut}
          variant="danger"
          loading={isLoading}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    ...Shadows.sm,
    marginBottom: Spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.h2,
    color: Colors.text,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  email: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.sm,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: Spacing.xs,
  },
  editBtnText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  editForm: {
    gap: Spacing.lg,
  },
  vocalSection: {
    gap: Spacing.sm,
  },
  vocalLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vocalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  vocalChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  vocalChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentFaded,
  },
  vocalChipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  vocalChipTextActive: {
    color: Colors.accentDark,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  infoRows: {
    gap: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  infoValue: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  signOutSection: {
    marginTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
});
