// lib/trackPlayerSetup.ts
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  Event,
} from 'react-native-track-player';

let isSetup = false;

export async function setupPlayer(): Promise<boolean> {
  if (isSetup) return true;

  try {
    await TrackPlayer.setupPlayer({
      waitForBuffer: true,
      autoHandleInterruptions: true,
    });

    await TrackPlayer.updateOptions({
      // Android notification settings
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        alwaysPauseOnInterruption: true,
        icon: require('../assets/images/vibra-512.png'),
        // @ts-ignore
        stopForegroundServiceOnPause: false, // Keeps controls alive in some Android 14 versions
      },

      // Capabilities for all media controllers
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],

      // Compact notification capabilities
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],

      // Specifically for the system notification
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],

      // Progress updating info
      progressUpdateEventInterval: 2,
    });

    // Set default repeat mode
    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    isSetup = true;
    console.log('[TrackPlayer] Setup complete');
    return true;
  } catch (error) {
    console.error('[TrackPlayer] Setup failed:', error);
    return false;
  }
}

export async function resetPlayer(): Promise<void> {
  try {
    await TrackPlayer.reset();
  } catch (error) {
    console.error('[TrackPlayer] Reset failed:', error);
  }
}

export { isSetup };