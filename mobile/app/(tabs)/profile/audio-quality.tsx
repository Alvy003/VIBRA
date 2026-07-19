import React, { useCallback } from 'react';
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
import { ArrowLeft, Check } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { COLORS } from '@/constants/design';
import { useSettingsStore, AudioQualitySetting } from '@/stores/useSettingsStore';

const QUALITY_OPTIONS = [
  { id: 'automatic' as AudioQualitySetting, label: 'Automatic' },
  { id: 'low' as AudioQualitySetting, label: 'Low' },
  { id: 'medium' as AudioQualitySetting, label: 'Medium' },
  { id: 'high' as AudioQualitySetting, label: 'High' },
];

export default function AudioQualityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wifiAudioQuality, mobileAudioQuality, setWifiAudioQuality, setMobileAudioQuality } = useSettingsStore();

  const handleBack = useCallback(() => {
    router.back();
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
          <Text style={styles.headerTitle}>Audio Quality</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Wi-Fi Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Wifi Streaming Quality</Text>
          {QUALITY_OPTIONS.map((option) => {
            const isSelected = wifiAudioQuality === option.id;
            return (
              <TouchableOpacity
                key={`wifi-${option.id}`}
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => setWifiAudioQuality(option.id)}
              >
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle]}>{option.label}</Text>
                </View>
                {isSelected && <Check size={20} color={Colors.accent} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Mobile Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Cellular Streaming Quality</Text>
          {QUALITY_OPTIONS.map((option) => {
            const isSelected = mobileAudioQuality === option.id;
            return (
              <TouchableOpacity
                key={`mobile-${option.id}`}
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => setMobileAudioQuality(option.id)}
              >
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle]}>{option.label}</Text>
                </View>
                {isSelected && <Check size={20} color={Colors.accent} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
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
    fontSize: 12,
    fontWeight: '500',
  },
  rowSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  activeText: {
    color: Colors.accent,
  },
});
