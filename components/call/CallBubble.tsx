import { Colors, Shadows } from '@/constants/theme';
import { useAgoraStore } from '@/stores/agora-store';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BUBBLE_SIZE = 60;
const EDGE_PADDING = 12;

export function CallBubble() {
  const { isInCall, isCallMinimized, toggleMinimize, isMuted, participants } = useAgoraStore();
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - BUBBLE_SIZE - EDGE_PADDING, y: 120 })).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    if (!isMuted) animation.start();
    return () => animation.stop();
  }, [isMuted]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();

        // Snap to nearest horizontal edge
        const currentX = gesture.moveX - BUBBLE_SIZE / 2;
        const snapX = currentX < SCREEN_W / 2 ? EDGE_PADDING : SCREEN_W - BUBBLE_SIZE - EDGE_PADDING;

        // Clamp Y
        const currentY = gesture.moveY - BUBBLE_SIZE / 2;
        const clampedY = Math.max(EDGE_PADDING + 40, Math.min(SCREEN_H - BUBBLE_SIZE - EDGE_PADDING - 80, currentY));

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          useNativeDriver: false,
          friction: 7,
        }).start();
      },
    })
  ).current;

  if (!isInCall || !isCallMinimized) return null;

  const participantCount = participants.size + 1;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable onPress={toggleMinimize} style={styles.bubble}>
        <Animated.View
          style={[
            styles.glow,
            {
              transform: [{ scale: isMuted ? 1 : pulseAnim }],
              opacity: isMuted ? 0 : 0.4,
            },
          ]}
        />
        <View style={[styles.inner, isMuted ? styles.innerMuted : styles.innerActive]}>
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={22}
            color="#FFFFFF"
          />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{participantCount}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: Colors.callActive,
  },
  inner: {
    width: BUBBLE_SIZE - 8,
    height: BUBBLE_SIZE - 8,
    borderRadius: (BUBBLE_SIZE - 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  innerActive: {
    backgroundColor: Colors.callActive,
  },
  innerMuted: {
    backgroundColor: Colors.callMuted,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
