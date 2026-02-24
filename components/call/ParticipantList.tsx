import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAgoraStore } from '@/stores/agora-store';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface ParticipantListProps {
  isTeacherOrAdmin: boolean;
}

export function ParticipantList({ isTeacherOrAdmin }: ParticipantListProps) {
  const { participants, setStudentMic, isMuted } = useAgoraStore();

  const participantArray = Array.from(participants.values());

  if (participantArray.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No other participants yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Participants ({participantArray.length})</Text>
      <FlatList
        data={participantArray}
        horizontal
        keyExtractor={(item) => String(item.uid)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            disabled={!isTeacherOrAdmin}
            onPress={() => isTeacherOrAdmin && setStudentMic(item.uid, item.isMuted)}
            style={({ pressed }) => [
              styles.participantCard,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[styles.avatar, item.isMuted ? styles.avatarMuted : styles.avatarActive]}>
              <Ionicons
                name={item.isMuted ? 'mic-off' : 'mic'}
                size={18}
                color={item.isMuted ? Colors.callMuted : Colors.callActive}
              />
            </View>
            <Text style={styles.uid}>User {item.uid}</Text>
            {isTeacherOrAdmin ? (
              <Text style={styles.tapHint}>
                {item.isMuted ? 'Tap to unmute' : 'Tap to mute'}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  title: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  participantCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minWidth: 80,
    ...Shadows.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarActive: {
    backgroundColor: '#DCFCE7',
  },
  avatarMuted: {
    backgroundColor: '#F1F5F9',
  },
  uid: {
    ...Typography.small,
    fontWeight: '600',
    color: Colors.text,
  },
  tapHint: {
    ...Typography.small,
    color: Colors.textTertiary,
    fontSize: 9,
    marginTop: 2,
  },
  emptyContainer: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
});
