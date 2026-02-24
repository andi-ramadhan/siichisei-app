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

interface Participant {
  uid: number;
  isMuted: boolean;
  profileId?: string;
  displayName?: string;
}

interface AgoraState {
  engine: IRtcEngine | null;
  isInitialized: boolean;
  isInCall: boolean;
  isMuted: boolean;
  channelName: string | null;
  participants: Map<number, Participant>;
  localUid: number;

  initEngine: () => Promise<void>;
  destroyEngine: () => void;
  startCall: (classroomId: string) => Promise<void>;
  joinCall: (classroomId: string, channelName: string, asRole: 'teacher' | 'admin' | 'student') => Promise<void>;
  leaveCall: (classroomId: string) => Promise<void>;
  endCall: (classroomId: string) => Promise<void>;
  toggleMute: () => void;
  setStudentMic: (uid: number, enabled: boolean) => void;
  isCallMinimized: boolean;
  toggleMinimize: () => void;
  playEffect: (filePath: string, volume?: number) => void;
  stopEffect: (soundId: number) => void;
  startAudioMixing: (filePath: string, loopback: boolean, volume?: number) => void;
  stopAudioMixing: () => void;
  setAudioMixingVolume: (volume: number) => void;
}

let nextSoundId = 1;

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
    if (get().isInitialized) return;

    try {
      const engine = createAgoraRtcEngine();
      engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      engine.enableAudio();
      engine.setDefaultAudioRouteToSpeakerphone(true);

      const handler: IRtcEngineEventHandler = {
        onJoinChannelSuccess: (_connection: RtcConnection, elapsed: number) => {
          console.log('Joined channel successfully', elapsed);
        },
        onUserJoined: (_connection: RtcConnection, remoteUid: number) => {
          set((state) => {
            const newParticipants = new Map(state.participants);
            newParticipants.set(remoteUid, { uid: remoteUid, isMuted: false });
            return { participants: newParticipants };
          });
        },
        onUserOffline: (_connection: RtcConnection, remoteUid: number) => {
          set((state) => {
            const newParticipants = new Map(state.participants);
            newParticipants.delete(remoteUid);
            return { participants: newParticipants };
          });
        },
        onAudioVolumeIndication: (
          _connection: RtcConnection,
          speakers: Array<{ uid: number; volume: number }>,
        ) => {
          // Could be used for speaking indicators
        },
      };

      engine.registerEventHandler(handler);

      set({ engine, isInitialized: true });
    } catch (error) {
      console.error('Failed to initialize Agora engine:', error);
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
    const { engine, initEngine } = get();
    if (!engine) {
      await initEngine();
    }

    const channelName = `classroom-${classroomId}`;

    // Update classroom to mark call as active
    await supabase
      .from('classrooms')
      .update({ is_call_active: true, call_channel_name: channelName })
      .eq('id', classroomId);

    // Join as broadcaster (teacher/admin)
    await get().joinCall(classroomId, channelName, 'teacher');
  },

  joinCall: async (classroomId, channelName, asRole) => {
    const { engine, initEngine } = get();
    if (!engine) {
      await initEngine();
    }

    const currentEngine = get().engine;
    if (!currentEngine) return;

    // Students join muted by default
    const shouldMute = asRole === 'student';

    currentEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    // Use 0 as uid to let Agora assign one
    currentEngine.joinChannel('', channelName, 0, {
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

  leaveCall: async (classroomId) => {
    const { engine } = get();
    if (engine) {
      engine.leaveChannel();
    }
    set({
      isInCall: false,
      isMuted: false,
      channelName: null,
      participants: new Map(),
      isCallMinimized: false,
    });
  },

  endCall: async (classroomId) => {
    const { engine } = get();
    if (engine) {
      engine.leaveChannel();
    }

    // Update classroom to mark call as ended
    await supabase
      .from('classrooms')
      .update({ is_call_active: false, call_channel_name: null })
      .eq('id', classroomId);

    set({
      isInCall: false,
      isMuted: false,
      channelName: null,
      participants: new Map(),
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

  toggleMinimize: () => {
    set((state) => ({ isCallMinimized: !state.isCallMinimized }));
  },

  setStudentMic: (uid, enabled) => {
    const { engine } = get();
    if (engine) {
      engine.muteRemoteAudioStream(uid, !enabled);
      set((state) => {
        const newParticipants = new Map(state.participants);
        const participant = newParticipants.get(uid);
        if (participant) {
          newParticipants.set(uid, { ...participant, isMuted: !enabled });
        }
        return { participants: newParticipants };
      });
    }
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
      // startAudioMixing: filePath, loopback, cycle, startPos
      // loopback=false means remote users hear the mix too
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
