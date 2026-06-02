// components/DeviceSelector.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import {
  Smartphone,
  Bluetooth,
  Speaker,
  Headphones,
  Tv,
  X,
  Radio,
  RefreshCw,
  Volume2,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { SharpDevice } from './SharpIcons';
import BottomSheet, { BottomSheetRef } from './BottomSheet';
import { useNativeAudioDevices, AudioDevice } from '@/hooks/useNativeAudioDevices';
import Colors from '@/constants/Colors';

let IntentLauncher: any = null;
try {
  IntentLauncher = require('expo-intent-launcher');
} catch (e) { }

const ACCENT_COLOR = Colors.accent;

const waveStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12 },
  bar: { width: 3, backgroundColor: ACCENT_COLOR, borderRadius: 1.5 },
});

// ─── Device Icon ───
export const DeviceIcon = ({ type, size = 24, color = '#fff', strokeWidth = 2 }: {
  type: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) => {
  switch (type) {
    case 'bluetooth':
      return <Bluetooth size={size} color={color} strokeWidth={strokeWidth} />;
    case 'speaker':
      return <Speaker size={size} color={color} strokeWidth={strokeWidth} />;
    case 'headphones':
      return <Headphones size={size} color={color} strokeWidth={strokeWidth} />;
    case 'tv':
      return <Tv size={size} color={color} strokeWidth={strokeWidth} />;
    case 'cast':
      return <Radio size={size} color={color} strokeWidth={strokeWidth} />;
    case 'airplay':
      return <Volume2 size={size} color={color} strokeWidth={strokeWidth} />;
    case 'local':
      return <SharpDevice size={size} color={color} />;
    default:
      return <Speaker size={size} color={color} strokeWidth={strokeWidth} />;
  }
};

// ─── Scanning Indicator ───
const ScanningIndicator = React.memo(() => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <RefreshCw size={18} color="rgba(255,255,255,0.6)" />
    </Animated.View>
  );
});

// ─── Device Row ───
const DeviceRow = React.memo(({
  device,
  isActive,
  onPress,
}: {
  device: AudioDevice;
  isActive: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    style={[styles.deviceRow, isActive && styles.deviceRowActive]}
    onPress={onPress}
    activeOpacity={0.6}
    disabled={isActive}
  >
    <View style={[styles.deviceIconSmall, isActive && styles.deviceIconSmallActive]}>
      <DeviceIcon
        type={device.type}
        size={20}
        color={isActive ? ACCENT_COLOR : '#fff'}
        strokeWidth={2}
      />
    </View>
    <View style={styles.deviceRowInfo}>
      <Text style={[styles.deviceRowName, isActive && styles.deviceRowNameActive]}>
        {device.name}
      </Text>
      {device.isBluetooth && (
        <Text style={styles.deviceRowType}>Bluetooth</Text>
      )}
    </View>
    {isActive && <Check size={20} color={ACCENT_COLOR} strokeWidth={2.5} />}
  </TouchableOpacity>
));

// ─── Main Component ───
interface DeviceSelectorProps {
  compact?: boolean; // For FullScreenPlayer integration
  showPill?: boolean;
}

export interface DeviceSelectorRef {
  open: () => void;
  close: () => void;
}

const DeviceSelector = React.forwardRef<DeviceSelectorRef, DeviceSelectorProps>(
  ({ compact = false, showPill = true }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const bottomSheetRef = useRef<BottomSheetRef>(null);

    const {
      currentDevice,
      allDevices,
      isScanning,
      isNativeAvailable,
      showAudioPicker,
      refresh
    } = useNativeAudioDevices();

    // Expose methods to parent
    React.useImperativeHandle(ref, () => ({
      open: handleOpenModal,
      close: handleCloseModal,
    }));

    const handleDeviceTap = async (device: AudioDevice) => {

      if (device.isActive) return;

      const hasNativePicker = await showAudioPicker();

      if (!hasNativePicker) {
        handleOpenBluetoothSettings();
      }
    };

    const handleOpenModal = () => {
      setIsOpen(true);
      refresh();
    };

    const handleCloseModal = () => setIsOpen(false);

    const handleRefresh = () => {
      refresh();
    };

    const handleOpenBluetoothSettings = async () => {
      try {
        if (Platform.OS === 'android' && IntentLauncher) {
          await IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.BLUETOOTH_SETTINGS
          );
        } else if (Platform.OS === 'ios') {
          await Linking.openURL('App-Prefs:Bluetooth');
        } else {
          await Linking.openSettings();
        }
      } catch {
        Linking.openSettings();
      }
    };

    const handleHelpPress = () => {
      handleOpenBluetoothSettings();
    };

    const otherDevices = allDevices.filter(
      d => d.id !== currentDevice?.id && d.isBluetooth
    );

    const renderHeader = () => (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connect</Text>
      </View>
    );

    return (
      <>
        {/* Trigger Pill */}
        {showPill && (
          <TouchableOpacity
            style={[styles.pill, compact && styles.pillCompact]}
            onPress={handleOpenModal}
            activeOpacity={0.7}
          >
            <DeviceIcon
              type={currentDevice?.type || 'local'}
              size={compact ? 20 : 16}
              color={currentDevice?.type === 'local' || !currentDevice ? 'rgba(218, 214, 214, 1)' : ACCENT_COLOR}
            />
            {currentDevice?.type !== 'local' && currentDevice && (
              <Text
                style={[styles.pillText, compact && styles.pillTextCompact]}
                numberOfLines={1}
              >
                {currentDevice?.name}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Bottom Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          isOpen={isOpen}
          onClose={handleCloseModal}
          snapPoints={['65%', '96.5%']}
          header={renderHeader()}
          footer={
            <TouchableOpacity
              style={styles.btFooterButton}
              onPress={handleOpenBluetoothSettings}
              activeOpacity={0.8}
            >
              <Bluetooth size={22} color="#fff" strokeWidth={2} />
              <Text style={styles.btFooterText}>Find Bluetooth devices</Text>
            </TouchableOpacity>
          }
        >
          {/* Current Device */}
          <View style={styles.currentDeviceCard}>
            <View style={styles.currentDevice}>
              <View style={styles.currentDeviceIcon}>
                <DeviceIcon
                  type={currentDevice?.type || 'local'}
                  size={24}
                  color={currentDevice?.type === 'local' || !currentDevice ? Colors.accent : Colors.accent}
                  strokeWidth={2.5}
                />
              </View>
              <View style={styles.currentDeviceInfo}>
                <View style={styles.currentDeviceNameRow}>
                  <Text
                    style={[styles.currentDeviceName, (currentDevice?.type === 'local' || !currentDevice) ? styles.currentDeviceNameNeutral : styles.currentDeviceNameActive]}
                  >
                    {currentDevice?.type === 'local' ? 'This Phone' : (currentDevice?.name || 'This Phone')}
                  </Text>
                </View>
                <Text style={styles.currentDeviceStatus}>
                  {currentDevice?.isBluetooth ? 'Connected via Bluetooth' : 'Listening on this device'}
                </Text>
              </View>
            </View>
          </View>

          {/* Scanning */}
          {isScanning && (
            <View style={styles.scanningRow}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
              <Text style={styles.scanningText}>Looking for devices...</Text>
            </View>
          )}

          {/* Other Bluetooth Devices */}
          {otherDevices.length > 0 ? (
            <>
              {/* <Text style={styles.sectionTitle}>Other devices</Text> */}
              {otherDevices.map(device => (
                <DeviceRow
                  key={device.id}
                  device={device}
                  isActive={false}
                  onPress={() => handleDeviceTap(device)}
                />
              ))}
            </>
          ) : null}
        </BottomSheet>
      </>
    );
  }
);

export default DeviceSelector;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxWidth: 200,
  },
  pillCompact: {
    gap: 6,
    paddingVertical: 6,
  },
  pillText: {
    color: ACCENT_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextCompact: {
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingTop: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDeviceCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 15,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
  },
  currentDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 0,
  },
  currentDeviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentDeviceInfo: {
    flex: 1,
  },
  currentDeviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentDeviceName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  currentDeviceNameActive: {
    color: ACCENT_COLOR,
  },
  currentDeviceNameNeutral: {
    color: ACCENT_COLOR,
  },
  currentDeviceStatus: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  scanningText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginRight: 10,
    marginLeft: 10,
  },
  deviceRowActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  deviceIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    marginLeft: 7,
  },
  deviceIconSmallActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  deviceRowInfo: {
    flex: 1,
  },
  deviceRowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  deviceRowNameActive: {
    color: ACCENT_COLOR,
  },
  deviceRowType: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  settingsSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  btFooterButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  btFooterText: {
    color: '#fff',
    fontSize: 10.5,
    fontWeight: '500',
  },
});