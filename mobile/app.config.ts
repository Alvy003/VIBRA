const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  expo: {
    name: IS_DEV ? 'Vibra (Dev)' : 'Vibra',
    slug: 'vibra-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/vibra-1024.png',
    scheme: 'vibra',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/vibra-1024.png',
      resizeMode: 'contain',
      backgroundColor: '#000000ff'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? 'com.vibra.mobile.dev' : 'com.vibra.mobile',
      buildNumber: '1.0.0',
      infoPlist: {
        UIBackgroundModes: [
          'audio'
        ]
      }
    },
    android: {
      package: IS_DEV ? 'com.vibra.mobile.dev' : 'com.vibra.mobile',
      adaptiveIcon: {
        foregroundImage: './assets/images/vibra-1024.png',
        backgroundColor: '#000000ff'
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'android.permission.WAKE_LOCK'
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
      [
        'expo-audio',
        {
          microphonePermission: 'Vibra needs microphone access to identify songs playing around you.'
        }
      ],
      // Use our local manual plugin instead of the broken library plugin
      './plugins/withTrackPlayer.js'
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: 'c4a1e1ce-703f-4869-8dad-2ac45de57765'
      }
    },
    owner: 'alvy003'
  }
};
