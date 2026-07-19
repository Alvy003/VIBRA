import React, { useState, useCallback, useEffect } from 'react';
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
import { useDownloadStore } from '@/stores/useDownloadStore';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { COLORS } from '@/constants/design';

export default function DownloadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { downloadedSongs, getStorageSize } = useDownloadStore();
  const [storageSize, setStorageSize] = useState<number>(0);

  const downloadCount = Object.keys(downloadedSongs).length;

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const loadStorageInfo = useCallback(async () => {
    const size = await getStorageSize();
    setStorageSize(size);
  }, [getStorageSize]);

  useEffect(() => {
    loadStorageInfo();
  }, [downloadedSongs, loadStorageInfo]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

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
          <Text style={styles.headerTitle}>Downloads</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsRow
          title="Storage Used"
          subtitle={`${formatSize(storageSize)} used by downloads`}
        />

        <SettingsRow
          title="Downloads"
          subtitle={`${downloadCount} song${downloadCount !== 1 ? 's' : ''}`}
          onPress={() => {
            router.push('/(tabs)/downloads');
          }}
        />
      </ScrollView>
    </View>
  );
}

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}

const SettingsRow = React.memo(({ title, subtitle, onPress }: SettingsRowProps) => {
  const content = (
    <>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
      {onPress && (
        <ChevronRight size={22} color={Colors.textMuted} />
      )}
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
