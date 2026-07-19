import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { Share2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import DeviceSelector from '../DeviceSelector';
import { QueueIcon } from '../SharpIcons';

interface SecondaryControlsProps {
  isTinyScreen: boolean;
  secondaryControlsStageStyle: any;
  handleShare: () => void;
}

const SecondaryControls = React.memo(({
  isTinyScreen,
  secondaryControlsStageStyle,
  handleShare,
}: SecondaryControlsProps) => {
  // Store Subscriptions
  const setQueueVisible = usePlayerUIStore(s => s.setQueueVisible);

  return (
    <Animated.View style={[styles.subActions, { marginTop: isTinyScreen ? 2 : 10, marginBottom: isTinyScreen ? 10 : 30 }, secondaryControlsStageStyle]}>
      <DeviceSelector compact />

      <View style={styles.subActionsRight}>
        <TouchableOpacity style={styles.subActionButton} activeOpacity={0.7} onPress={handleShare}>
          <Share2 size={18} color="rgba(218, 214, 214, 1)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.subActionButton}
          activeOpacity={0.7}
          onPress={() => setQueueVisible(true)}
        >
          <QueueIcon size={18} color="rgba(218, 214, 214, 1)" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

SecondaryControls.displayName = 'SecondaryControls';

const styles = StyleSheet.create({
  subActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  subActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subActionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SecondaryControls;
