// components/MarqueeText.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marquee } from '@animatereactnative/marquee';
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

  const [isReady, setIsReady] = React.useState(false);

  // Consider it overflowing only if it exceeds the animation threshold securely
  const isOverflowing = containerWidth > 0 && textWidth > containerWidth + 2;

  React.useEffect(() => {
    if (isOverflowing && !disableFade) {
      setIsReady(false);
      const timer = setTimeout(() => {
        setIsReady(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isOverflowing, delay, disableFade]);

  const ticker = (
    <Marquee
      spacing={50}
      speed={isReady ? 0.5 : 0}
      style={style}
    >
      <Text style={style}>{text}</Text>
    </Marquee>
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

      {/* Static text visible instantly, stays visible during delay */}
      {(!isOverflowing || disableFade || !isReady) && (
        <View style={[styles.tickerWrapper, { height: lineHeight, position: (isOverflowing && !disableFade) ? 'absolute' : 'relative', top: 0, left: 0 }]}>
          <Text style={style} numberOfLines={1}>{text}</Text>
        </View>
      )}

      {/* Marquee mounts invisibly to measure, then fades in and starts moving after delay */}
      {isOverflowing && !disableFade && (
        <View style={{ flex: 1, opacity: isReady ? 1 : 0 }}>
          <MaskedView
            style={styles.maskedView}
            maskElement={
              <LinearGradient
                colors={['transparent', '#000', '#000', 'transparent']}
                locations={[0, 0.05, 0.95, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.maskRow}
              />
            }
          >
            <View style={[styles.tickerWrapper, { height: lineHeight }]}>
              {ticker}
            </View>
          </MaskedView>
        </View>
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
    width: '100%',
    height: '100%',
  },
  tickerWrapper: {
    justifyContent: 'center',
    width: '100%',
  },
});