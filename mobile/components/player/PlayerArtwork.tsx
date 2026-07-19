import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

interface PlayerArtworkProps {
  artworkGesture: any;
  screenWidth: number;
  artworkSize: number;
  artworkTopSpacing: number;
  artworkBottomSpacing: number;
  children: React.ReactNode;
}

const PlayerArtwork = React.memo(({
  artworkGesture,
  screenWidth,
  artworkSize,
  artworkTopSpacing,
  artworkBottomSpacing,
  children,
}: PlayerArtworkProps) => {


  return (
    <View style={[styles.artworkContainer, { marginTop: artworkTopSpacing, marginBottom: artworkBottomSpacing, overflow: 'hidden', width: screenWidth }]}>
      <GestureDetector gesture={artworkGesture}>
        <View style={{ width: screenWidth, height: artworkSize, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      </GestureDetector>
    </View>
  );
});

PlayerArtwork.displayName = 'PlayerArtwork';

const styles = StyleSheet.create({
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
});

export default PlayerArtwork;
