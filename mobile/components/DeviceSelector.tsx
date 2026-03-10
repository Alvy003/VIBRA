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
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetRef } from './BottomSheet';
import { useNativeAudioDevices, AudioDevice } from '@/hooks/useNativeAudioDevices';

let IntentLauncher: any = null;
try {
  IntentLauncher = require('expo-intent-launcher');
} catch (e) {}

const ACCENT_COLOR = '#8B5CF6';

// ─── Sound Wave Animation ───
const SoundWave = React.memo(() => {
  const bar1 = useSharedValue(0.3);
  const bar2 = useSharedValue(0.5);
  const bar3 = useSharedValue(0.4);
  const bar4 = useSharedValue(0.6);

  React.useEffect(() => {
    bar1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      true
    );
    bar2.value = withDelay(100, withRepeat(
      withSequence(
        withTiming(0.8, { duration: 350 }),
        withTiming(0.4, { duration: 350 })
      ),
      -1,
      true
    ));
    bar3.value = withDelay(200, withRepeat(
      withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.2, { duration: 300 })
      ),
      -1,
      true
    ));
    bar4.value = withDelay(150, withRepeat(
      withSequence(
        withTiming(0.7, { duration: 450 }),
        withTiming(0.5, { duration: 450 })
      ),
      -1,
      true
    ));
  }, []);

  const bar1Style = useAnimatedStyle(() => ({ height: 12 * bar1.value }));
  const bar2Style = useAnimatedStyle(() => ({ height: 12 * bar2.value }));
  const bar3Style = useAnimatedStyle(() => ({ height: 12 * bar3.value }));
  const bar4Style = useAnimatedStyle(() => ({ height: 12 * bar4.value }));

  return (
    <View style={waveStyles.container}>
      <Animated.View style={[waveStyles.bar, bar1Style]} />
      <Animated.View style={[waveStyles.bar, bar2Style]} />
      <Animated.View style={[waveStyles.bar, bar3Style]} />
      <Animated.View style={[waveStyles.bar, bar4Style]} />
    </View>
  );
});

const waveStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12 },
  bar: { width: 3, backgroundColor: ACCENT_COLOR, borderRadius: 1.5 },
});

// ─── Device Icon ───
const DeviceIcon = ({ type, size = 24, color = '#fff' }: { 
  type: string; 
  size?: number; 
  color?: string;
}) => {
  switch (type) {
    case 'bluetooth':
      return <Bluetooth size={size} color={color} />;
    case 'speaker':
      return <Speaker size={size} color={color} />;
    case 'headphones':
      return <Headphones size={size} color={color} />;
    case 'tv':
      return <Tv size={size} color={color} />;
    case 'cast':
      return <Radio size={size} color={color} />;
    case 'airplay':
      return <Volume2 size={size} color={color} />;
    case 'local':
      return <Smartphone size={size} color={color} />;
    default:
      return <Speaker size={size} color={color} />;
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
}

export default function DeviceSelector({ compact = false }: DeviceSelectorProps) {
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

  const handleDeviceTap = async (device: AudioDevice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (device.isActive) return;
    
    const hasNativePicker = await showAudioPicker();
    
    if (!hasNativePicker) {
      Alert.alert(
        'Switch Audio Output',
        `To switch to ${device.name}, please use your device's audio settings or Control Center.`,
        [
          { text: 'Open Settings', onPress: handleOpenBluetoothSettings },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  const handleOpenModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
    refresh();
  };

  const handleCloseModal = () => setIsOpen(false);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refresh();
  };

  const handleOpenBluetoothSettings = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Connect a Device',
      'To play music on a Bluetooth device:\n\n' +
      '1. Open Bluetooth settings\n' +
      '2. Turn on your Bluetooth device\n' +
      '3. Pair it with your phone\n\n' +
      'Audio will automatically route to connected devices.',
      [
        { text: 'Open Settings', onPress: handleOpenBluetoothSettings },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const otherDevices = allDevices.filter(
    d => d.id !== currentDevice?.id && d.isBluetooth
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Current device</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleRefresh}
          activeOpacity={0.7}
          disabled={isScanning}
        >
          {isScanning ? <ScanningIndicator /> : (
            <RefreshCw size={20} color="rgba(255,255,255,0.6)" />
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleCloseModal}
          activeOpacity={0.7}
        >
          <X size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      {/* Trigger Pill */}
      <TouchableOpacity
        style={[styles.pill, compact && styles.pillCompact]}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <DeviceIcon 
          type={currentDevice?.type || 'local'} 
          size={compact ? 18 : 16} 
          color={ACCENT_COLOR}
        />
        <Text 
          style={[styles.pillText, compact && styles.pillTextCompact]} 
          numberOfLines={1}
        >
          {currentDevice?.name || 'This Device'}
        </Text>
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        isOpen={isOpen}
        onClose={handleCloseModal}
        snapPoints={[otherDevices.length > 0 ? 0.55 : 0.45]}
        header={renderHeader()}
      >
        {/* Current Device */}
        <View style={styles.currentDevice}>
          <View style={styles.currentDeviceIcon}>
            <DeviceIcon 
              type={currentDevice?.type || 'local'} 
              size={28} 
              color={ACCENT_COLOR} 
            />
          </View>
          <View style={styles.currentDeviceInfo}>
            <View style={styles.currentDeviceNameRow}>
              <Text style={styles.currentDeviceName}>
                {currentDevice?.name || 'This Device'}
              </Text>
              <SoundWave />
            </View>
            <Text style={styles.currentDeviceStatus}>
              {currentDevice?.isBluetooth ? 'Connected via Bluetooth' : 'Listening on this device'}
            </Text>
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
        {otherDevices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Other devices</Text>
            {otherDevices.map(device => (
              <DeviceRow
                key={device.id}
                device={device}
                isActive={false}
                onPress={() => handleDeviceTap(device)}
              />
            ))}
          </>
        )}

        <View style={styles.divider} />

        {/* Bluetooth Settings */}
        <TouchableOpacity 
          style={styles.settingsRow}
          onPress={handleOpenBluetoothSettings}
          activeOpacity={0.6}
        >
          <View style={styles.settingsIcon}>
            <Bluetooth size={22} color="#fff" />
          </View>
          <View style={styles.settingsInfo}>
            <Text style={styles.settingsTitle}>Connect to a device</Text>
            <Text style={styles.settingsSubtitle}>Open Bluetooth settings</Text>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        {/* Help */}
        <TouchableOpacity 
          style={styles.helpLink}
          onPress={handleHelpPress}
          activeOpacity={0.6}
        >
          <Text style={styles.helpLinkText}>Don't see your device?</Text>
        </TouchableOpacity>
      </BottomSheet>
    </>
  );
}

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
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
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
  currentDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  currentDeviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
    color: ACCENT_COLOR,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  currentDeviceStatus: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconSmallActive: {
    backgroundColor: 'rgba(29, 185, 84, 0.15)',
  },
  deviceRowInfo: {
    flex: 1,
  },
  deviceRowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  helpLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  helpLinkText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
});