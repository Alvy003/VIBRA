// app/ai-playlist.tsx
import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { X, ArrowLeft, MessageSquare, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { useAuth } from '@clerk/clerk-expo';

import { useAIPlaylistStore } from '@/stores/useAIPlaylistStore';
import { StepIndicator } from '@/components/ai-playlist/StepIndicator';
import { VibeSelector } from '@/components/ai-playlist/VibeSelector';
import { LanguageSelector } from '@/components/ai-playlist/LanguageSelector';
import { EraSelector } from '@/components/ai-playlist/EraSelector';
import { SizeSelector } from '@/components/ai-playlist/SizeSelector';
import { GeneratingView } from '@/components/ai-playlist/GeneratingView';
import { PlaylistResult } from '@/components/ai-playlist/PlaylistResult';
import { ErrorView } from '@/components/ai-playlist/ErrorView';

// ─────────────────────────────────────────────────────────────────────────────
// Mode toggle pill (Chat vs Step-by-step)
// ─────────────────────────────────────────────────────────────────────────────
function ModeToggle({
  mode,
  onToggle,
}: {
  mode: 'chat' | 'manual';
  onToggle: () => void;
}) {
  return (
    <View style={toggleStyles.wrapper}>
      <View style={toggleStyles.pill}>
        <View
          style={[
            toggleStyles.indicator,
            mode === 'manual' && toggleStyles.indicatorRight,
          ]}
        />
        <TouchableOpacity
          onPress={() => mode !== 'chat' && onToggle()}
          style={toggleStyles.option}
          activeOpacity={0.7}
        >
          <MessageSquare size={12} color={mode === 'chat' ? '#fff' : '#71717a'} strokeWidth={2} />
          <Text style={[toggleStyles.optionText, mode === 'chat' && toggleStyles.optionTextActive]}>
            Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => mode !== 'manual' && onToggle()}
          style={toggleStyles.option}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={12} color={mode === 'manual' ? '#fff' : '#71717a'} strokeWidth={2} />
          <Text style={[toggleStyles.optionText, mode === 'manual' && toggleStyles.optionTextActive]}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingVertical: 12 },
  pill: {
    flexDirection: 'row',
    backgroundColor: '#09090b',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: '#18181b',
    position: 'relative',
    width: 200,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 96,
    bottom: 4,
    backgroundColor: '#3f3f46',
    borderRadius: 20,
  },
  indicatorRight: { transform: [{ translateX: 96 }] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    width: 100,
    justifyContent: 'center',
    zIndex: 1,
  },
  optionText: { fontSize: 12, color: '#71717a', fontWeight: '700' },
  optionTextActive: { color: '#fff' },
});

export default function AIPlaylistScreen() {
  const router = useRouter();
  const {
    inputMode,
    setInputMode,
    currentStep,
    setStep,
    params,
    setParam,
    isGenerating,
    generationStage,
    progressMessage,
    generatedPlaylist,
    generatePlaylist,
    resetParams,
    clearError,
    error,
  } = useAIPlaylistStore();

  const { getToken } = useAuth();
  const fadeAnim = useSharedValue(0);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    return () => { resetParams(); };
  }, []);

  useEffect(() => {
    fadeAnim.value = 0;
    fadeAnim.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
  }, [currentStep, inputMode]);

  const stepStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: withTiming(fadeAnim.value === 1 ? 0 : 5, { duration: 200 }) }],
  }));

  const handleClose = useCallback(() => {
    resetParams();
    router.back();
  }, []);

  const handleBack = useCallback(() => {
    if (generationStage === 'error') {
      clearError();
      return;
    }
    if (inputMode === 'manual' && currentStep > 1) {
      setStep(currentStep - 1);
    } else if (inputMode === 'manual' && currentStep === 1) {
      setInputMode('chat');
    } else {
      router.back();
    }
  }, [inputMode, currentStep, generationStage]);

  const handleModeToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearError();
    const nextMode = inputMode === 'chat' ? 'manual' : 'chat';
    setInputMode(nextMode);
    if (nextMode === 'manual') setStep(1);
  }, [inputMode]);

  const handleVibeSelect = useCallback((vibe: string) => {
    setParam('vibe', vibe as any);
    setTimeout(() => setStep(2), 200);
  }, []);

  const handleLanguageSelect = useCallback((language: string) => {
    setParam('language', language as any);
    setTimeout(() => setStep(3), 200);
  }, []);

  const handleEraSelect = useCallback((era: string) => {
    setParam('era', era as any);
    setTimeout(() => setStep(4), 200);
  }, []);

  const handleSizeSelect = useCallback(async (size: number) => {
    setParam('size', size as any);
    const token = await getToken();
    setTimeout(() => generatePlaylist(undefined, token as string), 200);
  }, [getToken, generatePlaylist, setParam]);

  if (generatedPlaylist) {
    return (
      <View style={styles.container}>
        <PlaylistResult
          playlist={generatedPlaylist}
          onClose={handleClose}
          onRegenerate={() => resetParams()}
        />
      </View>
    );
  }

  if (isGenerating || generationStage === 'analyzing' || generationStage === 'generating') {
    return (
      <View style={styles.container}>
        <GeneratingView params={params} progressMessage={progressMessage} />
      </View>
    );
  }

  if (generationStage === 'error' && error) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtnEdge}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
          <ErrorView message={error} onRetry={handleBack} onGoBack={handleClose} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Curator</Text>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ModeToggle mode={inputMode as 'chat' | 'manual'} onToggle={handleModeToggle} />

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.stepContent, stepStyle]}>
            {inputMode === 'chat' ? (
              <View style={styles.chatRedirect}>
                <View style={styles.aiIconContainer}>
                   <Sparkles size={32} color="#fff" fill="#fff" />
                </View>
                <Text style={styles.chatRedirectTitle}>Conversational AI</Text>
                <Text style={styles.chatRedirectSub}>
                  Experience the new way to discover music. Talk to our AI assistant to create the perfect mix.
                </Text>
                <TouchableOpacity 
                   onPress={() => router.push('/(tabs)/chat')}
                   style={styles.chatRedirectBtn}
                >
                  <Text style={styles.chatRedirectBtnText}>Go to Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                   onPress={() => { setInputMode('manual'); setStep(1); }}
                   style={styles.manualEntryBtn}
                >
                  <Text style={styles.manualEntryText}>Or build it manually</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.manualContainer}>
                <StepIndicator currentStep={currentStep} totalSteps={4} />
                <View style={{ height: 32 }} />
                {currentStep === 1 && <VibeSelector selected={params.vibe} onSelect={handleVibeSelect} />}
                {currentStep === 2 && <LanguageSelector selected={params.language} onSelect={handleLanguageSelect} />}
                {currentStep === 3 && <EraSelector selected={params.era} onSelect={handleEraSelect} />}
                {currentStep === 4 && <SizeSelector selected={params.size} onSelect={handleSizeSelect} />}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnEdge: {
    alignSelf: 'flex-end',
    margin: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  scrollArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  stepContent: { flex: 1 },
  chatRedirect: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  aiIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  chatRedirectTitle: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  chatRedirectSub: { color: '#71717a', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  chatRedirectBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  chatRedirectBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
  manualEntryBtn: { paddingVertical: 10 },
  manualEntryText: { color: '#71717a', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  manualContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
});
