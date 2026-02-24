import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAgoraStore } from '@/stores/agora-store';
import { useSoundboardStore } from '@/stores/soundboard-store';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

const ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/vorbis',
];

interface SoundboardProps {
  isInCall: boolean;
}

export function Soundboard({ isInCall }: SoundboardProps) {
  const { uploadedFilePath, uploadedFileName, isPlaying, volume, setUploadedFile, clearUploadedFile, setPlaying, setVolume } = useSoundboardStore();
  const { startAudioMixing, stopAudioMixing, setAudioMixingVolume } = useAgoraStore();

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      // DocumentPicker with copyToCacheDirectory copies the file to cache already.
      // We use the URI directly — Agora's audio mixing can read from any accessible path.
      setUploadedFile(asset.uri, asset.name);
    } catch (error) {
      Alert.alert('Error', 'Failed to pick audio file');
      console.error(error);
    }
  };

  const handlePlay = () => {
    if (!uploadedFilePath) return;

    if (!isInCall) {
      Alert.alert('Not in Call', 'Join a voice call first to use the soundboard');
      return;
    }

    if (isPlaying) {
      stopAudioMixing();
      setPlaying(false);
    } else {
      // loopback=false so remote users hear it too
      startAudioMixing(uploadedFilePath, false, volume);
      setPlaying(true);
    }
  };

  const handleVolumeChange = (delta: number) => {
    const newVolume = Math.max(0, Math.min(100, volume + delta));
    setVolume(newVolume);
    if (isPlaying) {
      setAudioMixingVolume(newVolume);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="musical-notes" size={18} color={Colors.accent} />
        <Text style={styles.title}>Soundboard</Text>
      </View>

      {uploadedFilePath ? (
        <View style={styles.fileCard}>
          <View style={styles.fileInfo}>
            <Ionicons name="document" size={20} color={Colors.primary} />
            <View style={styles.fileTextContainer}>
              <Text style={styles.fileName} numberOfLines={1}>{uploadedFileName}</Text>
              <Text style={styles.fileHint}>
                {isInCall ? 'Mic + Music mixed to output' : 'Join a call to play'}
              </Text>
            </View>
          </View>

          <View style={styles.controls}>
            <View style={styles.volumeControls}>
              <Pressable onPress={() => handleVolumeChange(-10)} style={styles.volumeBtn}>
                <Ionicons name="volume-low" size={16} color={Colors.textSecondary} />
              </Pressable>
              <Text style={styles.volumeText}>{volume}%</Text>
              <Pressable onPress={() => handleVolumeChange(10)} style={styles.volumeBtn}>
                <Ionicons name="volume-high" size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.actionButtons}>
              <Pressable
                onPress={handlePlay}
                style={({ pressed }) => [
                  styles.playButton,
                  isPlaying ? styles.playButtonActive : null,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons
                  name={isPlaying ? 'stop' : 'play'}
                  size={22}
                  color={Colors.textInverse}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  if (isPlaying) stopAudioMixing();
                  setPlaying(false);
                  clearUploadedFile();
                }}
                style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handlePickFile}
          style={({ pressed }) => [
            styles.uploadArea,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="cloud-upload-outline" size={32} color={Colors.accent} />
          <Text style={styles.uploadTitle}>Upload Music</Text>
          <Text style={styles.uploadHint}>MP3, M4A, WAV, or OGG</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.captionBold,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploadArea: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentFaded,
    gap: Spacing.xs,
  },
  uploadTitle: {
    ...Typography.bodyBold,
    color: Colors.accent,
    marginTop: Spacing.sm,
  },
  uploadHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  fileCard: {
    gap: Spacing.md,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryFaded,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  fileTextContainer: {
    flex: 1,
  },
  fileName: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  fileHint: {
    ...Typography.small,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  volumeBtn: {
    padding: Spacing.xs,
  },
  volumeText: {
    ...Typography.captionBold,
    color: Colors.text,
    minWidth: 36,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  playButtonActive: {
    backgroundColor: Colors.callEnd,
  },
  removeBtn: {
    padding: Spacing.xs,
  },
});
