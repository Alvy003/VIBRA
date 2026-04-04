import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowDown } from 'lucide-react-native';

interface DownloadedIconProps {
  size?: number;
  iconSize?: number;
}

const ACCENT_COLOR = '#9333EA';

export const DownloadedIcon = ({ size = 14, iconSize }: DownloadedIconProps) => {
  const effectiveIconSize = iconSize || size * 0.8;
  
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <ArrowDown size={effectiveIconSize} color="#000000" strokeWidth={3} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: ACCENT_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
