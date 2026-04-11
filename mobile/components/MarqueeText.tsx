// components/MarqueeText.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TextTicker from 'react-native-text-ticker';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface MarqueeTextProps {
  text: string;
  style?: any;
  duration?: number;
  delay?: number;
  fadeWidth?: number;
  disableFade?: boolean;
}

const MarqueeText = React.memo(({
  text,
  style,
  duration = 10000,
  delay = 2000,
  fadeWidth = 24,
  disableFade = false,
}: MarqueeTextProps) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = flatStyle.fontSize || 16;
  const lineHeight = flatStyle.lineHeight || fontSize * 1.3;

  const [containerWidth, setContainerWidth] = React.useState(0);
  const [textWidth, setTextWidth] = React.useState(0);

  // Consider it overflowing only if it exceeds the animation threshold securely
  const isOverflowing = containerWidth > 0 && textWidth > containerWidth + 2;

  // Calculate dynamic duration based on text width to maintain constant speed
  const dynamicDuration = React.useMemo(() => {
    // Speed: ~40 pixels per second (Standard for music apps like Spotify)
    const speed = 30;
    if (textWidth > 0) {
      return (textWidth / speed) * 1000;
    }
    // Fallback if measurement hasn't happened yet
    return (text.length * 10 / speed) * 1000;
  }, [textWidth, text, duration]);

  const ticker = (
    <TextTicker
      style={style}
      duration={dynamicDuration}
      loop
      bounce={false}
      repeatSpacer={50}
      marqueeDelay={delay}
      shouldAnimateTreshold={10}
      animationType="auto"
    >
      {text}
    </TextTicker>
  );

  return (
    <View 
      style={[styles.container, { height: lineHeight }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Text
        pointerEvents="none"
        style={[style, { position: 'absolute', opacity: 0, width: 5000, left: -9999 }]}
        onTextLayout={(e) => {
          if (e.nativeEvent.lines.length > 0) {
            setTextWidth(e.nativeEvent.lines[0].width);
          }
        }}
      >
        {text}
      </Text>

      {(!isOverflowing || disableFade) ? (
        <View style={[styles.tickerWrapper, { height: lineHeight }]}>
          <Text style={style} numberOfLines={1}>{text}</Text>
        </View>
      ) : (
        <MaskedView
          style={styles.maskedView}
          maskElement={
            <View style={styles.maskRow}>
              {/* Spotify uses a sharp clip on the left, so no mask gradient here! */}
              <View style={styles.solidMask} />
              {/* Only the right edge fades out to indicate more text */}
              <LinearGradient
                colors={['#000', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ width: fadeWidth, height: '100%' }}
              />
            </View>
          }
        >
          <View style={[styles.tickerWrapper, { height: lineHeight }]}>
            {ticker}
          </View>
        </MaskedView>
      )}
    </View>
  );
});

MarqueeText.displayName = 'MarqueeText';
export default MarqueeText;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
  },
  maskedView: {
    flex: 1,
  },
  maskRow: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  solidMask: {
    flex: 1,
    backgroundColor: '#000',
  },
  tickerWrapper: {
    justifyContent: 'center',
    width: '100%',
  },
});