import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface CallBannerProps {
  isCallActive: boolean;
  isInCall: boolean;
  onJoin: () => void;
}

export function CallBanner({ isCallActive, isInCall, onJoin }: CallBannerProps) {
  if (!isCallActive || isInCall) return null;

  return (
    <Pressable
      onPress={onJoin}
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.pulseContainer}>
        <View style={styles.pulseDot} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Call in Progress</Text>
        <Text style={styles.subtitle}>Tap to join the voice call</Text>
      </View>
      <View style={styles.joinButton}>
        <Ionicons name="call" size={18} color={Colors.textInverse} />
        <Text style={styles.joinText}>Join</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  pulseContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.callActive,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...Typography.captionBold,
    color: '#166534',
  },
  subtitle: {
    ...Typography.small,
    color: '#15803D',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.callActive,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  joinText: {
    ...Typography.captionBold,
    color: Colors.textInverse,
  },
});
