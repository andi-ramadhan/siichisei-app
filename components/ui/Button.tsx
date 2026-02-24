import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { ActivityIndicator, Pressable, StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: Colors.primary, text: Colors.textInverse, border: Colors.primary },
  secondary: { bg: Colors.primaryFaded, text: Colors.primary, border: Colors.primaryFaded },
  accent: { bg: Colors.accent, text: Colors.textInverse, border: Colors.accent },
  danger: { bg: Colors.error, text: Colors.textInverse, border: Colors.error },
  ghost: { bg: 'transparent', text: Colors.primary, border: Colors.border },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const colors = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <Text style={[styles.text, { color: colors.text }, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...Shadows.sm,
  },
  text: {
    ...Typography.bodyBold,
  },
  fullWidth: {
    width: '100%',
  },
});
