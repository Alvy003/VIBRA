// hooks/useNativeAudioDevices.ts
import { useState, useEffect, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import * as Device from 'expo-device';

const { AudioDeviceModule } = NativeModules;

export interface AudioDevice {
  id: string;
  name: string;
  type: 'local' | 'bluetooth' | 'headphones' | 'speaker' | 'airplay' | 'cast';
  isBluetooth: boolean;
  isConnected: boolean;
  isActive?: boolean;
}

export const useNativeAudioDevices = () => {
  const [currentDevice, setCurrentDevice] = useState<AudioDevice | null>(null);
  const [allDevices, setAllDevices] = useState<AudioDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);

  useEffect(() => {
    setIsNativeAvailable(!!AudioDeviceModule);
  }, []);

  const getCurrentOutput = useCallback(async (): Promise<AudioDevice> => {
    if (!AudioDeviceModule) {
      return {
        id: 'local',
        name: Device.deviceName || Device.modelName || 'This Device',
        type: 'local',
        isBluetooth: false,
        isConnected: true,
        isActive: true,
      };
    }

    try {
      const result = await AudioDeviceModule.getCurrentAudioOutput();
      return {
        id: result.id?.toString() || 'local',
        name: result.name || Device.modelName || 'This Device',
        type: result.type || 'local',
        isBluetooth: result.isBluetooth || false,
        isConnected: true,
        isActive: true,
      };
    } catch (error) {
      console.log('Error getting audio output:', error);
      return {
        id: 'local',
        name: Device.deviceName || Device.modelName || 'This Device',
        type: 'local',
        isBluetooth: false,
        isConnected: true,
        isActive: true,
      };
    }
  }, []);

  const getAllDevices = useCallback(async (): Promise<AudioDevice[]> => {
    if (!AudioDeviceModule) {
      const local = await getCurrentOutput();
      return [local];
    }

    try {
      const devices = await AudioDeviceModule.getConnectedDevices();
      const current = await getCurrentOutput();
      
      return devices.map((d: any) => ({
        id: d.id?.toString() || 'unknown',
        name: d.name || 'Unknown Device',
        type: d.type || 'speaker',
        isBluetooth: d.isBluetooth || false,
        isConnected: true,
        isActive: d.id?.toString() === current.id,
      }));
    } catch (error) {
      console.log('Error getting devices:', error);
      const local = await getCurrentOutput();
      return [local];
    }
  }, [getCurrentOutput]);

  const scanForDevices = useCallback(async () => {
    setIsScanning(true);
    
    try {
      const [current, all] = await Promise.all([
        getCurrentOutput(),
        getAllDevices(),
      ]);
      
      setCurrentDevice(current);
      setAllDevices(all);
    } catch (error) {
      console.log('Scan error:', error);
    } finally {
      setIsScanning(false);
    }
  }, [getCurrentOutput, getAllDevices]);

  // Show native audio picker
  const showAudioPicker = useCallback(async (): Promise<boolean> => {
    if (!AudioDeviceModule?.showAudioRoutePicker) {
      return false;
    }
    
    try {
      const result = await AudioDeviceModule.showAudioRoutePicker();
      // Refresh after picker closes
      setTimeout(() => scanForDevices(), 1000);
      return result;
    } catch (error) {
      console.log('Error showing picker:', error);
      return false;
    }
  }, [scanForDevices]);

  useEffect(() => {
    if (!AudioDeviceModule) return;

    AudioDeviceModule.startListening?.();

    const eventEmitter = new NativeEventEmitter(AudioDeviceModule);
    const subscription = eventEmitter.addListener('onAudioDeviceChanged', () => {
      scanForDevices();
    });

    scanForDevices();

    return () => {
      subscription.remove();
      AudioDeviceModule.stopListening?.();
    };
  }, [scanForDevices]);

  return {
    currentDevice,
    allDevices,
    isScanning,
    isNativeAvailable,
    scanForDevices,
    showAudioPicker,
    refresh: scanForDevices,
  };
};