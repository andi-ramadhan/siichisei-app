import { supabase } from '@/lib/supabase';
import { useAgoraStore } from '@/stores/agora-store';
import { useEffect } from 'react';

interface MicControlPayload {
  targetUid: number;
  muted: boolean;
}

/**
 * useMicControlSignaling
 *
 * Handles real teacher mic control via Supabase Realtime broadcast.
 *
 * - Teacher/Admin: `sendMicControl(uid, muted)` broadcasts a command and
 *   optimistically updates local UI state.
 * - Students: listen for commands targeting their localUid and apply
 *   muteLocalAudioStream on themselves.
 *
 * Must be mounted inside any component that can be active during a call
 * (e.g. the classroom screen).
 */
export function useMicControlSignaling(classroomId: string, isTeacherOrAdmin: boolean) {
  const { localUid, forceMuteLocal, setStudentMicLocally, isInCall } = useAgoraStore();

  useEffect(() => {
    if (!isInCall || !classroomId) return;

    const channel = supabase.channel(`mic-control-${classroomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'MIC_CONTROL' }, ({ payload }: { payload: MicControlPayload }) => {
        if (!isTeacherOrAdmin && payload.targetUid === localUid) {
          // I am the target student — apply the mic command to my own stream
          forceMuteLocal(payload.muted);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isInCall, classroomId, localUid, isTeacherOrAdmin, forceMuteLocal]);

  /**
   * Teacher/Admin only: broadcast mic control command to a student by their Agora UID.
   * Also updates the local participant list UI immediately.
   */
  const sendMicControl = async (targetUid: number, muted: boolean) => {
    if (!isTeacherOrAdmin) return;

    // Optimistic UI update
    setStudentMicLocally(targetUid, muted);

    // Broadcast to all channel members (student device will pick this up)
    await supabase.channel(`mic-control-${classroomId}`).send({
      type: 'broadcast',
      event: 'MIC_CONTROL',
      payload: { targetUid, muted } satisfies MicControlPayload,
    });
  };

  return { sendMicControl };
}
