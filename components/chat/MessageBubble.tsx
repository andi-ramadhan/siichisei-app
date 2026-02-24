import { Avatar } from '@/components/ui/Avatar';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import type { Message } from '@/lib/types';
import { StyleSheet, Text, View } from 'react-native';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  readByCount: number;
  showSender: boolean;
}

export function MessageBubble({ message, isOwn, readByCount, showSender }: MessageBubbleProps) {
  const sender = message.sender;
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const senderLabel = sender
    ? sender.vocal_type
      ? `${sender.display_name} - ${sender.vocal_type}`
      : sender.display_name
    : '';

  return (
    <View style={[styles.container, isOwn ? styles.containerOwn : styles.containerOther]}>
      {!isOwn && showSender && sender ? (
        <View style={styles.senderRow}>
          <Avatar name={sender.display_name} imageUrl={sender.avatar_url} size={24} />
          <Text style={styles.senderName}>{senderLabel}</Text>
        </View>
      ) : null}

      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.content, isOwn ? styles.contentOwn : styles.contentOther]}>
          {message.content}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>{time}</Text>
          {isOwn ? (
            <Text style={styles.readStatus}>
              {readByCount > 0 ? '✓✓' : '✓'}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    maxWidth: '85%',
  },
  containerOwn: {
    alignSelf: 'flex-end',
  },
  containerOther: {
    alignSelf: 'flex-start',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: Spacing.xs,
  },
  senderName: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  bubbleOwn: {
    backgroundColor: Colors.bubbleSelf,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.bubbleOther,
    borderBottomLeftRadius: 4,
  },
  content: {
    ...Typography.body,
  },
  contentOwn: {
    color: Colors.bubbleTextSelf,
  },
  contentOther: {
    color: Colors.bubbleTextOther,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    gap: 4,
  },
  time: {
    ...Typography.small,
  },
  timeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeOther: {
    color: Colors.textTertiary,
  },
  readStatus: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
});
