import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  realtimeChannel: RealtimeChannel | null;
  readBy: Record<string, string[]>; // messageId -> userIds who read it

  fetchMessages: (classroomId: string) => Promise<void>;
  sendMessage: (classroomId: string, senderId: string, content: string) => Promise<void>;
  subscribeToMessages: (classroomId: string, currentUserId: string) => void;
  unsubscribe: () => void;
  markAsRead: (classroomId: string, userId: string) => Promise<void>;
  fetchReadReceipts: (classroomId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  realtimeChannel: null,
  readBy: {},

  fetchMessages: async (classroomId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      set({ messages: data as Message[] });
    }
    set({ isLoading: false });
  },

  sendMessage: async (classroomId, senderId, content) => {
    if (!content.trim()) return;

    const { error } = await supabase.from('messages').insert({
      classroom_id: classroomId,
      sender_id: senderId,
      content: content.trim(),
    });

    if (error) {
      console.error('Failed to send message:', error);
    }
  },

  subscribeToMessages: (classroomId, currentUserId) => {
    const channel = supabase
      .channel(`classroom-${classroomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `classroom_id=eq.${classroomId}`,
        },
        async (payload) => {
          // Fetch the full message with sender profile
          const { data } = await supabase
            .from('messages')
            .select(`*, sender:profiles!messages_sender_id_fkey(*)`)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            set((state) => ({
              messages: [...state.messages, data as Message],
            }));

            // Auto-mark as read for current user
            if (data.sender_id !== currentUserId) {
              get().markAsRead(classroomId, currentUserId);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts',
          filter: `message_id=in.(${get().messages.map((m) => m.id).join(',')})`,
        },
        () => {
          get().fetchReadReceipts(classroomId);
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribe: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null, messages: [] });
    }
  },

  markAsRead: async (classroomId, userId) => {
    const { messages } = get();
    const unreadMessages = messages.filter((m) => m.sender_id !== userId);

    if (unreadMessages.length === 0) return;

    const lastMessage = unreadMessages[unreadMessages.length - 1];

    await supabase.from('message_read_receipts').upsert(
      {
        message_id: lastMessage.id,
        user_id: userId,
      },
      { onConflict: 'message_id,user_id' }
    );
  },

  fetchReadReceipts: async (classroomId) => {
    const { messages } = get();
    if (messages.length === 0) return;

    const messageIds = messages.map((m) => m.id);

    const { data } = await supabase
      .from('message_read_receipts')
      .select('message_id, user_id')
      .in('message_id', messageIds);

    if (data) {
      const readBy: Record<string, string[]> = {};
      data.forEach((receipt: any) => {
        if (!readBy[receipt.message_id]) {
          readBy[receipt.message_id] = [];
        }
        readBy[receipt.message_id].push(receipt.user_id);
      });
      set({ readBy });
    }
  },
}));
