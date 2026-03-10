import React, { useState, useCallback, useRef } from 'react';
import { Tabs } from 'expo-router';
import {
  View,
  Platform,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { BottomPlayer } from '@/components/BottomPlayer';
import FullScreenPlayer from '@/components/FullScreenPlayer';
import PlayerQueue from '@/components/PlayerQueue';
import { usePlayerUIStore } from '@/stores/usePlayerUIStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, Download, Library } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  activeTab: '#FFFFFF',
  inactiveTab: '#B3B3B3',
  background: '#000000',
};

// Home icons
const HomeOutline = ({ size = 24, color = '#B3B3B3' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12.6 2.4a1 1 0 00-1.2 0l-8 6A1 1 0 003 9.2V20.5a1.5 1.5 0 001.5 1.5H9a1 1 0 001-1v-5.5a1 1 0 011-1h2a1 1 0 011 1V21a1 1 0 001 1h4.5a1.5 1.5 0 001.5-1.5V9.2a1 1 0 00-.4-.8l-8-6z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HomeFilled = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M13.5 1.515a3 3 0 00-3 0L3 5.845a2 2 0 00-1 1.732V21a1 1 0 001 1h6a1 1 0 001-1v-6h4v6a1 1 0 001 1h6a1 1 0 001-1V7.577a2 2 0 00-1-1.732l-7.5-4.33z"
      fill={color}
    />
  </Svg>
);

// Search icons
const SearchOutline = ({ size = 24, color = '#B3B3B3' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 101.414-1.414l-4.344-4.344a9.157 9.157 0 002.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.279 7.407-7.279s7.407 3.273 7.407 7.279-3.302 7.279-7.407 7.279S3.126 14.564 3.126 10.558z"
      fill={color}
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </Svg>
);

const SearchFilled = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.356 10.558c0 2.623-2.16 4.779-4.823 4.779-2.664 0-4.824-2.156-4.824-4.78 0-2.622 2.16-4.778 4.824-4.778 2.664 0 4.823 2.156 4.823 4.779z"
      fill={color}
    />
    <Path
      d="M1.126 10.558c0-5.14 4.226-9.28 9.407-9.28 5.18 0 9.407 4.14 9.407 9.28a9.157 9.157 0 01-2.077 5.816l4.344 4.344a1 1 0 01-1.414 1.414l-4.353-4.353a9.454 9.454 0 01-5.907 2.058c-5.18 0-9.407-4.14-9.407-9.28zm9.407-7.28c-4.105 0-7.407 3.274-7.407 7.28s3.302 7.279 7.407 7.279 7.407-3.273 7.407-7.28c0-4.005-3.302-7.278-7.407-7.278z"
      fill={color}
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </Svg>
);

type TabIconProps = { children: React.ReactNode };

const TabIcon: React.FC<TabIconProps> = ({ children }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      {children}
    </Animated.View>
  );
};

export default function TabLayout() {
  const { isPlayerExpanded, setIsPlayerExpanded } = usePlayerUIStore();
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const miniPlayerOpacity = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  const [playerColors, setPlayerColors] = useState<{
    dominant: string;
    gradient: readonly [string, string, string, string];
  } | undefined>(undefined);

  const handleExpandPlayer = useCallback((colors?: {
    dominant: string;
    gradient: readonly [string, string, string, string];
  }) => {
    setPlayerColors(colors);
    // Fade out mini player quickly
    Animated.timing(miniPlayerOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsPlayerExpanded(true);
    });
  }, [setIsPlayerExpanded, miniPlayerOpacity]);

  const handleCollapsePlayer = useCallback(() => {
    // First unmount fullscreen, then fade in mini player
    setIsPlayerExpanded(false);
    miniPlayerOpacity.setValue(0);
    Animated.timing(miniPlayerOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [setIsPlayerExpanded, miniPlayerOpacity]);

  const handleOpenQueue = useCallback(() => setIsQueueVisible(true), []);
  const handleCloseQueue = useCallback(() => setIsQueueVisible(false), []);

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.activeTab,
          tabBarInactiveTintColor: COLORS.inactiveTab,
          tabBarStyle: [
            styles.tabBar,
            {
              height: 56 + insets.bottom,
              paddingBottom: Math.max(insets.bottom, 8),
              paddingHorizontal: Math.max(insets.left, insets.right, 4),
            },
          ],
          tabBarBackground: () => (
            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.98)']}
                locations={[0, 0.15, 0.45, 0.8]}
                style={StyleSheet.absoluteFill}
              />
              <BlurView
                intensity={Platform.OS === 'ios' ? 35 : 0}
                tint="dark"
                style={[StyleSheet.absoluteFill, styles.blurOverlay]}
              />
            </View>
          ),
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon>
                {focused ? <HomeFilled size={23} color={color} /> : <HomeOutline size={23} color={color} />}
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon>
                {focused ? <SearchFilled size={23} color={color} /> : <SearchOutline size={23} color={color} />}
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon>
                <Library size={23} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon>
                <MessageCircle size={23} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: 'Downloads',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon>
                <Download size={23} color={color} strokeWidth={focused ? 2.5 : 1.8} />
              </TabIcon>
            ),
          }}
        />
      </Tabs>

      {!isPlayerExpanded && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.miniPlayerContainer,
            { bottom: 56 + insets.bottom, opacity: miniPlayerOpacity },
          ]}
        >
          <View style={styles.miniPlayerShadow}>
            <BottomPlayer onExpand={handleExpandPlayer} />
          </View>
        </Animated.View>
      )}

      {isPlayerExpanded && (
        <FullScreenPlayer
          onClose={handleCollapsePlayer}
          onQueueOpen={handleOpenQueue}
          initialColors={playerColors}
        />
      )}
      <PlayerQueue visible={isQueueVisible} onClose={handleCloseQueue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
  },
  blurOverlay: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.88)' : 'transparent',
  },
  tabBarLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1, marginTop: 1 },
  tabBarItem: { paddingTop: 2, gap: 2 },
  miniPlayerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 8,
    paddingBottom: 0,
  },
  miniPlayerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
});