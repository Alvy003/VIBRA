// app/(tabs)/chat.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  Modal,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useAIPlaylistStore } from '@/stores/useAIPlaylistStore';
import { PlaylistResult } from '@/components/ai-playlist/PlaylistResult';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
             <Music2 size={24} color="#3f3f46" />
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{playlist.name}</Text>
        <Text style={styles.cardMeta}>{playlist.tracks.length} Tracks • AI Curated</Text>
        <View style={styles.viewBadge}>
          <Text style={styles.viewBadgeText}>Open Playlist</Text>
          <Sparkles size={12} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Message Bubble Component
const MessageBubble = React.memo(({ item, onOpenPlaylist }: { item: Message, onOpenPlaylist: (p: AIPlaylist) => void }) => {
  const isAI = item.type === 'ai';
  const isCard = item.type === 'playlist_card';

  if (isCard && item.playlist) {
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
  
  const listRef = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const glow = useSharedValue(0);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glow.value
  }));

  const borderAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(input.length > 0 ? '#52525b' : '#18181b', { duration: 200 })
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

    // Determine target based on URL if possible, otherwise use activePlatform
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

  const handleClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reset();
  };

  const isWorking = generationStage === 'analyzing' || generationStage === 'generating';

  const prevLength = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevLength.current) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevLength.current = messages.length;
  }, [messages]);

  // Handle incoming query from Home screen
  useEffect(() => {
    if (query && typeof query === 'string' && query.length > 0) {
      handleSend(query);
    }
  }, [query]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Vibra AI</Text>
            <View style={styles.aiBadge}>
              <Sparkles size={10} color="#fff" fill="#fff" />
              <Text style={styles.aiBadgeText}>Pro</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleClear} style={styles.headerBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
              style={styles.profileBtn}
            >
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatar, styles.profilePlaceholder]}>
                  <Text style={styles.profileInitial}>{user?.firstName?.charAt(0) || 'V'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Keyboard Interaction Area */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          {/* Message List */}
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
            contentContainerStyle={styles.listContent}
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
              ) : error ? (
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
            {/* Mode & Direct Toggles */}
            <View style={styles.modeSwitcherContent}>
              <View style={styles.togglesRow}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={togglePlaylistMode}
                  style={[
                    styles.modeChip,
                    playlistMode ? styles.playlistModeActive : styles.chatModeActive
                  ]}
                >
                  {playlistMode ? (
                    <Music2 size={14} color="#000" />
                  ) : (
                    <Sparkles size={14} color="#fff" />
                  )}
                  <Text style={[
                    styles.modeChipText,
                    playlistMode ? styles.playlistModeText : styles.chatModeText
                  ]}>
                    {playlistMode ? 'Playlist Mode' : 'Chat Mode'}
                  </Text>
                </TouchableOpacity>


                {playlistMode && (
                  <>

                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => { setActivePlatform('spotify'); setShowImportModal(true); }}
                      style={[styles.modeChip, styles.platformChip]}
                    >
                      <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/174/174872.png' }} style={styles.chipIcon} />
                      <Text style={styles.platformChipText}>Spotify</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => { setActivePlatform('youtube'); setShowImportModal(true); }}
                      style={[styles.modeChip, styles.platformChip]}
                    >
                      <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' }} style={styles.chipIcon} />
                      <Text style={styles.platformChipText}>YouTube</Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => { setActivePlatform('ytmusic'); setShowImportModal(true); }}
                      style={[styles.modeChip, styles.platformChip]}
                    >
                      <Image source={require('../../assets/images/youtube_music.png')} style={styles.chipIcon} />
                      <Text style={styles.platformChipText}>YT Music</Text>
                    </TouchableOpacity> */}
                  </>
                )}
              </View>
            </View>

            {/* Suggestions */}
            {!isWorking && (
              <View style={styles.suggestionsContainer}>
                 <ScrollView 
                   horizontal 
                   showsHorizontalScrollIndicator={false}
                   contentContainerStyle={styles.suggestionsScroll}
                 >
                   {SUGGESTIONS.map((s, i) => (
                      <TouchableOpacity 
                        key={i} 
                        style={styles.suggestionChip}
                        onPress={() => handleSend(s)}
                      >
                        <Text style={styles.suggestionText}>{s}</Text>
                      </TouchableOpacity>
                   ))}
                 </ScrollView>
              </View>
            )}

            {/* Input Box */}
            <View style={[styles.inputArea, { paddingBottom: 8 + insets.bottom }]}>
              <View style={styles.inputWrapper}>
                <Animated.View style={[styles.inputGlow, glowAnimatedStyle]} pointerEvents="none" />
                <Animated.View style={[
                  styles.inputContainer,
                  isFocused && styles.inputContainerFocused,
                  borderAnimatedStyle
                ]}>
                  <TextInput
                    style={styles.input}
                    placeholder={playlistMode ? "Ask for a playlist..." : "Chat about music..."}
                    placeholderTextColor="#52525b"
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
                    <Send size={18} color={input.trim() ? "#fff" : "#3f3f46"} />
                  </TouchableOpacity>
                </Animated.View>
              </View>
              <Text style={[styles.disclaimer, { paddingBottom: insets.bottom > 0 ? 0 : 8 }]}>
                Vibra AI can make mistakes.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setShowImportModal(false)}
          style={styles.modalOverlay}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity activeOpacity={1} style={styles.importModalContent}>
              <View style={styles.importHeader}>
                <Text style={styles.importTitle}>Import Playlist</Text>
                <TouchableOpacity onPress={() => setShowImportModal(false)}>
                  <X size={20} color="#71717a" />
                </TouchableOpacity>
              </View>

              <View style={styles.platformSelector}>
                <TouchableOpacity 
                  onPress={() => setActivePlatform('spotify')}
                  style={[styles.platformOption, activePlatform === 'spotify' && styles.platformActive]}
                >
                  <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/174/174872.png' }} style={styles.platformIcon} />
                  <Text style={[styles.platformText, activePlatform === 'spotify' && styles.platformTextActive]}>Spotify</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   onPress={() => setActivePlatform('youtube')}
                   style={[styles.platformOption, activePlatform === 'youtube' && styles.platformActive]}
                >
                   <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' }} style={styles.platformIcon} />
                   <Text style={[styles.platformText, activePlatform === 'youtube' && styles.platformTextActive]}>YouTube</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   onPress={() => setActivePlatform('ytmusic')}
                   style={[styles.platformOption, activePlatform === 'ytmusic' && styles.platformActive]}
                >
                   <Image source={require('../../assets/images/youtube_music.png')} style={styles.platformIcon} />
                   <Text style={[styles.platformText, activePlatform === 'ytmusic' && styles.platformTextActive]}>YT Music</Text>
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
                    <Link2 size={16} color="#000" />
                    <Text style={styles.importBtnText}>Import Now</Text>
                  </TouchableOpacity>
                );
              })()}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Playlist Result Modal */}
      <Modal
        visible={!!selectedPlaylist}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <PlaylistResult 
          playlist={selectedPlaylist as any}
          onClose={() => setSelectedPlaylist(null)}
          onRegenerate={() => {
            const query = messages[messages.length - 2]?.text;
            if (query) handleSend(query);
            setSelectedPlaylist(null);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#18181b',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
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
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
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
    backgroundColor: '#18181b',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  userBubble: {
    backgroundColor: '#fff',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiText: {
    color: '#d4d4d8',
  },
  userText: {
    color: '#000',
    fontWeight: '600',
  },
  workingIndicator: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  workingBubble: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
  },
  workingText: {
    color: '#71717a',
    fontSize: 14,
    fontStyle: 'italic',
  },
  interactionWrapper: {
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#18181b',
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
  modeChipText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
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
  inputArea: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#09090b',
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1.5,
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
  inputContainerFocused: {
    borderColor: '#3f3f46',
    backgroundColor: '#0c0c0e',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  disclaimer: {
    textAlign: 'center',
    color: '#3f3f46',
    fontSize: 10,
    marginTop: 8,
    fontWeight: '500',
  },
  suggestionsContainer: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  suggestionsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#09090b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#18181b',
  },
  suggestionText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    marginVertical: 10,
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
    backgroundColor: '#18181b',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 12,
    width: '100%',
  },
  cardImageContainer: {
    width: 60,
    height: 60,
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
    fontSize: 15,
    fontWeight: '700',
  },
  cardMeta: {
    color: '#71717a',
    fontSize: 11,
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  viewBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  importModeChip: {
    backgroundColor: '#18181b',
    borderColor: '#27272a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  importModalContent: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  importHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  importTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  importDesc: {
    color: '#a1a1aa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  importInput: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    marginBottom: 20,
  },
  importBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  importBtnDisabled: {
    opacity: 0.5,
  },
  importBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  platformSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  platformOption: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 6,
  },
  platformActive: {
    borderColor: '#fff',
    backgroundColor: '#27272a',
  },
  platformIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  platformText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
  },
  platformTextActive: {
    color: '#fff',
  },
});