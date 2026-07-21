import { useOAuth } from '@clerk/clerk-expo';
import React, { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  StyleSheet,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useWarmUpBrowser } from '@/hooks/useWarmUpBrowser';
import { useAuthBootstrapStore } from '@/stores/useAuthBootstrapStore';
import Colors from '@/constants/Colors';


WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  useWarmUpBrowser();

  const { loginSyncState, setLoginSyncState } = useAuthBootstrapStore();

  const [isLoading, setIsLoading] = useState(false);

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(20)).current;
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const bottomTranslateY = useRef(new Animated.Value(16)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Pulsing logo animation values for transition
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  // Initialize loginSyncState to idle when the screen mounts
  useEffect(() => {
    setLoginSyncState('idle');
  }, []);

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(heroTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(bottomOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(bottomTranslateY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Premium pulsing logo animation effect
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (loginSyncState !== 'idle') {
      animation = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 1.06,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 0.94,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0.6,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 1.0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      animation.start();
    } else {
      pulseScale.setValue(1);
      pulseOpacity.setValue(1);
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [loginSyncState]);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const onPress = React.useCallback(async () => {
    if (isLoading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      setIsLoading(true);
      setLoginSyncState('authenticating');
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        setLoginSyncState('syncing_library');
        await setActive!({ session: createdSessionId });
      } else {
        setIsLoading(false);
        setLoginSyncState('idle');
      }
    } catch (err) {
      Sentry.captureException(err);
      setIsLoading(false);
      setLoginSyncState('idle');
    }
  }, [isLoading]);

  if (loginSyncState !== 'idle') {
    let primaryText = "Connecting...";
    let secondaryText = "Please wait a moment.";

    if (loginSyncState === 'authenticating') {
      primaryText = "Connecting to Google...";
      secondaryText = "Please wait a moment.";
    } else if (loginSyncState === 'syncing_library') {
      primaryText = "Syncing your library...";
      secondaryText = "Almost there...";
    } else if (loginSyncState === 'preparing_account') {
      primaryText = "Preparing your account...";
      secondaryText = "This only takes a moment.";
    }

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.transitionContainer}>
            <Animated.Image
              source={require('../../assets/images/vibra-white.png')}
              style={[
                styles.logoTransition,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                }
              ]}
              resizeMode="contain"
              tintColor={Colors.accent}
            />
            <Text style={styles.transitionPrimaryText}>{primaryText}</Text>
            <Text style={styles.transitionSecondaryText}>{secondaryText}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.inner}>

          {/* Center: Logo + Hero text */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: heroOpacity,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}
          >
            <Image
              source={require('../../assets/images/vibra-white.png')}
              style={styles.logo}
              resizeMode="contain"
              tintColor={Colors.accent}
            />
            <Text style={styles.heroText}>
              Millions of songs.{'\n'}Free on{' '}
              <Text style={styles.heroHighlight}>Vibra</Text>.
            </Text>
          </Animated.View>

          {/* Bottom: Actions */}
          <Animated.View
            style={[
              styles.bottomSection,
              {
                opacity: bottomOpacity,
                transform: [{ translateY: bottomTranslateY }],
              },
            ]}
          >
            {/* Google Sign In */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={styles.googleButton}
              >
                <Image
                  source={require('../../assets/images/g-logo.png')}
                  style={styles.googleIcon}
                  resizeMode="contain"
                />
                {isLoading ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
  },

  logo: {
    width: 80,   // was 56
    height: 80,
    marginBottom: 24,
  },

  // Hero
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  heroHighlight: {
    color: Colors.accent,
  },

  // Bottom
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 28,
  },
  googleButton: {
    width: '100%',
    height: 52,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  signUpText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  transitionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoTransition: {
    width: 100,
    height: 100,
    marginBottom: 36,
  },
  transitionPrimaryText: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  transitionSecondaryText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});