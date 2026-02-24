import { CallBanner } from '@/components/call/CallBanner';
import { CallBubble } from '@/components/call/CallBubble';
import { CallStage } from '@/components/call/CallStage';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { AddStudentModal } from '@/components/classroom/AddStudentModal';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Classroom, Message } from '@/lib/types';
import { useAgoraStore } from '@/stores/agora-store';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default function ClassroomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const listRef = useRef<FlatList>(null);

  const { profile } = useAuthStore();
  const { messages, isLoading, fetchMessages, sendMessage, subscribeToMessages, unsubscribe, markAsRead, readBy, fetchReadReceipts } = useChatStore();
  const { isInCall, startCall, joinCall, initEngine } = useAgoraStore();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const isTeacherOrAdmin = profile?.role === 'teacher' || profile?.role === 'admin';

  useEffect(() => {
    if (!id) return;

    fetchClassroom();
    fetchMessages(id);
    fetchMemberIds();

    const keyboardSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => {
      unsubscribe();
      keyboardSub.remove();
    };
  }, [id]);

  useEffect(() => {
    if (!id || !profile?.id || messages.length === 0) return;

    subscribeToMessages(id, profile.id);
    markAsRead(id, profile.id);
    fetchReadReceipts(id);
  }, [id, profile?.id, messages.length > 0]);

  useEffect(() => {
    if (classroom) {
      navigation.setOptions({
        title: classroom.name,
        headerRight: () => (
          <View style={styles.headerRight}>
            {isTeacherOrAdmin ? (
              <Pressable
                onPress={() => setShowAddStudents(true)}
                style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="person-add" size={20} color={Colors.primary} />
              </Pressable>
            ) : null}
            {isTeacherOrAdmin && !classroom.is_call_active ? (
              <Pressable
                onPress={handleStartCall}
                style={({ pressed }) => [styles.headerBtn, styles.startCallBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="call" size={18} color={Colors.textInverse} />
              </Pressable>
            ) : null}
          </View>
        ),
      });
    }
  }, [classroom, isTeacherOrAdmin]);

  const fetchClassroom = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single();
    if (data) {
      setClassroom(data as Classroom);
    }
  };

  const fetchMemberIds = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('classroom_members')
      .select('user_id')
      .eq('classroom_id', id);
    if (data) {
      setMemberIds(data.map((m: any) => m.user_id));
    }
  };

  // Subscribe to classroom changes (call status)
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`classroom-status-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'classrooms',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setClassroom((prev) => (prev ? { ...prev, ...payload.new } as Classroom : null));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleStartCall = async () => {
    if (!id) return;
    await initEngine();
    await startCall(id);
    fetchClassroom();
  };

  const handleJoinCall = async () => {
    if (!id || !classroom?.call_channel_name || !profile) return;
    await initEngine();
    await joinCall(id, classroom.call_channel_name, profile.role);
  };

  const handleSend = (content: string) => {
    if (!id || !profile) return;
    sendMessage(id, profile.id, content);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === profile?.id;
    const readByUsers = readBy[item.id] ?? [];
    const readByOthers = readByUsers.filter((uid) => uid !== profile?.id);
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showSender = !isOwn && (!prevMessage || prevMessage.sender_id !== item.sender_id);

    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        readByCount={readByOthers.length}
        showSender={showSender}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <CallBanner
        isCallActive={classroom?.is_call_active ?? false}
        isInCall={isInCall}
        onJoin={handleJoinCall}
      />

      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        onLayout={() => listRef.current?.scrollToEnd()}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatHint}>Send the first message!</Text>
            </View>
          ) : null
        }
      />

      <MessageInput onSend={handleSend} />

      {/* Full-screen karaoke call stage (modal overlay) */}
      <CallStage
        classroomId={id ?? ''}
        classroomName={classroom?.name ?? ''}
        isTeacherOrAdmin={isTeacherOrAdmin}
      />

      {/* Floating bubble when call is minimized */}
      <CallBubble />

      {/* Add students modal */}
      <AddStudentModal
        visible={showAddStudents}
        onClose={() => setShowAddStudents(false)}
        classroomId={id ?? ''}
        existingMemberIds={memberIds}
        onStudentsAdded={fetchMemberIds}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  startCallBtn: {
    backgroundColor: Colors.callActive,
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },
  messagesList: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyChatText: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptyChatHint: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
