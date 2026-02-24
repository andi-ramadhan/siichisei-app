import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAgoraStore } from '@/stores/agora-store';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface CallControlsProps {
  classroomId: string;
  isTeacherOrAdmin: boolean;
}

export function CallControls({ classroomId, isTeacherOrAdmin }: CallControlsProps) {
  const { isInCall, isMuted, toggleMute, leaveCall, endCall } = useAgoraStore();

  if (!isInCall) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggleMute}
        style={({ pressed }) => [
          styles.button,
          isMuted ? styles.buttonMuted : styles.buttonActive,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Ionicons
          name={isMuted ? 'mic-off' : 'mic'}
          size={22}
          color={Colors.textInverse}
        />
        <Text style={styles.buttonText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
      </Pressable>

      <Pressable
        onPress={() => leaveCall(classroomId)}
        style={({ pressed }) => [
          styles.button,
          styles.buttonLeave,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Ionicons name="call" size={22} color={Colors.textInverse} />
        <Text style={styles.buttonText}>Leave</Text>
      </Pressable>

      {isTeacherOrAdmin ? (
        <Pressable
          onPress={() => endCall(classroomId)}
          style={({ pressed }) => [
            styles.button,
            styles.buttonEnd,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="close-circle" size={22} color={Colors.textInverse} />
          <Text style={styles.buttonText}>End</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    minWidth: 80,
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: Colors.callActive,
  },
  buttonMuted: {
    backgroundColor: Colors.callMuted,
  },
  buttonLeave: {
    backgroundColor: Colors.warning,
  },
  buttonEnd: {
    backgroundColor: Colors.callEnd,
  },
  buttonText: {
    ...Typography.captionBold,
    color: Colors.textInverse,
  },
});
