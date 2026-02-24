import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Classroom } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClassroomsScreen() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin';

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('classroom_members')
      .select('classroom_id, classrooms(*)')
      .eq('user_id', profile?.id ?? '');

    if (!error && data) {
      const rooms = data
        .map((m: any) => m.classrooms)
        .filter(Boolean) as Classroom[];
      setClassrooms(rooms);
    }
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    const { data, error } = await supabase
      .from('classrooms')
      .insert({
        name: newName.trim(),
        created_by: profile?.id,
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      })
      .select()
      .single();

    if (!error && data) {
      // Fetch all teachers and admins to auto-add as members
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['teacher', 'admin']);

      if (staffProfiles && staffProfiles.length > 0) {
        const memberInserts = staffProfiles.map((p: any) => ({
          classroom_id: data.id,
          user_id: p.id,
        }));
        await supabase.from('classroom_members').insert(memberInserts);
      }

      setNewName('');
      setShowCreate(false);
      fetchClassrooms();
    } else {
      Alert.alert('Error', error?.message ?? 'Failed to create classroom');
    }
    setCreating(false);
  };

  const handleDelete = (classroom: Classroom) => {
    Alert.alert(
      'Delete Classroom',
      `Are you sure you want to delete "${classroom.name}"? This will remove all messages and members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('classrooms')
              .delete()
              .eq('id', classroom.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              fetchClassrooms();
            }
          },
        },
      ]
    );
  };

  const renderClassroom = ({ item }: { item: Classroom }) => (
    <Pressable
      onPress={() => router.push(`/classroom/${item.id}`)}
      onLongPress={() => isTeacherOrAdmin ? handleDelete(item) : undefined}
      style={({ pressed }) => [
        styles.classroomCard,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.classroomIcon}>
        <Ionicons name="school" size={24} color={Colors.primary} />
      </View>
      <View style={styles.classroomInfo}>
        <Text style={styles.classroomName}>{item.name}</Text>
        <Text style={styles.classroomCode}>Code: {item.invite_code}</Text>
      </View>
      {item.is_call_active ? (
        <View style={styles.callLiveBadge}>
          <View style={styles.callLiveDot} />
          <Text style={styles.callLiveText}>LIVE</Text>
        </View>
      ) : null}
      {isTeacherOrAdmin ? (
        <Pressable
          onPress={() => handleDelete(item)}
          style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {showCreate ? (
        <View style={styles.createCard}>
          <Input
            label="Classroom Name"
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Music 101"
            autoCapitalize="words"
          />
          <View style={styles.createActions}>
            <Button title="Cancel" onPress={() => setShowCreate(false)} variant="ghost" />
            <Button title="Create" onPress={handleCreate} loading={creating} />
          </View>
        </View>
      ) : null}

      <FlatList
        data={classrooms}
        renderItem={renderClassroom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={fetchClassrooms}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="school-outline" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Classrooms Yet</Text>
              <Text style={styles.emptyText}>
                {isTeacherOrAdmin
                  ? 'Create a classroom to get started'
                  : 'Wait for your teacher to add you to a classroom'}
              </Text>
            </View>
          ) : null
        }
      />

      {isTeacherOrAdmin ? (
        <Pressable
          onPress={() => setShowCreate(true)}
          style={({ pressed }) => [
            styles.fab,
            { bottom: 24 + insets.bottom, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
          ]}
        >
          <Ionicons name="add" size={28} color={Colors.textInverse} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  classroomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  classroomIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  classroomInfo: {
    flex: 1,
  },
  classroomName: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  classroomCode: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  callLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  callLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.callActive,
    marginRight: 4,
  },
  callLiveText: {
    ...Typography.small,
    fontWeight: '700',
    color: Colors.callActive,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
  createCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xxxl,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
});
