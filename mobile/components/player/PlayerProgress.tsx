import React from 'react';
import Animated from 'react-native-reanimated';
import ProgressBar from '../ProgressBar';
import TimeDisplay from '../TimeDisplay';

interface PlayerProgressProps {
  controlsStageStyle: any;
  handleSeek: (value: number) => Promise<void>;
}

const PlayerProgress = React.memo(({
  controlsStageStyle,
  handleSeek,
}: PlayerProgressProps) => {

  return (
    <Animated.View style={controlsStageStyle}>
      <ProgressBar onSeek={handleSeek} />
      <TimeDisplay />
    </Animated.View>
  );
});

PlayerProgress.displayName = 'PlayerProgress';

export default PlayerProgress;
