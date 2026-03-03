import { supabase } from '@/lib/supabase';
import createAgoraRtcEngine, {
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  IRtcEngineEventHandler,
  RtcConnection,
} from 'react-native-agora';
import { create } from 'zustand';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';

export interface Participant {
  uid: number;
  isMuted: boolean;
  displayName?: string;
  isLocal?: boolean;
}

interface AgoraState {
  engine: IRtcEngine | null;
  isInitialized: boolean;
  isInCall: boolean;
  isMuted: boolean;
  channelName: string | null;
  participants: Map<number, Participant>;
  localUid: number;
  isCallMinimized: boolean;

  initEngine: () => Promise<void>;
  destroyEngine: () => void;
  startCall: (classroomId: string) => Promise<void>;
  joinCall: (classroomId: string, channelName: string, asRole: 'teacher' | 'admin' | 'student') => Promise<void>;
  leaveCall: (classroomId: string) => Promise<void>;
  endCall: (classroomId: string) => Promise<void>;
  toggleMute: () => void;
  forceMuteLocal: (muted: boolean) => void;
  setStudentMicLocally: (uid: number, muted: boolean) => void;
  toggleMinimize: () => void;
  playEffect: (filePath: string, volume?: number) => void;
  stopEffect: (soundId: number) => void;
  startAudioMixing: (filePath: string, loopback: boolean, volume?: number) => void;
  stopAudioMixing: () => void;
  setAudioMixingVolume: (volume: number) => void;
}

let nextSoundId = 1;

/** Fetch a temporary Agora token from our Supabase Edge Function */
async function fetchAgoraToken(
  channelName: string,
  uid: number,
  role: 'publisher' | 'subscriber' = 'publisher',
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('agora-token', {
      body: { channelName, uid, role },
    });
    if (error || !data?.token) {
      console.error('Agora token fetch error:', error);
      return '';
    }
    return data.token as string;
  } catch (err) {
    console.error('Failed to fetch Agora token:', err);
    return '';
  }
}

export const useAgoraStore = create<AgoraState>((set, get) => ({
  engine: null,
  isInitialized: false,
  isInCall: false,
  isMuted: false,
  channelName: null,
  participants: new Map(),
  localUid: 0,
  isCallMinimized: false,

  initEngine: async () => {
    // Always re-initialize so event handlers are freshly registered
    const existing = get().engine;
    if (existing) {
      try {
        existing.release();
      } catch (_) { }
    }

    try {
      if (!AGORA_APP_ID) {
        console.error('EXPO_PUBLIC_AGORA_APP_ID is not set. Agora will not connect.');
      }

      const engine = createAgoraRtcEngine();
      engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      engine.enableAudio();
      engine.setDefaultAudioRouteToSpeakerphone(true);

      const handler: IRtcEngineEventHandler = {
        onJoinChannelSuccess: (connection: RtcConnection, _elapsed: number) => {
          const localUid = connection.localUid ?? 0;
          console.log('[Agora] Joined channel, localUid:', localUid);
          set({ localUid });
        },
        onUserJoined: (_connection: RtcConnection, remoteUid: number) => {
          console.log('[Agora] Remote user joined:', remoteUid);
          set((state) => {
            const newParticipants = new Map(state.participants);
            newParticipants.set(remoteUid, { uid: remoteUid, isMuted: false });
            return { participants: newParticipants };
          });
        },
        onUserOffline: (_connection: RtcConnection, remoteUid: number) => {
          console.log('[Agora] Remote user left:', remoteUid);
          set((state) => {
            const newParticipants = new Map(state.participants);
            newParticipants.delete(remoteUid);
            return { participants: newParticipants };
          });
        },
        onRemoteAudioStateChanged: (
          _connection: RtcConnection,
          remoteUid: number,
          state: number,
          _reason: number,
        ) => {
          // state 0 = stopped/muted, state 2 = decoding (active)
          const isMuted = state === 0;
          set((s) => {
            const newParticipants = new Map(s.participants);
            const participant = newParticipants.get(remoteUid);
            if (participant) {
              newParticipants.set(remoteUid, { ...participant, isMuted });
            }
            return { participants: newParticipants };
          });
        },
        onError: (err: number, msg: string) => {
          console.error('[Agora] Error:', err, msg);
        },
      };

      engine.registerEventHandler(handler);

      set({ engine, isInitialized: true });
      console.log('[Agora] Engine initialized with appId:', AGORA_APP_ID ? 'SET' : 'MISSING');
    } catch (error) {
      console.error('[Agora] Failed to initialize engine:', error);
    }
  },

  destroyEngine: () => {
    const { engine } = get();
    if (engine) {
      engine.release();
      set({ engine: null, isInitialized: false });
    }
  },

  startCall: async (classroomId) => {
    const { isInCall, leaveCall } = get();

    if (isInCall) {
      await leaveCall(classroomId);
    }

    // Always re-init engine to ensure fresh event handlers
    await get().initEngine();

    const channelName = `classroom-${classroomId}`;

    // Mark call as active in DB
    await supabase
      .from('classrooms')
      .update({ is_call_active: true, call_channel_name: channelName })
      .eq('id', classroomId);

    // Teacher/Admin starts as broadcaster
    await get().joinCall(classroomId, channelName, 'teacher');
  },

  joinCall: async (classroomId, channelName, asRole) => {
    const { isInCall } = get();

    if (isInCall) {
      const currentEngine = get().engine;
      if (currentEngine) currentEngine.leaveChannel();
      set({
        isInCall: false,
        isMuted: false,
        channelName: null,
        participants: new Map(),
        localUid: 0,
        isCallMinimized: false,
      });
    }

    // Always re-init engine for fresh handlers
    await get().initEngine();

    const currentEngine = get().engine;
    if (!currentEngine) {
      console.error('[Agora] Engine not available after init');
      return;
    }

    const shouldMute = asRole === 'student';

    currentEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    // Fetch a real token from our server (uid=0 lets Agora assign one)
    const token = await fetchAgoraToken(channelName, 0, 'publisher');

    console.log('[Agora] Joining channel:', channelName, 'token present:', !!token);

    currentEngine.joinChannel(token, channelName, 0, {
      autoSubscribeAudio: true,
      publishMicrophoneTrack: !shouldMute,
    });

    if (shouldMute) {
      currentEngine.muteLocalAudioStream(true);
    }

    set({
      isInCall: true,
      isMuted: shouldMute,
      channelName,
    });
  },

  leaveCall: async (_classroomId) => {
    const { engine } = get();
    if (engine) {
      engine.leaveChannel();
    }
    set({
      isInCall: false,
      isMuted: false,
      channelName: null,
      participants: new Map(),
      localUid: 0,
      isCallMinimized: false,
    });
  },

  endCall: async (classroomId) => {
    const { engine } = get();
    if (engine) {
      engine.leaveChannel();
    }

    await supabase
      .from('classrooms')
      .update({ is_call_active: false, call_channel_name: null })
      .eq('id', classroomId);

    set({
      isInCall: false,
      isMuted: false,
      channelName: null,
      participants: new Map(),
      localUid: 0,
      isCallMinimized: false,
    });
  },

  toggleMute: () => {
    const { engine, isMuted } = get();
    if (engine) {
      engine.muteLocalAudioStream(!isMuted);
      set({ isMuted: !isMuted });
    }
  },

  /**
   * Force-mute/unmute local microphone (used by mic-control signaling when
   * a teacher sends a command targeting this user's UID).
   */
  forceMuteLocal: (muted: boolean) => {
    const { engine } = get();
    if (engine) {
      engine.muteLocalAudioStream(muted);
      set({ isMuted: muted });
    }
  },

  /**
   * Update the in-memory muted state for a remote participant.
   * Called by the Teacher/Admin side after broadcasting a MIC_CONTROL signal
   * so the UI reflects the sent command immediately.
   */
  setStudentMicLocally: (uid: number, muted: boolean) => {
    set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(uid);
      if (participant) {
        newParticipants.set(uid, { ...participant, isMuted: muted });
      }
      return { participants: newParticipants };
    });
  },

  toggleMinimize: () => {
    set((state) => ({ isCallMinimized: !state.isCallMinimized }));
  },

  playEffect: (filePath, volume = 100) => {
    const { engine } = get();
    if (engine) {
      const soundId = nextSoundId++;
      engine.playEffect(soundId, filePath, 0, 1.0, 0.0, volume, true, 0);
    }
  },

  stopEffect: (soundId) => {
    const { engine } = get();
    if (engine) {
      engine.stopEffect(soundId);
    }
  },

  startAudioMixing: (filePath, loopback = false, volume = 100) => {
    const { engine } = get();
    if (engine) {
      engine.startAudioMixing(filePath, loopback, -1, 0);
      engine.adjustAudioMixingVolume(volume);
    }
  },

  stopAudioMixing: () => {
    const { engine } = get();
    if (engine) {
      engine.stopAudioMixing();
    }
  },

  setAudioMixingVolume: (volume) => {
    const { engine } = get();
    if (engine) {
      engine.adjustAudioMixingVolume(volume);
    }
  },
}));
