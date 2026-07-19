import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Plus, Check } from 'lucide-react-native';
import Colors from '@/constants/Colors';

export type SaveStateVariant = 'small' | 'medium' | 'large';

interface SaveStateIconProps {
  variant: SaveStateVariant;
  isSaved: boolean;
  outlineColor?: string;
  checkmarkColor?: string;
}

const PRESETS = {
  small: {
    circleSize: 20,
    borderWidth: 1.5,
    plusSize: 13,
    checkSize: 11,
    strokeWidth: 3,
  },
  medium: {
    circleSize: 24,
    borderWidth: 2,
    plusSize: 16,
    checkSize: 14,
    strokeWidth: 3,
  },
  large: {
    circleSize: 28,
    borderWidth: 2.5,
    plusSize: 19,
    checkSize: 16,
    strokeWidth: 3,
  },
};

export const SaveStateIcon: React.FC<SaveStateIconProps> = ({
  variant,
  isSaved,
  outlineColor = Colors.textPrimary,
  checkmarkColor = '#000000',
}) => {
  const preset = PRESETS[variant] || PRESETS.medium;

  return (
    <View style={styles.container}>
      {isSaved ? (
        <View
          style={[
            styles.iconCircleActive,
            {
              width: preset.circleSize,
              height: preset.circleSize,
              borderRadius: preset.circleSize / 2,
              backgroundColor: Colors.accent,
            },
          ]}
        >
          <Check
            size={preset.checkSize}
            color={checkmarkColor}
            strokeWidth={preset.strokeWidth}
          />
        </View>
      ) : (
        <View
          style={[
            styles.iconCircle,
            {
              width: preset.circleSize,
              height: preset.circleSize,
              borderRadius: preset.circleSize / 2,
              borderWidth: preset.borderWidth,
              borderColor: outlineColor,
            },
          ]}
        >
          <Plus
            size={preset.plusSize}
            color={outlineColor}
            strokeWidth={preset.strokeWidth}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SaveStateIcon;
