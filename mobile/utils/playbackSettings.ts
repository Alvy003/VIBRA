import { AudioQualitySetting } from '@/stores/useSettingsStore';

/**
 * Resolves the preferred audio bitrate based on connection type and settings.
 *
 * @param connectionType Active network connection type (from NetInfo, e.g., 'wifi', 'cellular')
 * @param wifiSetting User's Wi-Fi streaming quality setting
 * @param mobileSetting User's Mobile streaming quality setting
 * @returns Resolved bitrate value ('320' | '160' | '96')
 */
export const resolvePreferredBitrate = (
  connectionType: string,
  wifiSetting: AudioQualitySetting,
  mobileSetting: AudioQualitySetting
): '320' | '160' | '96' => {
  const isWifi = connectionType === 'wifi' || connectionType === 'ethernet';
  const setting = isWifi ? wifiSetting : mobileSetting;

  switch (setting) {
    case 'low':
      return '96';
    case 'medium':
      return '160';
    case 'high':
      return '320';
    case 'automatic':
    default:
      return isWifi ? '320' : '160';
  }
};
