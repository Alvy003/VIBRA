// components/MarqueeText.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
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
  duration = 6000,
  delay = 2000,
  fadeWidth = 20,
  disableFade = false,
}: MarqueeTextProps) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontSize = flatStyle.fontSize || 16;
  const lineHeight = flatStyle.lineHeight || fontSize * 1.3;

  const ticker = (
    <TextTicker
      style={style}
      duration={duration}
      loop
      bounce
      repeatSpacer={50}
      marqueeDelay={delay}
      shouldAnimateTreshold={10}
      animationType="bounce"
      bouncePadding={{ left: 0, right: 0 }}
    >
      {text}
    </TextTicker>
  );

  if (disableFade) {
    return (
      <View style={[styles.container, { height: lineHeight }]}>
        {ticker}
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: lineHeight }]}>
      <MaskedView
        style={styles.maskedView}
        maskElement={
          <View style={styles.maskRow}>
            <LinearGradient
              colors={['transparent', '#000']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: fadeWidth, height: '100%' }}
            />
            <View style={styles.solidMask} />
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
  },
});