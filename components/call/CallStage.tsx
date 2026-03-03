import { CallControls } from '@/components/call/CallControls';
import { ParticipantList } from '@/components/call/ParticipantList';
import { Soundboard } from '@/components/soundboard/Soundboard';
import { Spacing, Typography } from '@/constants/theme';
import { useAgoraStore } from '@/stores/agora-store';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

// Dark mode palette based on the app's turquoise + orange
const Stage = {
  bg: '#0A1A1F',
  bgGrad1: '#0D2528',
  bgGrad2: '#091316',
  surface: 'rgba(255,255,255,0.06)',
  surfaceActive: 'rgba(13,115,119,0.25)',
  text: '#E8F4F5',
  textMuted: '#6B9A9D',
  accent: '#D4762C',
  primary: '#14A3A8',
  glow: '#0D7377',
};

interface CallStageProps {
  classroomId: string;
  classroomName: string;
  isTeacherOrAdmin: boolean;
}

export function CallStage({ classroomId, classroomName, isTeacherOrAdmin }: CallStageProps) {
  const { isInCall, isCallMinimized, toggleMinimize, participants, isMuted } = useAgoraStore();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  if (!isInCall || isCallMinimized) return null;

  const participantCount = participants.size + 1; // remote participants + self

  return (
    <Modal
      visible={true}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={toggleMinimize}
    >
      <StatusBar barStyle="light-content" backgroundColor={Stage.bg} />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            onPress={toggleMinimize}
            style={({ pressed }) => [styles.minimizeBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="chevron-down" size={24} color={Stage.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.stageName}>{classroomName}</Text>
            <View style={styles.liveRow}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>LIVE</Text>
              <Text style={styles.participantCount}>· {participantCount} in call</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Stage Visual */}
          <View style={styles.stageVisual}>
            <View style={styles.micIndicator}>
              <Animated.View
                style={[
                  styles.micGlow,
                  { transform: [{ scale: isMuted ? 1 : pulseAnim }], opacity: isMuted ? 0.3 : 0.8 },
                ]}
              />
              <View style={[styles.micCircle, isMuted ? styles.micCircleMuted : null]}>
                <Ionicons
                  name={isMuted ? 'mic-off' : 'mic'}
                  size={36}
                  color={isMuted ? Stage.textMuted : Stage.text}
                />
              </View>
            </View>
            <Text style={styles.micStatus}>{isMuted ? 'Muted' : 'On Air'}</Text>
          </View>

          {/* Participants */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <ParticipantList isTeacherOrAdmin={isTeacherOrAdmin} classroomId={classroomId} />
          </View>

          {/* Soundboard */}
          <View style={styles.soundboardSection}>
            <Soundboard isInCall={true} />
          </View>
        </ScrollView>

        {/* Call Controls */}
        <View style={[styles.controlsBar, { paddingBottom: insets.bottom }]}>
          <CallControls classroomId={classroomId} isTeacherOrAdmin={isTeacherOrAdmin} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Stage.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  minimizeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Stage.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  stageName: {
    ...Typography.bodyBold,
    color: Stage.text,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    ...Typography.small,
    color: '#EF4444',
    fontWeight: '700',
    letterSpacing: 1,
  },
  participantCount: {
    ...Typography.small,
    color: Stage.textMuted,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stageVisual: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  micIndicator: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Stage.glow,
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Stage.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  micCircleMuted: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  micStatus: {
    ...Typography.captionBold,
    color: Stage.textMuted,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.captionBold,
    color: Stage.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  soundboardSection: {
    marginHorizontal: -Spacing.md,
  },
  controlsBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
});
