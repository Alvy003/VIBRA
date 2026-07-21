import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react'; // Added useCallback
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';

import * as SecureStore from 'expo-secure-store';
import { useNetInfo } from '@react-native-community/netinfo';
import { PostHogProvider } from 'posthog-react-native';
import { initAnalytics } from '@/lib/analytics';
import Colors from '@/constants/Colors'; // Added Colors import
import * as Sentry from '@sentry/react-native';

const reactNavigationIntegration = Sentry.reactNavigationIntegration();
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  debug: false,
  tracesSampleRate: __DEV__ ? 1.0 : 0.05,
  integrations: [
    reactNavigationIntegration,
  ],
  // Filter out unwanted errors and sanitize URLs
  beforeSend(event, hint) {
    try {
      const message = event.message || '';
      const exceptionValue = event.exception?.values?.[0]?.value || '';
      const exceptionType = event.exception?.values?.[0]?.type || '';

      // 1. Ignore AbortController cancellation errors and benign noise
      const isCanceled =
        message.includes('canceled') ||
        message.includes('ERR_CANCELED') ||
        message.includes('AbortError') ||
        exceptionValue.includes('canceled') ||
        exceptionValue.includes('ERR_CANCELED') ||
        exceptionValue.includes('AbortError') ||
        exceptionValue.includes('canceled request') ||
        exceptionType.includes('AbortError');

      if (isCanceled) {
        return null;
      }

      // Ignore harmless React warnings (we don't want JS warnings to spam Sentry)
      if (
        message.includes('React state update') ||
        exceptionValue.includes('React state update')
      ) {
        return null;
      }

      // 2. Sanitize sensitive data from the event object
      const sanitizeString = (str: string): string => {
        if (!str) return str;
        // Sanitize signed JioSaavn / saavncdn CDN URLs
        let sanitized = str.replace(/https?:\/\/[^\s"'`<>]*saavncdn[^\s"'`<>]+/gi, '[CDN_URL_SANITIZED]');
        // Sanitize authorization headers (e.g. Bearer tokens)
        sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
        return sanitized;
      };

      const sanitizeObject = (obj: any): any => {
        if (!obj) return obj;
        if (typeof obj === 'string') {
          return sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }
        if (typeof obj === 'object') {
          const result: any = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              if (['authorization', 'token', 'auth', 'cookie', 'audioUrl', 'streamUrl', 'url'].includes(key.toLowerCase())) {
                if (typeof obj[key] === 'string') {
                  result[key] = sanitizeString(obj[key]);
                } else {
                  result[key] = '[REDACTED]';
                }
              } else {
                result[key] = sanitizeObject(obj[key]);
              }
            }
          }
          return result;
        }
        return obj;
      };

      return sanitizeObject(event);
    } catch (e) {
      // If sanitization fails, return original event rather than dropping the crash report,
      // but log fallback warning to Sentry tag.
      event.tags = { ...event.tags, sanitization_error: 'true' };
      return event;
    }
  },
});

Sentry.setTag('build_type', __DEV__ ? 'development' : 'production');

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        // console.log(`${key} was used 🔐 \n`);
      } else {
        if (__DEV__) {
          console.log('No values stored under key: ' + key);
        }
      }
      return item;
    } catch (error) {
      Sentry.captureException(error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env',
  );
}

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

import { ClerkAuthHandler } from '@/components/ClerkAuthHandler';
import { useAuthBootstrapStore } from '@/stores/useAuthBootstrapStore';
import { usePlayerStore } from '@/stores/usePlayerStore';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function InitialLayout({ onReady }: { onReady: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavState = useRootNavigationState();
  const [bootTimeout, setBootTimeout] = useState(false);

  const { hasValidSession, isBootstrapped, setBootstrapped } = useAuthBootstrapStore();
  const [bootAuthenticated, setBootAuthenticated] = useState(false);

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (hasValidSession) {
        // Double check local token exists to prevent forcing entry on corrupt cache
        const token = await tokenCache.getToken('__clerk_client_jwt');
        if (token) {
          setBootAuthenticated(true);
        } else {
          setBootAuthenticated(false);
        }
      } else {
        setBootAuthenticated(false);
      }
      setBootstrapped(true);
    };
    bootstrapAuth();
  }, [hasValidSession, setBootstrapped]);

  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  const isEffectivelySignedIn = (isLoaded && !isOffline) ? isSignedIn : (isSignedIn || bootAuthenticated);

  useEffect(() => {
    // Fail-safe: if Clerk doesn't load in 2.5 seconds (likely offline/stuck), 
    // proceed anyway so the user can at least see cached data.
    const timer = setTimeout(() => {
      if (!isLoaded) setBootTimeout(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  useEffect(() => {
    // Notify RootLayout when we're ready to hide splash
    if ((isLoaded || bootTimeout || bootAuthenticated) && isBootstrapped) {
      onReady();
    }
  }, [isLoaded, bootTimeout, bootAuthenticated, isBootstrapped, onReady]);

  useEffect(() => {
    // Only redirect if Expo Router navigation container is ready
    if (!rootNavState?.key) return;
    if (!isBootstrapped) return;

    // Allow routing if we are offline-bootstrapped OR Clerk finished loading
    if (!bootAuthenticated && !isLoaded && !bootTimeout) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isEffectivelySignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!isEffectivelySignedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [isEffectivelySignedIn, isLoaded, bootTimeout, bootAuthenticated, isBootstrapped, segments, rootNavState?.key]);

  useEffect(() => {
    // Initialize the main player store on app boot
    usePlayerStore.getState().initPlayer();
  }, []);

  if (!isBootstrapped) return null;
  if (!bootAuthenticated && !isLoaded && !bootTimeout) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isEffectivelySignedIn ? (
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      ) : (
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      )}
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="search-results" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

// Track player background service is now managed natively inside /index.js

function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (navigationRef) {
      reactNavigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const [isAppReady, setIsAppReady] = useState(false); // Added isAppReady state

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // Only hide splash when BOTH fonts and auth are ready
    if (loaded && isAppReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isAppReady]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <PostHogProvider client={initAnalytics()}>
        <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
          <ClerkAuthHandler />
          <BottomSheetModalProvider>
            <ThemeProvider value={DarkTheme}>
              <InitialLayout onReady={() => setIsAppReady(true)} />
            </ThemeProvider>
          </BottomSheetModalProvider>
        </ClerkProvider>
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
