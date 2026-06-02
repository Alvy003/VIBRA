import '../global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useCallback } from 'react'; // Added useCallback
import 'react-native-reanimated';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import * as SecureStore from 'expo-secure-store';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors'; // Added Colors import

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        // console.log(`${key} was used 🔐 \n`);
      } else {
        console.log('No values stored under key: ' + key);
      }
      return item;
    } catch (error) {
      console.error('SecureStore get item error: ', error);
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
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from '@/services/playbackService';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { ClerkAuthHandler } from '@/components/ClerkAuthHandler';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function InitialLayout({ onReady }: { onReady: () => void }) {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavState = useRootNavigationState();
  const [bootTimeout, setBootTimeout] = useState(false);

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
    if (isLoaded || bootTimeout) {
      onReady();
    }
  }, [isLoaded, bootTimeout, onReady]);

  useEffect(() => {
    // Only redirect if Clerk is definitely loaded or we've timed out,
    // AND the Expo Router navigation container is ready.
    // Without the rootNavState guard, tapping a media-session notification while
    // the service is alive (ContinuePlayback) can trigger navigation before the
    // Root Layout has finished mounting — causing the "navigate before mounting" error.
    if (!rootNavState?.key) return;
    if (!isLoaded && !bootTimeout) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [isSignedIn, isLoaded, bootTimeout, segments, rootNavState?.key]);

  useEffect(() => {
    // Initialize the main player store on app boot
    usePlayerStore.getState().initPlayer();
  }, []);

  if (!isLoaded && !bootTimeout) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isSignedIn ? (
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

export default function RootLayout() {

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
      <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
        <ClerkAuthHandler />
        <BottomSheetModalProvider>
          <ThemeProvider value={DarkTheme}>
            <InitialLayout onReady={() => setIsAppReady(true)} />
          </ThemeProvider>
        </BottomSheetModalProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
