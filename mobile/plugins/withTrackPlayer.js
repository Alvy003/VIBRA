const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Custom Expo Config Plugin to manually inject TrackPlayer's MusicService
 * into the AndroidManifest.xml. This bypasses the broken internal plugin
 * in react-native-track-player v4.1.2.
 */
module.exports = function withTrackPlayer(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    // Ensure service array exists
    if (!mainApplication.service) mainApplication.service = [];
    const services = mainApplication.service;

    // Check if the service is already there to avoid duplicates
    const hasService = services.some(
      (s) => s.$['android:name'] === 'com.doublesymmetry.trackplayer.service.MusicService'
    );

    if (!hasService) {
      services.push({
        $: {
          'android:name': 'com.doublesymmetry.trackplayer.service.MusicService',
          'android:exported': 'true',
          'android:foregroundServiceType': 'mediaPlayback',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.MEDIA_BUTTON' } },
              { $: { 'android:name': 'android.media.browse.MediaBrowserService' } },
            ],
          },
        ],
      });
    }

    return config;
  });
};
