import { create } from 'zustand';

interface SoundboardState {
  uploadedFilePath: string | null;
  uploadedFileName: string | null;
  isPlaying: boolean;
  volume: number;

  setUploadedFile: (path: string, name: string) => void;
  clearUploadedFile: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
}

export const useSoundboardStore = create<SoundboardState>((set) => ({
  uploadedFilePath: null,
  uploadedFileName: null,
  isPlaying: false,
  volume: 80,

  setUploadedFile: (path, name) => set({ uploadedFilePath: path, uploadedFileName: name }),
  clearUploadedFile: () => set({ uploadedFilePath: null, uploadedFileName: null, isPlaying: false }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
}));
