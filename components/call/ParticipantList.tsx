import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useMicControlSignaling } from '@/hooks/useMicControlSignaling';
import type { Participant } from '@/stores/agora-store';
import { useAgoraStore } from '@/stores/agora-store';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface ParticipantListProps {
  isTeacherOrAdmin: boolean;
  classroomId: string;
}

export function ParticipantList({ isTeacherOrAdmin, classroomId }: ParticipantListProps) {
  const { participants, isMuted, localUid } = useAgoraStore();
  const { sendMicControl } = useMicControlSignaling(classroomId, isTeacherOrAdmin);

  // Build a combined list: self + remote participants
  const selfEntry: Participant = { uid: localUid, isMuted, isLocal: true };
  const remoteParticipants = Array.from(participants.values());
  const allParticipants = [selfEntry, ...remoteParticipants];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Participants ({allParticipants.length})</Text>
      <FlatList
        data={allParticipants}
        horizontal
        keyExtractor={(item) => String(item.uid) + (item.isLocal ? '-local' : '')}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isLocal = item.isLocal === true;
          const canControl = isTeacherOrAdmin && !isLocal;

          return (
            <Pressable
              disabled={!canControl}
              onPress={() => canControl && sendMicControl(item.uid, !item.isMuted)}
              style={({ pressed }) => [
                styles.participantCard,
                { opacity: pressed && canControl ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.avatar, item.isMuted ? styles.avatarMuted : styles.avatarActive]}>
                <Ionicons
                  name={item.isMuted ? 'mic-off' : 'mic'}
                  size={18}
                  color={item.isMuted ? Colors.callMuted : Colors.callActive}
                />
              </View>
              <Text style={styles.uid}>{isLocal ? 'You' : `User ${item.uid}`}</Text>
              {canControl ? (
                <Text style={styles.tapHint}>
                  {item.isMuted ? 'Tap to unmute' : 'Tap to mute'}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
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
});
