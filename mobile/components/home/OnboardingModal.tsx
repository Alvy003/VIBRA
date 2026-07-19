import Colors from '@/constants/Colors';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Check, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AVAILABLE_LANGUAGES,
  useOnboardingStore
} from '../../stores/useOnboardingStore';
import { useStreamStore } from '../../stores/useStreamStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const OnboardingModal = () => {
  const completedOnboarding = useOnboardingStore(state => state.preferences.completedOnboarding);
  const isPreferencesLoaded = useOnboardingStore(state => state.isPreferencesLoaded);
  const preferencesLanguages = useOnboardingStore(state => state.preferences.languages);
  const setLanguages = useOnboardingStore(state => state.setLanguages);
  const completeOnboarding = useOnboardingStore(state => state.completeOnboarding);

  const fetchHomepage = useStreamStore(state => state.fetchHomepage);
  const fetchPicks = useStreamStore(state => state.fetchDailyMix);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [localSelection, setLocalSelection] = useState<string[]>([]);

  // Sync local selection when preferences languages are loaded or change
  useEffect(() => {
    if (isPreferencesLoaded) {
      setLocalSelection(preferencesLanguages || []);
    }
  }, [isPreferencesLoaded, preferencesLanguages]);

  const handleToggle = (langId: string) => {
    setLocalSelection(prev =>
      prev.includes(langId)
        ? prev.filter(l => l !== langId)
        : [...prev, langId]
    );
  };

  const handleContinue = () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    setLanguages(localSelection);
    completeOnboarding();

    // Refresh content
    useStreamStore.getState().invalidateHomepageCache();
    fetchHomepage(true);
    fetchPicks();
  };

  const handleSkip = () => {
    if (localSelection.length === 0) {
      setLanguages(['hindi', 'english']);
    }
    completeOnboarding();

    useStreamStore.getState().invalidateHomepageCache();
    fetchHomepage(true);
    fetchPicks();
  };

  const visible = isPreferencesLoaded && !completedOnboarding;

  if (!visible) return null;

  const selectedCount = localSelection.length;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.modalBackdrop}
        />

        <Animated.View
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(300)}
          style={[styles.modalContent, { paddingBottom: insets.bottom + 5 }]}
        >
          <View style={styles.stepContainer}>
            {step === 0 ? (
              <Animated.View
                key="welcome"
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(200)}
                style={styles.welcomeStep}
              >
                <View style={styles.iconWrapper}>
                  <Image source={require('../../assets/images/vibra-1024.png')} style={{ width: 80, height: 80 }} />
                </View>

                <Text style={styles.title}>Welcome to Vibra</Text>
                <Text style={styles.subtitle}>
                  Your personal music experience starts here. Let's set things up in just a moment.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleContinue}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Get Started</Text>
                  <ChevronRight size={18} color={Colors.black} />
                </TouchableOpacity>

              </Animated.View>
            ) : (
              <Animated.View
                key="languages"
                entering={SlideInRight.duration(300)}
                style={styles.languageStep}
              >
                <View style={styles.headerRow}>
                  <View>
                    <Text style={styles.headerTitle}>Music Languages</Text>
                    <Text style={styles.headerSubtitle}>Choose what you'd like to hear</Text>
                  </View>
                </View>

                <ScrollView
                  style={styles.languageList}
                  contentContainerStyle={styles.languageGrid}
                  showsVerticalScrollIndicator={false}
                >
                  {AVAILABLE_LANGUAGES.map((lang) => {
                    const isSelected = localSelection.includes(lang.id);
                    return (
                      <TouchableOpacity
                        key={lang.id}
                        activeOpacity={0.7}
                        onPress={() => handleToggle(lang.id)}
                        style={[
                          styles.langItem,
                          isSelected ? styles.langItemActive : styles.langItemInactive
                        ]}
                      >
                        <Text style={[
                          styles.langText,
                          isSelected ? styles.langTextActive : styles.langTextInactive
                        ]}>
                          {lang.label}
                        </Text>
                        <View style={[
                          styles.checkmark,
                          isSelected ? styles.checkmarkActive : styles.checkmarkInactive
                        ]}>
                          {isSelected && <Check size={12} color={Colors.black} strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.footer}>
                  {localSelection.length > 0 ? (
                    <View style={styles.selectionBadge}>
                      <Text style={styles.selectionText}>{selectedCount} selected</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleContinue}
                    disabled={selectedCount === 0}
                    style={[
                      styles.primaryButton,
                      selectedCount === 0 && styles.buttonDisabled
                    ]}
                  >
                    <Text style={[
                      styles.primaryButtonText,
                      selectedCount === 0 && { color: Colors.textMuted }
                    ]}>
                      {selectedCount > 0 ? "Continue" : "Select at least 1"}
                    </Text>
                    {localSelection.length > 0 ? (
                      <ChevronRight size={18} color={Colors.black} />
                    ) : null}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSkip}
                    style={styles.skipButton}
                  >
                    <Text style={styles.skipButtonText}>Skip · defaults to Hindi & English</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Copying some simplified animations from reanimated for easy use
// Reanimated exports are already handled above

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.blackAlpha70,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    width: '100%',
    maxWidth: SCREEN_WIDTH > 600 ? 450 : '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.whiteAlpha08,
    overflow: 'hidden',
  },
  stepContainer: {
    padding: 24,
  },
  welcomeStep: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 40,
    maxWidth: 280,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    width: '100%',
    height: 42,
    borderRadius: 20,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.placeholderBg,
  },
  primaryButtonText: {
    color: Colors.black,
    fontSize: 14,
    fontWeight: '600',
  },
  languageStep: {
    minHeight: 400,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  languageList: {
    maxHeight: 320,
    marginBottom: 10,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 20,
  },
  langItem: {
    width: '48%', // 2 columns
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 52,
  },
  langItemActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.accent,
  },
  langItemInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  langText: {
    fontSize: 14,
    fontWeight: '500',
  },
  langTextActive: {
    color: '#fff',
  },
  langTextInactive: {
    color: Colors.textMuted,
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkActive: {
    backgroundColor: Colors.accent,
  },
  checkmarkInactive: {
    backgroundColor: 'rgba(63, 63, 70, 0.5)',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  selectionBadge: {
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  skipButtonText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});
