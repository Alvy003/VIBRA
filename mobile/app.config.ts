// Robust detection for development mode
const IS_DEV =
  process.env.APP_VARIANT === 'development' ||
  process.env.NODE_ENV === 'development' ||
  // Special check for local developer runs where APP_VARIANT might be missing
  (process.env.npm_lifecycle_event && process.env.npm_lifecycle_event.includes('dev'));

const DEV_IP = process.env.EXPO_PUBLIC_LOCAL_DEV_IP || '192.168.1.38';
const API_URL = IS_DEV ? `http://${DEV_IP}:5000` : 'https://vibra-969f.onrender.com';
const AUDIO_PROXY_URL = 'https://audio-proxy.alvyshajan.workers.dev';

export default {
  expo: {
    name: IS_DEV ? 'Vibra (Dev)' : 'Vibra',
    slug: 'vibra-mobile',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/images/vibra.png',
    scheme: 'vibra',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/vibra-1024.png',
      resizeMode: 'contain',
      backgroundColor: '#000000cc'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? 'com.vibra.mobile.dev' : 'com.vibra.mobile',
      buildNumber: '1.0.0',
      infoPlist: {
        UIBackgroundModes: [
          'audio'
        ],
        NSBluetoothAlwaysUsageDescription: 'Vibra needs Bluetooth to discover and connect to your external speakers and headphones.',
        NSBluetoothPeripheralUsageDescription: 'Vibra needs Bluetooth to discover and connect to your external speakers and headphones.'
      }
    },
    android: {
      package: IS_DEV ? 'com.vibra.mobile.dev' : 'com.vibra.mobile',
      adaptiveIcon: {
        foregroundImage: './assets/images/vibra.png',
        backgroundColor: '#121212'
      },
      edgeToEdgeEnabled: true,
      backgroundColor: '#09090b',
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'android.permission.WAKE_LOCK',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.BLUETOOTH_ADVERTISE',
        'android.permission.ACCESS_FINE_LOCATION'
      ],
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            {
              scheme: 'vibra'
            }
          ],
          category: [
            'BROWSABLE',
            'DEFAULT'
          ]
        }
      ]
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/vibra.png'
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      // Using our local manual plugin instead of the broken library plugin
      './plugins/withTrackPlayer.js',
      './plugins/withAudioDeviceModule.js'
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      apiUrl: API_URL,
      audioProxyUrl: AUDIO_PROXY_URL,
      eas: {
        projectId: 'c4a1e1ce-703f-4869-8dad-2ac45de57765'
      }
    },
    owner: 'alvy003'
  }
};
