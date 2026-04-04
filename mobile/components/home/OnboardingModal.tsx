import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Pressable
} from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Check, Music, Globe, ChevronRight } from 'lucide-react-native';
import { 
  useOnboardingStore, 
  AVAILABLE_LANGUAGES 
} from '../../stores/useOnboardingStore';
import { useAuth } from '@clerk/clerk-expo';
import { useStreamStore } from '../../stores/useStreamStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const THEME = {
  violet: '#7c3aed',
  violetLight: '#a78bfa',
  violetDark: '#5b21b6',
  zinc900: '#18181b',
  zinc800: '#27272a',
  zinc700: '#3f3f46',
  zinc600: '#52525b',
  zinc400: '#a1a1aa',
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const OnboardingModal = () => {
  const { 
    preferences, 
    setLanguages,
    completeOnboarding, 
    shouldShowOnboarding 
  } = useOnboardingStore();
  
  const fetchHomepage = useStreamStore(state => state.fetchHomepage);
  const fetchPicks = useStreamStore(state => state.fetchDailyMix);
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();

  const [visible, setVisible] = useState(false);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [step, setStep] = useState(0);
  const [localSelection, setLocalSelection] = useState<string[]>(preferences.languages);

  // Fetch prefs from server first, THEN decide whether to show modal.
  // This prevents the modal from flashing on logout or before server data loads.
  useEffect(() => {
    if (!isSignedIn) {
      setVisible(false);
      setIsLoadingPrefs(true); // Reset for next sign-in
      return;
    }

    let cancelled = false;
    setIsLoadingPrefs(true);

    useOnboardingStore.getState().fetchPreferences().finally(() => {
      if (cancelled) return;
      setIsLoadingPrefs(false);
      const shouldShow = useOnboardingStore.getState().shouldShowOnboarding();
      if (shouldShow) {
        setLocalSelection(useOnboardingStore.getState().preferences.languages);
        setStep(0);
        setVisible(true);
      } else {
        setVisible(false);
      }
    });

    return () => { cancelled = true; };
  }, [isSignedIn]);

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
    setVisible(false);
    
    // Refresh content
    useStreamStore.setState({ homepageData: null });
    fetchHomepage(true);
    fetchPicks();
  };

  const handleSkip = () => {
    if (localSelection.length === 0) {
      setLanguages(['hindi', 'english']);
    }
    completeOnboarding();
    setVisible(false);
    
    useStreamStore.setState({ homepageData: null });
    fetchHomepage(true);
    fetchPicks();
  };

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
        <Animated.View 
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.modalBackdrop} 
        />
        
        <Animated.View 
          entering={SlideInDown.duration(250)}
          exiting={SlideOutDown.duration(300)}
          style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
        >
          {/* Step Indicator */}
          <View style={styles.indicatorContainer}>
            {[0, 1].map((s) => (
              <View 
                key={s} 
                style={[
                  styles.indicator, 
                  s <= step ? styles.indicatorActive : styles.indicatorInactive,
                  s <= step && { flex: 2 }
                ]} 
              />
            ))}
          </View>

          <View style={styles.stepContainer}>
            {step === 0 ? (
              <Animated.View 
                key="welcome"
                entering={FadeIn.duration(400)}
                exiting={FadeOut.duration(200)}
                style={styles.welcomeStep}
              >
                <View style={styles.iconWrapper}>
                  <LinearGradient
                    colors={['rgba(124, 58, 237, 0.2)', 'rgba(192, 38, 211, 0.2)']}
                    style={styles.iconGradient}
                  >
                    <Music size={36} color={THEME.violetLight} />
                  </LinearGradient>
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
                  <ChevronRight size={18} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.timeTag}>Takes less than 10 seconds</Text>
              </Animated.View>
            ) : (
              <Animated.View 
                key="languages"
                entering={SlideInRight.duration(300)}
                style={styles.languageStep}
              >
                <View style={styles.headerRow}>
                  <View style={styles.headerIconWrapper}>
                    <Globe size={18} color={THEME.violetLight} />
                  </View>
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
                          {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.footer}>
                  {selectedCount > 0 && (
                    <View style={styles.selectionBadge}>
                      <Text style={styles.selectionText}>{selectedCount} selected</Text>
                    </View>
                  )}

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
                      selectedCount === 0 && { color: THEME.zinc600 }
                    ]}>
                      {selectedCount > 0 ? "Continue" : "Select at least 1"}
                    </Text>
                    {selectedCount > 0 && <ChevronRight size={18} color="#fff" />}
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
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: THEME.zinc900,
    width: '100%',
    maxWidth: SCREEN_WIDTH > 600 ? 450 : '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 6,
  },
  indicator: {
    height: 4,
    borderRadius: 2,
    flex: 1,
  },
  indicatorActive: {
    backgroundColor: THEME.violet,
  },
  indicatorInactive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: THEME.zinc400,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 280,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.violet,
    width: '100%',
    height: 56,
    borderRadius: 16,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: THEME.zinc800,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  timeTag: {
    color: THEME.zinc600,
    fontSize: 11,
    marginTop: 16,
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
  headerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: THEME.zinc600,
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
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 52,
  },
  langItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  langItemInactive: {
    backgroundColor: 'rgba(39, 39, 42, 0.4)',
    borderColor: 'rgba(63, 63, 70, 0.3)',
  },
  langText: {
    fontSize: 14,
    fontWeight: '500',
  },
  langTextActive: {
    color: '#fff',
  },
  langTextInactive: {
    color: THEME.zinc400,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkActive: {
    backgroundColor: THEME.violet,
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
    color: THEME.zinc400,
    fontSize: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  skipButtonText: {
    color: THEME.zinc600,
    fontSize: 12,
  },
});
