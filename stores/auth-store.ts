import { supabase } from '@/lib/supabase';
import type { Profile, VocalType } from '@/lib/types';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: {
    display_name?: string;
    full_name?: string | null;
    vocal_type?: VocalType | null;
  }) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user, session });
        await get().fetchProfile(session.user.id);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ user: session?.user ?? null, session });
      if (session?.user) {
        await get().fetchProfile(session.user.id);
      } else {
        set({ profile: null });
      }
    });
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ isLoading: false });
    return { error: error?.message ?? null };
  },

  signUp: async (email, password, displayName) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      set({ isLoading: false });
      return { error: error.message };
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        display_name: displayName,
        role: 'student',
      });

      if (profileError) {
        set({ isLoading: false });
        return { error: profileError.message };
      }
    }

    set({ isLoading: false });
    return { error: null };
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null, isLoading: false });
  },

  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return { error: 'No profile found' };

    set({ isLoading: true });
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }

    set({ isLoading: false });
    return { error: error?.message ?? null };
  },
}));
