import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser, useClerk } from '@clerk/clerk-expo';
import { resetAllStores } from '@/stores/user';
import {
  ArrowLeft,
  User,
  Globe,
  Play,
  HardDrive,
  Bell,
  Info,
} from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { COLORS } from '@/constants/design';

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isNavigating = useRef(false);

  const navigateTo = useCallback((route: string) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.push(route as any);
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  }, [router]);

  const handleSignOut = useCallback(async () => {
    try {
      await resetAllStores();
      await signOut();
      router.replace('/(auth)/login' as any);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [signOut, router, resetAllStores]);

  const handleBack = useCallback(() => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.back();
    setTimeout(() => {
      isNavigating.current = false;
    }, 500);
  }, [router]);

  if (!user) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />

      <SafeAreaView style={{ backgroundColor: COLORS.surface }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <SettingsRow
          icon={User}
          title="Account"
          subtitle={`Username • Email • Account overview`}
          onPress={() => navigateTo('/profile/account')}
        />

        {/* Content Section */}
        <SettingsRow
          icon={Globe}
          title="Content"
          subtitle={`Languages for music`}
          onPress={() => navigateTo('/profile/content')}
        />

        {/* Playback Section */}
        <SettingsRow
          icon={Play}
          title="Playback"
          subtitle="Autoplay • Audio quality"
          onPress={() => navigateTo('/profile/playback')}
        />

        {/* Downloads Section */}
        <SettingsRow
          icon={HardDrive}
          title="Downloads"
          subtitle={`Storage • Downloads`}
          onPress={() => navigateTo('/profile/downloads')}
        />

        {/* Notifications Section */}
        <SettingsRow
          icon={Bell}
          title="Notifications"
          subtitle="Push notifications"
          onPress={() => navigateTo('/profile/notifications')}
        />

        {/* About Section */}
        <SettingsRow
          icon={Info}
          title="About"
          subtitle="Version"
          onPress={() => navigateTo('/profile/about')}
        />

        {/* Log Out Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.logoutButton}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Settings Row ───
interface SettingsRowProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

const SettingsRow = React.memo(({
  icon: Icon,
  title,
  subtitle,
  onPress,
}: SettingsRowProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.row}
    >
      <View style={styles.rowIconContainer}>
        <Icon size={22} color={Colors.textPrimary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  rowIconContainer: {
    width: 32,
    marginRight: 12,
    alignItems: 'flex-start',
  },
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  rowTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  rowSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  logoutContainer: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 16,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: Colors.textPrimary,
    borderWidth: 0,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
