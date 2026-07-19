import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { COLORS } from '@/constants/design';
import { useSettingsStore } from '@/stores/useSettingsStore';

export default function PlaybackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { autoplay, wifiAudioQuality, mobileAudioQuality, setAutoplay } = useSettingsStore();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const formatQualityLabel = (quality: string) => {
    return quality.charAt(0).toUpperCase() + quality.slice(1);
  };

  const handleAudioQualityPress = useCallback(() => {
    router.push('/profile/audio-quality');
  }, [router]);

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
          <Text style={styles.headerTitle}>Playback</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsRow
          title="Autoplay"
          subtitle="Keep playing similar songs after your music ends"
          rightElement={
            <Switch
              value={autoplay}
              onValueChange={setAutoplay}
              trackColor={{ false: '#404040', true: Colors.accent }}
              thumbColor="#fff"
            />
          }
        />

        <SettingsRow
          title="Audio Quality"
          subtitle={`Wi-Fi: ${formatQualityLabel(wifiAudioQuality)} • Mobile: ${formatQualityLabel(mobileAudioQuality)}`}
          onPress={handleAudioQualityPress}
        />
      </ScrollView>
    </View>
  );
}

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingsRow = React.memo(({ title, subtitle, onPress, rightElement }: SettingsRowProps) => {
  const content = (
    <>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.rowSubtitle} numberOfLines={2}>{subtitle}</Text>
        )}
      </View>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <ChevronRight size={22} color={Colors.textMuted} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.row}>
        {content}
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
    color: Colors.textPrimary,
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
});
