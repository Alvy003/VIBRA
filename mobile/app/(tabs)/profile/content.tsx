import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOnboardingStore, AVAILABLE_LANGUAGES } from '@/stores/useOnboardingStore';
import { useStreamStore } from '@/stores/useStreamStore';
import { ArrowLeft, Check } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { COLORS } from '@/constants/design';

export default function ContentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { preferences, setLanguages } = useOnboardingStore();
  const fetchHomepage = useStreamStore(s => s.fetchHomepage);
  const fetchDailyMix = useStreamStore(s => s.fetchDailyMix);

  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSaveLanguages = useCallback((languages: string[]) => {
    setLanguages(languages);
    
    // Defer heavy store invalidations and network requests to let the modal close smoothly first
    setTimeout(() => {
      useStreamStore.getState().invalidateHomepageCache();
      fetchHomepage(true);
      fetchDailyMix();
    }, 300);
  }, [setLanguages, fetchHomepage, fetchDailyMix]);

  const selectedLanguageLabels = useMemo(() => {
    return AVAILABLE_LANGUAGES
      .filter(l => preferences.languages.includes(l.id))
      .map(l => l.label);
  }, [preferences.languages]);

  const languagesDisplay = useMemo(() => {
    if (selectedLanguageLabels.length === 0) return 'None';
    if (selectedLanguageLabels.length > 2) {
      return `${selectedLanguageLabels.slice(0, 2).join(', ')} +${selectedLanguageLabels.length - 2}`;
    }
    return selectedLanguageLabels.join(', ');
  }, [selectedLanguageLabels]);

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
          <Text style={styles.headerTitle}>Content</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsRow
          title="Languages for music"
          subtitle={languagesDisplay}
          onPress={() => setShowLanguageModal(true)}
        />
      </ScrollView>

      {/* Conditionally render Language Selection Modal to prevent unnecessary memory/render overhead when hidden */}
      {showLanguageModal && (
        <LanguageModal
          visible={showLanguageModal}
          onClose={() => setShowLanguageModal(false)}
          selectedLanguages={preferences.languages}
          onSave={handleSaveLanguages}
        />
      )}
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

// ─── Optimized Language Modal (Uses Native Slide Transition) ───
interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
  selectedLanguages: string[];
  onSave: (languages: string[]) => void;
}

const LanguageModal = React.memo(({
  visible,
  onClose,
  selectedLanguages,
  onSave,
}: LanguageModalProps) => {
  // Initialize local selection once on mount
  const [localSelection, setLocalSelection] = useState<string[]>(() => selectedLanguages);
  const insets = useSafeAreaInsets();

  const toggleLanguage = (langId: string) => {
    setLocalSelection(prev =>
      prev.includes(langId)
        ? prev.filter(l => l !== langId)
        : [...prev, langId]
    );
  };

  const handleSave = () => {
    onSave(localSelection);
    onClose();
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify([...localSelection].sort()) !==
      JSON.stringify([...selectedLanguages].sort());
  }, [localSelection, selectedLanguages]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Languages for music</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <Text style={styles.modalSubtitle}>
            Select the languages you want to see in recommendations
          </Text>

          {/* Language List */}
          <ScrollView
            style={styles.languageList}
            contentContainerStyle={styles.languageListContent}
            showsVerticalScrollIndicator={false}
          >
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = localSelection.includes(lang.id);
              return (
                <TouchableOpacity
                  key={lang.id}
                  onPress={() => toggleLanguage(lang.id)}
                  style={styles.languageRow}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.languageText,
                  ]}>
                    {lang.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Check size={20} color={COLORS.accent} strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Save Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={localSelection.length === 0}
              style={[
                styles.saveButton,
                localSelection.length === 0 && styles.saveButtonDisabled,
              ]}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.saveButtonText,
                localSelection.length === 0 && styles.saveButtonTextDisabled,
              ]}>
                {localSelection.length === 0
                  ? 'Select at least 1'
                  : hasChanges
                    ? 'Save'
                    : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  rowSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  modalHeaderSpacer: {
    width: 44,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  languageList: {
    maxHeight: 400,
  },
  languageListContent: {
    paddingHorizontal: 16,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  languageText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  languageTextSelected: {
    color: COLORS.accent,
  },
  checkmark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#404040',
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  saveButtonTextDisabled: {
    color: COLORS.textMuted,
  },
});
