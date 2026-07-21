import React, { useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { ArrowLeft, SquareArrowOutUpRight } from 'lucide-react-native';
import { COLORS } from '@/constants/design';

export default function AccountScreen() {
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleManageAccount = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://vibra-969f.onrender.com/profile');
    } catch (error) {
      Sentry.captureException(error);
    }
  };

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
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsRow
          title="Username"
          subtitle={user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0]}
        />
        <SettingsRow
          title="Email"
          subtitle={user.primaryEmailAddress?.emailAddress}
        />
        <SettingsRow
          title="Account overview"
          onPress={handleManageAccount}
          rightIcon={<SquareArrowOutUpRight size={16} color={COLORS.textSecondary} />}
          subtitle='View more account details on the web'
        />
      </ScrollView>
    </View>
  );
}

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightIcon?: React.ReactNode;
}

const SettingsRow = React.memo(({ title, subtitle, onPress, rightIcon }: SettingsRowProps) => {
  const content = (
    <>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.row}>
        {content}
        {rightIcon && <View style={styles.rowRight}>{rightIcon}</View>}
      </TouchableOpacity>
    );
  }

  return <View style={styles.row}>{content}</View>;
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
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  rowRight: {
    width: 20,
    height: 20,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rowTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  rowSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
