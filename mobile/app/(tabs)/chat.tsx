// app/(tabs)/chat.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
  Dimensions,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Modal,
  Keyboard,
} from 'react-native';
import BottomSheet, { BottomSheetRef } from '@/components/BottomSheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import {
  Sparkles,
  Send,
  X,
  Trash2,
  Music2,
  Link2,
  Plus,
  Youtube,
  Globe,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useAIPlaylistStore } from '@/stores/useAIPlaylistStore';
import { PlaylistResult } from '@/components/ai-playlist/PlaylistResult';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserProfileIcon } from '@/components/UserProfileIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AIPlaylistTrack {
  externalId: string;
  title: string;
  artist: string;
  imageUrl: string;
  streamUrl: string;
  duration: number;
  source: 'jiosaavn' | 'youtube';
}

interface AIPlaylist {
  _id: string;
  name: string;
  description: string;
  size: number;
  tracks: AIPlaylistTrack[];
  coverArt: string | null;
}

interface Message {
  id: string;
  type: 'user' | 'ai' | 'playlist_card';
  text: string;
  playlist?: AIPlaylist;
}

const SUGGESTIONS = [
  "Soulful Malayalam Melodies",
  "Latest Punjabi Bangers",
  "Romantic 90s Bollywood",
  "Focus Beats for Study",
  "Long Drive Hindi Hits",
  "Rainy Day Vibes",
];

// Playlist Card Component for Chat
const PlaylistCard = React.memo(({ playlist, onOpen }: { playlist: AIPlaylist, onOpen: (p: AIPlaylist) => void }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onOpen(playlist)}
      style={styles.playlistCard}
    >
      <View style={styles.cardImageContainer}>
        {playlist.coverArt ? (
          <Image source={{ uri: playlist.coverArt }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.placeholderCardImage]}>
            <Music2 size={24} color="#a1a1aa" />
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{playlist.name}</Text>
        <Text style={styles.cardMeta}>{playlist.tracks.length} Tracks • AI Curated</Text>
        {/* <View style={styles.viewBadge}>
          <Text style={styles.viewBadgeText}>Open Playlist</Text>
          <Sparkles size={12} color="#fff" />
        </View> */}
      </View>
    </TouchableOpacity>
  );
});

// Message Bubble Component
const MessageBubble = React.memo(({ item, onOpenPlaylist }: { item: Message, onOpenPlaylist: (p: AIPlaylist) => void }) => {
  const isAI = item.type === 'ai';
  const isCard = item.type === 'playlist_card';

  if (isCard && !!item.playlist) {
    return (
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.messageWrapper, styles.aiWrapper, { maxWidth: '90%' }]}
      >
        <PlaylistCard playlist={item.playlist} onOpen={onOpenPlaylist} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[
        styles.messageWrapper,
        isAI ? styles.aiWrapper : styles.userWrapper
      ]}
    >
      <View style={[
        styles.bubble,
        isAI ? styles.aiBubble : styles.userBubble
      ]}>
        <Text style={[
          styles.messageText,
          isAI ? styles.aiText : styles.userText
        ]}>
          {item.text}
        </Text>
      </View>
    </Animated.View>
  );
});

export default function ChatScreen() {
  const router = useRouter();
  const { query } = useLocalSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();
  const {
    analyzeAndGenerate,
    generationStage,
    progressMessage,
    error,
    clearError,
    reset,
    messages,
    playlistMode,
    togglePlaylistMode,
    directMode,
    toggleDirectMode,
    importSpotifyPlaylist,
    importYouTubePlaylist,
  } = useAIPlaylistStore();

  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<AIPlaylist | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [activePlatform, setActivePlatform] = useState<'spotify' | 'youtube' | 'ytmusic'>('spotify');

  const insets = useSafeAreaInsets();

  const glow = useSharedValue(0);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glow.value
  }));

  const borderAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(input.length > 0 ? '#52525b' : '#3f3f46', { duration: 200 })
  }));


  const handleSend = useCallback(async (query?: string) => {
    const text = query || input.trim();
    if (!text || text.length < 2) return;

    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const token = await getToken();
    analyzeAndGenerate(text, token as string);
  }, [input, analyzeAndGenerate, getToken]);

  const handleImport = async () => {
    const text = importUrl.trim().toLowerCase();
    const token = await getToken();

    let target = activePlatform;
    if (text.includes('spotify.com')) target = 'spotify';
    else if (text.includes('youtube.com') || text.includes('music.youtube.com')) target = 'youtube';

    if (target === 'spotify' && text.includes('spotify.com/playlist/')) {
      setShowImportModal(false);
      await importSpotifyPlaylist(importUrl, token as string);
      setImportUrl('');
    } else if ((target === 'youtube' || target === 'ytmusic') && (text.includes('youtube.com/playlist') || text.includes('music.youtube.com/playlist'))) {
      setShowImportModal(false);
      await importYouTubePlaylist(importUrl, token as string);
      setImportUrl('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = ["Ask for a playlist...", "Chat about music..."];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const isWorking = generationStage === 'analyzing' || generationStage === 'generating';

  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const prevLength = useRef(messages.length);
  const importSnapPoints = useMemo(() => ['50%', '80%'], []);

  useEffect(() => {
    if (messages.length > prevLength.current) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevLength.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (query && typeof query === 'string' && query.length > 0) {
      handleSend(query);
    }
  }, [query]);

  const { import: importParam } = useLocalSearchParams();
  useEffect(() => {
    if (importParam === 'spotify' || importParam === 'youtube') {
      setActivePlatform(importParam);
      setShowImportModal(true);
      router.replace('/(tabs)/chat');
    }
  }, [importParam]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', 
      () => {
        if (showImportModal) bottomSheetRef.current?.snapTo(1);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (showImportModal) bottomSheetRef.current?.snapTo(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [showImportModal]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.safeArea}>
        {/* Header — paddingTop from insets applied directly to prevent SafeAreaView's
            async layout jump when switching to this tab for the first time */}
        <View style={[styles.header, { paddingTop: insets.top + 14 }]} className="border-b-2 border-black">
          <View style={styles.headerTitleContainer}>
            <Text className="text-white text-2xl font-extrabold tracking-wide">Vibra AI</Text>
          </View>
          <View style={styles.headerRight}>
            <UserProfileIcon size={34} />
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={showImportModal ? undefined : (Platform.OS === "ios" ? "padding" : "height")}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : -100}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                item={item}
                onOpenPlaylist={(p) => setSelectedPlaylist(p)}
              />
            )}
            ListEmptyComponent={!isWorking ? (
              <EmptyDiscoveryState />
            ) : null}
            contentContainerStyle={[
              styles.listContent,
              messages.length === 0 && { flex: 1, paddingBottom: 0 }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            style={{ flex: 1 }}
            ListFooterComponent={
              isWorking ? (
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={styles.workingIndicator}
                >
                  <View style={[styles.bubble, styles.aiBubble, styles.workingBubble]}>
                    <Text style={styles.workingText}>
                      {progressMessage || "Synthesizing..."}
                    </Text>
                  </View>
                </Animated.View>
              ) : !!error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={clearError} style={styles.errorClose}>
                    <X size={14} color="#fca5a5" />
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />

          <View style={styles.interactionWrapper}>
            {messages.length === 0 && !isWorking && (
              <View style={styles.discoverySuggestions}>
                <Text style={styles.sectionLabel}>Try asking</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.discoveryScrollWrapper}
                  contentContainerStyle={styles.discoveryScrollContent}
                >
                  {[
                    { id: '1', text: "Malayalam Chill vibes" },
                    { id: '2', text: "Bollywood Dance Bangers" },
                    { id: '3', text: "Tamil Party hits" },
                    { id: '4', text: "90s Bollywood romance" },
                  ].map((item) => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={styles.suggestionCard}
                      onPress={() => handleSend(item.text)}
                    >
                      <Sparkles size={16} color="rgba(255,255,255,0.4)" style={styles.discoveryCardIcon} />
                      <Text style={styles.discoveryCardText}>{item.text}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={[styles.inputArea, { paddingBottom: 4 + insets.bottom + 52 + 62 }]}>
              <View style={styles.inputWrapper}>
                <Animated.View style={[styles.inputGlow, glowAnimatedStyle]} pointerEvents="none" />
                <Animated.View style={[
                  styles.inputContainer,
                  isFocused && styles.inputContainerFocused,
                  borderAnimatedStyle
                ]}>
                  <TouchableOpacity
                    onPress={() => setShowImportModal(true)}
                    style={styles.actionBtn}
                  >
                    <Plus size={20} color="#000" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.input}
                    placeholder={placeholders[placeholderIndex]}
                    placeholderTextColor="#52525b"
                    selectionColor="#8B5CF6"
                    value={input}
                    ref={inputRef}
                    blurOnSubmit={false}
                    onChangeText={setInput}
                    onFocus={() => {
                      glow.value = withTiming(1, { duration: 180 });
                      setIsFocused(true);
                    }}
                    onBlur={() => {
                      glow.value = withTiming(0, { duration: 180 });
                      setIsFocused(false);
                    }}
                    multiline
                    maxLength={200}
                    editable={!isWorking}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => handleSend()}
                    disabled={!input.trim() || isWorking}
                    style={[
                      styles.sendBtn,
                      (!input.trim() || isWorking) && styles.sendBtnDisabled
                    ]}
                  >
                    <Send size={18} color={input.trim() ? "#000" : "#71717a"} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <Text style={styles.disclaimer}>
                Vibra AI can make mistakes.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
      <BottomSheet
        ref={bottomSheetRef}
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        snapPoints={importSnapPoints}
        backgroundColor="#121212"
        showHandle
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.importModalContent}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.importHeader}>
            <Text style={styles.importTitle}>Import Music</Text>
          </View>

          <View style={styles.platformSelector}>
            <TouchableOpacity
              onPress={() => {
                setActivePlatform('spotify');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.platformOption, activePlatform === 'spotify' && styles.platformActiveSpotify]}
            >
              <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/174/174872.png' }} 
                style={[styles.platformIcon, activePlatform === 'spotify' && { tintColor: '#fff' }]} 
              />
              <Text style={[styles.platformText, activePlatform === 'spotify' && styles.platformTextActive]}>Spotify</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setActivePlatform('youtube');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.platformOption, activePlatform === 'youtube' && styles.platformActiveYoutube]}
            >
              <View style={styles.platformIconContainer}>
                {activePlatform === 'youtube' ? (
                  <View style={styles.ytIconLayered}>
                    <Youtube size={28} color="#fff" fill="#fff" />
                    <View style={styles.ytPlayTriangle} />
                  </View>
                ) : (
                  <Image 
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' }} 
                    style={styles.platformIcon} 
                  />
                )}
              </View>
              <Text style={[styles.platformText, activePlatform === 'youtube' && styles.platformTextActive]}>YouTube</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.importDesc}>
            {activePlatform === 'spotify'
              ? 'Paste a link to a Spotify playlist to convert it into a playable Vibra playlist.'
              : 'Paste a link to a YouTube or YouTube Music playlist to import it.'}
          </Text>

          <TextInput
            style={styles.importInput}
            placeholder={activePlatform === 'spotify' ? 'https://open.spotify.com/playlist/...' : 'https://youtube.com/playlist?list=...'}
            placeholderTextColor="#52525b"
            selectionColor="#8B5CF6"
            value={importUrl}
            onChangeText={setImportUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {(() => {
            const isValid = importUrl.includes(activePlatform === 'spotify' ? 'spotify.com/playlist/' : 'youtube.com/playlist') || importUrl.includes('music.youtube.com/playlist');
            return (
              <TouchableOpacity
                style={[styles.importBtn, !isValid && styles.importBtnDisabled]}
                disabled={!isValid}
                onPress={handleImport}
              >
                <Link2 size={20} color="#000" />
                <Text style={styles.importBtnText}>Import Now</Text>
              </TouchableOpacity>
            );
          })()}
        </KeyboardAvoidingView>
      </BottomSheet>

      <PlaylistResult
        visible={!!selectedPlaylist}
        playlist={selectedPlaylist as any}
        onClose={() => setSelectedPlaylist(null)}
        onRegenerate={() => {
          const query = messages[messages.length - 2]?.text;
          if (query) handleSend(query);
          setSelectedPlaylist(null);
        }}
        onUpdateTracks={(updatedTracks) => {
          if (selectedPlaylist) {
            // 1. Update parent state
            setSelectedPlaylist({ ...selectedPlaylist, tracks: updatedTracks });
            // 2. Persist to store history
            useAIPlaylistStore.getState().updateGeneratedPlaylistTracks(selectedPlaylist._id, updatedTracks);
          }
        }}
      />
    </View>
  );
}

const EmptyDiscoveryState = () => (
  <View style={styles.emptyContent}>
    <Text style={styles.emptyTitle}>What do you want to{"\n"}hear today?</Text>
    <Text style={styles.emptySubtitle}>Let's make a playlist together.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  clearBtnText: {
    color: '#71717a',
    fontSize: 12,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 24,
    maxWidth: '85%',
  },
  aiWrapper: {
    alignSelf: 'flex-start',
  },
  userWrapper: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  aiBubble: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#121212',
  },
  userBubble: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
  },
  aiText: {
    color: '#d4d4d8',
    fontWeight: '500',
  },
  userText: {
    color: '#fff',
    fontWeight: '500',
  },
  workingText: {
    color: '#71717a',
    fontSize: 14,
    fontStyle: 'italic',
  },
  interactionWrapper: {
    backgroundColor: '#09090b',
    borderTopWidth: 1,
    borderTopColor: '#09090b',
    marginBottom: 0,
  },
  modeSwitcherContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  togglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  playlistModeActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chatModeActive: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
  },
  directModeActive: {
    backgroundColor: '#a78bfa',
    borderColor: '#a78bfa',
  },
  directModeInactive: {
    backgroundColor: '#09090b',
    borderColor: '#27272a',
  },
  playlistModeText: {
    color: '#000',
  },
  chatModeText: {
    color: '#fff',
  },
  directModeTextActive: {
    color: '#000',
  },
  directModeTextInactive: {
    color: '#71717a',
  },
  platformChip: {
    backgroundColor: '#09090b',
    borderColor: '#27272a',
  },
  platformChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  chipIcon: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  emptyContent: {
    paddingHorizontal: 10,
    paddingTop: 20,
    flex: 1,
  },
  emptyTitle: {
    color: '#fff',
    opacity: 0.95,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 36,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#fff',
    opacity: 0.6,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 48,
  },
  sectionLabel: {
    color: '#fff',
    opacity: 0.95,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  discoveryScrollWrapper: {
    marginHorizontal: 0,
  },
  discoveryScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  suggestionCard: {
    width: 200,
    backgroundColor: '#1a1a1a',
    height: 120,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  discoveryCardIcon: {
    marginBottom: 8,
  },
  discoverySuggestions: {
    paddingTop: 0,
    paddingBottom: 15,
  },
  discoveryCardText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    opacity: 0.9,
  },
  inputArea: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ececec',
    borderRadius: 28,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 2,
    borderWidth: 0,
  },
  inputContainerFocused: {
    backgroundColor: '#fff',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  input: {
    flex: 1,
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
    maxHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    // backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  disclaimer: {
    textAlign: 'center',
    color: '#a1a1aa',
    fontSize: 11,
    paddingTop: 10,
    paddingBottom: 5,
    fontWeight: '500',
    opacity: 0.8,
  },
  // Other styles consolidated...
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  workingIndicator: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  workingBubble: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#27272a',
    borderStyle: 'dashed',
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
    marginHorizontal: 20,
  },
  errorText: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 13,
  },
  errorClose: {
    padding: 4,
  },
  playlistCard: {
    backgroundColor: '#121212',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#121212',
    gap: 12,
    width: '100%',
  },
  cardImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCardImage: {
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  cardName: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '600',
  },
  cardMeta: {
    color: '#71717a',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9,9,11,0.9)',
    justifyContent: 'center',
    padding: 20,
  },
  importModalContent: {
    borderRadius: 24,
    padding: 24,
    flex: 1,
  },
  importHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  importTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  importCloseBtn: {
    padding: 8,
    marginRight: -8,
  },
  importDesc: {
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  importInput: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 24,
  },
  importBtn: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  importBtnDisabled: {
    opacity: 0.5,
  },
  importBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  platformSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  platformOption: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 10,
    minHeight: 85,
  },
  platformActiveSpotify: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  platformActiveYoutube: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  platformIcon: {
    width: 28,
    height: 28,
  },
  platformIconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ytIconLayered: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ytPlayTriangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FF0000',
    left: 11,
  },
  platformText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '600',
  },
  platformTextActive: {
    color: '#fff',
  },
});