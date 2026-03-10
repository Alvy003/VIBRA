import { useOAuth } from '@clerk/clerk-expo';
import React, { useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useWarmUpBrowser } from '@/hooks/useWarmUpBrowser';

WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  useWarmUpBrowser();

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(20)).current;
  const bottomOpacity = useRef(new Animated.Value(0)).current;
  const bottomTranslateY = useRef(new Animated.Value(16)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        setActive!({ session: createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error', err);
    }
  }, []);

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
                source={require('../../assets/images/vibra.png')}
                style={styles.logo}
                resizeMode="contain"
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
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerLabel}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
              >
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
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
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  heroHighlight: {
    color: '#7F00FF',
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
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 28,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  signUpText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});