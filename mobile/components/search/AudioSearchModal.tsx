// components/search/AudioSearchModal.tsx
import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  cancelAnimation,
  Easing,
  FadeIn,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { X, AudioLines, Check, RotateCcw } from 'lucide-react-native';
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearchStore } from '@/stores/useSearchStore';
import * as Haptics from 'expo-haptics';

type ModalState = 'idle' | 'listening' | 'recognizing' | 'result' | 'error';

interface AudioSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onResult: (query: string) => void;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AudioSearchModal = ({ visible, onClose, onResult }: AudioSearchModalProps) => {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ModalState>('idle');
  const [resultText, setResultText] = useState({ title: '', artist: '' });
  const [errorText, setErrorText] = useState('');

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const pulse = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setState('idle');
      setResultText({ title: '', artist: '' });
      setErrorText('');
      pulse.value = 1;
      ringScale.value = 1;
      ringOpacity.value = 0;
    } else {
      stopAllAnimations();
    }
  }, [visible]);

  const startPulseAnimation = useCallback(() => {
    // Simple scale pulse
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Ring expansion
    ringScale.value = 1;
    ringOpacity.value = 0.6;
    ringScale.value = withRepeat(
      withTiming(2.5, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [pulse, ringScale, ringOpacity]);

  const stopAllAnimations = useCallback(() => {
    cancelAnimation(pulse);
    cancelAnimation(ringScale);
    cancelAnimation(ringOpacity);
    pulse.value = 1;
    ringScale.value = 1;
    ringOpacity.value = 0;
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [pulse, ringScale, ringOpacity]);

  const startRecognition = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setState('error');
        setErrorText('Microphone permission denied');
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('listening');
      startPulseAnimation();

      timerRef.current = setTimeout(async () => {
        stopAllAnimations();
        setState('recognizing');

        try {
          await recorder.stop();
          const uri = recorder.uri;

          if (!uri) {
            setState('error');
            setErrorText('Could not capture audio');
            return;
          }

          const formData = new FormData();
          formData.append('audio', {
            uri,
            name: 'recording.m4a',
            type: 'audio/m4a',
          } as any);

          const response = await fetch(`${API_BASE}/api/stream/recognize-song`, {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (data?.success && data.title) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setResultText({ title: data.title, artist: data.artist });
            setState('result');
            useSearchStore.getState().setAudioSearchResult({
              title: data.title,
              artist: data.artist,
            });
            
            timerRef.current = setTimeout(() => {
              onResult(`${data.title} ${data.artist}`);
            }, 1500);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setState('error');
            setErrorText("Couldn't identify the song");
          }
        } catch (err) {
          console.error('[AudioSearch] Error:', err);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setState('error');
          setErrorText('Something went wrong');
        }
      }, 7000);
    } catch (err: any) {
      stopAllAnimations();
      setState('error');
      setErrorText(err?.message || 'Microphone error');
    }
  }, [recorder, startPulseAnimation, stopAllAnimations, onResult]);

  const handleClose = useCallback(() => {
    stopAllAnimations();
    if (recorder.isRecording) {
      recorder.stop().catch(() => {});
    }
    onClose();
  }, [stopAllAnimations, recorder, onClose]);

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState('idle');
    setErrorText('');
  }, []);

  const handleButtonPress = useCallback(() => {
    if (state === 'idle') {
      startRecognition();
    }
  }, [state, startRecognition]);

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const buttonPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    if (state === 'idle') {
      buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const getButtonColor = () => {
    switch (state) {
      case 'listening':
        return '#9333ea';
      case 'result':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      default:
        return '#27272a';
    }
  };

  const getIcon = () => {
    switch (state) {
      case 'result':
        return <Check size={36} color="#fff" strokeWidth={2.5} />;
      case 'recognizing':
        return <ActivityIndicator size="large" color="#fff" />;
      default:
        return <AudioLines size={36} color="#fff" strokeWidth={1.8} />;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Sheet */}
        <Animated.View
          entering={SlideInDown.duration(250).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(200)}
          style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color="#71717a" />
          </TouchableOpacity>

          {/* Main content */}
          <View style={styles.content}>
            {/* Main button/indicator */}
            <View style={styles.buttonContainer}>
              {/* Pulse ring */}
              {state === 'listening' && (
                <Animated.View style={[styles.pulseRing, ringStyle]} />
              )}

              {/* Main circle button */}
              <AnimatedPressable
                onPress={handleButtonPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={state !== 'idle'}
                style={[
                  styles.mainButton,
                  { backgroundColor: getButtonColor() },
                  pulseStyle,
                  buttonPressStyle,
                ]}
              >
                {getIcon()}
              </AnimatedPressable>
            </View>

            {/* Status text */}
            <View style={styles.textContainer}>
              {state === 'idle' && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <Text style={styles.title}>Tap to identify</Text>
                  <Text style={styles.subtitle}>
                    Make sure the music is audible
                  </Text>
                </Animated.View>
              )}

              {state === 'listening' && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <Text style={styles.title}>Listening...</Text>
                  <Text style={styles.subtitle}>
                    Hold your phone near the music
                  </Text>
                </Animated.View>
              )}

              {state === 'recognizing' && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <Text style={styles.title}>Identifying...</Text>
                  <Text style={styles.subtitle}>
                    Searching for matches
                  </Text>
                </Animated.View>
              )}

              {state === 'result' && (
                <Animated.View 
                  entering={FadeIn.duration(200)} 
                  style={styles.resultContainer}
                >
                  <Text style={styles.resultTitle}>{resultText.title}</Text>
                  <Text style={styles.resultArtist}>{resultText.artist}</Text>
                </Animated.View>
              )}

              {state === 'error' && (
                <Animated.View 
                  entering={FadeIn.duration(200)}
                  style={styles.errorContainer}
                >
                  <Text style={styles.errorTitle}>{errorText}</Text>
                  <Text style={styles.errorSubtitle}>
                    Make sure the music is playing clearly
                  </Text>
                  
                  <TouchableOpacity
                    onPress={handleRetry}
                    style={styles.retryButton}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={18} color="#fff" />
                    <Text style={styles.retryText}>Try again</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

AudioSearchModal.displayName = 'AudioSearchModal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  sheet: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 16,
  },
  buttonContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#9333ea',
  },
  mainButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    minHeight: 120,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#71717a',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  resultArtist: {
    color: '#a1a1aa',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  errorSubtitle: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#27272a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});