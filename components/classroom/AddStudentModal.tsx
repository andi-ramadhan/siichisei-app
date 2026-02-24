import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AddStudentModalProps {
  visible: boolean;
  onClose: () => void;
  classroomId: string;
  existingMemberIds: string[];
  onStudentsAdded: () => void;
}

export function AddStudentModal({
  visible,
  onClose,
  classroomId,
  existingMemberIds,
  onStudentsAdded,
}: AddStudentModalProps) {
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchStudents();
      setSelectedIds(new Set());
    }
  }, [visible]);

  const fetchStudents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('display_name');

    if (!error && data) {
      setStudents(data as Profile[]);
    }
    setIsLoading(false);
  };

  const toggleStudent = (id: string) => {
    if (existingMemberIds.includes(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setAdding(true);

    const inserts = Array.from(selectedIds).map((userId) => ({
      classroom_id: classroomId,
      user_id: userId,
    }));

    const { error } = await supabase.from('classroom_members').insert(inserts);

    setAdding(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      onStudentsAdded();
      onClose();
    }
  };

  const isAlreadyMember = (id: string) => existingMemberIds.includes(id);

  const renderStudent = ({ item }: { item: Profile }) => {
    const alreadyAdded = isAlreadyMember(item.id);
    const isSelected = selectedIds.has(item.id);
    const vocalLabel = item.vocal_type ? ` - ${item.vocal_type}` : '';

    return (
      <Pressable
        onPress={() => toggleStudent(item.id)}
        disabled={alreadyAdded}
        style={({ pressed }) => [
          styles.studentRow,
          isSelected ? styles.studentRowSelected : null,
          alreadyAdded ? styles.studentRowDisabled : null,
          { opacity: pressed && !alreadyAdded ? 0.8 : 1 },
        ]}
      >
        <Avatar name={item.display_name} imageUrl={item.avatar_url} size={36} />
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>
            {item.display_name}{vocalLabel}
          </Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
        </View>
        {alreadyAdded ? (
          <View style={styles.addedBadge}>
            <Text style={styles.addedText}>Added</Text>
          </View>
        ) : (
          <View style={[styles.checkbox, isSelected ? styles.checkboxChecked : null]}>
            {isSelected ? (
              <Ionicons name="checkmark" size={14} color={Colors.textInverse} />
            ) : null}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.title}>Add Students</Text>
          <View style={{ width: 32 }} />
        </View>

        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={fetchStudents}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
                <Text style={styles.emptyText}>No students found</Text>
              </View>
            ) : null
          }
        />

        {selectedIds.size > 0 ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Button
              title={`Add ${selectedIds.size} Student${selectedIds.size > 1 ? 's' : ''}`}
              onPress={handleAdd}
              loading={adding}
              fullWidth
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  title: {
    ...Typography.h3,
    color: Colors.text,
  },
  listContent: {
    padding: Spacing.lg,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    ...Shadows.sm,
    gap: Spacing.md,
  },
  studentRowSelected: {
    backgroundColor: Colors.primaryFaded,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  studentRowDisabled: {
    opacity: 0.5,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  studentEmail: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  addedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFaded,
  },
  addedText: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
});
