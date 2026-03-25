// app/profile.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Pressable,
  Modal,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useUser, useClerk } from '@clerk/clerk-expo';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  Shield,
  Globe,
  HardDrive,
  LogOut,
  Bell,
  Download,
  Check,
  X,
  Volume2,
  Wifi,
  Smartphone,
  Mail,
  Eye,
  Info,
  FileText,
  ExternalLink,
} from 'lucide-react-native';

// Disable expo-router header
export const unstable_settings = {
  initialRouteName: 'profile',
};

// ─── Spotify Colors ───
const SPOTIFY = {
  background: '#121212',
  surface: '#1a1a1a',
  divider: 'rgba(255,255,255,0.08)',
  textPrimary: '#ffffff',
  textSecondary: '#b3b3b3',
  textMuted: '#727272',
  green: '#8B5CF6',
  row: 'transparent',
};

// ─── Available Languages ───
const AVAILABLE_LANGUAGES = [
  { id: 'hindi', label: 'Hindi' },
  { id: 'english', label: 'English' },
  { id: 'punjabi', label: 'Punjabi' },
  { id: 'tamil', label: 'Tamil' },
  { id: 'telugu', label: 'Telugu' },
  { id: 'kannada', label: 'Kannada' },
  { id: 'malayalam', label: 'Malayalam' },
  { id: 'bengali', label: 'Bengali' },
  { id: 'marathi', label: 'Marathi' },
  { id: 'gujarati', label: 'Gujarati' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Local state
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['hindi', 'english']);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [gaplessPlayback, setGaplessPlayback] = useState(true);
  const [autoplay, setAutoplay] = useState(true);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.replace('/(auth)/login' as any);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [signOut, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!user) return null;

  const selectedLanguageLabels = AVAILABLE_LANGUAGES
    .filter(l => selectedLanguages.includes(l.id))
    .map(l => l.label);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SPOTIFY.background} />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={28} color={SPOTIFY.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.headerDivider} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Profile Row ─── */}
          <TouchableOpacity style={styles.profileRow} activeOpacity={0.7}>
            <Image
              source={user.imageUrl}
              style={styles.profileAvatar}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.fullName || 'User'}</Text>
              <Text style={styles.profileSubtext}>View profile</Text>
            </View>
            <ChevronRight size={24} color={SPOTIFY.textMuted} />
          </TouchableOpacity>

          {/* ─── Account ─── */}
          <SectionTitle title="Account" />
          <SettingsRow
            icon={User}
            title="Username"
            subtitle={user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0]}
          />
          <SettingsRow
            icon={Mail}
            title="Email"
            subtitle={user.primaryEmailAddress?.emailAddress}
          />
          <SettingsRow
            icon={Settings}
            title="Manage account"
            onPress={() => {}}
          />

          {/* ─── Content and Display ─── */}
          <SectionTitle title="Content and display" />
          <SettingsRow
            icon={Globe}
            title="Languages for music"
            subtitle={
              selectedLanguageLabels.length > 2
                ? `${selectedLanguageLabels.slice(0, 2).join(', ')} +${selectedLanguageLabels.length - 2}`
                : selectedLanguageLabels.join(', ') || 'None'
            }
            onPress={() => setShowLanguageModal(true)}
          />

          {/* ─── Notifications ─── */}
          <SectionTitle title="Notifications" />
          <SettingsRow
            icon={Bell}
            title="Push notifications"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={(val) => {
                  setNotificationsEnabled(val);
                }}
                trackColor={{ false: '#404040', true: SPOTIFY.green }}
                thumbColor="#fff"
              />
            }
          />

          {/* ─── Data Saving and Offline ─── */}
          <SectionTitle title="Data saving and offline" />
          <SettingsRow
            icon={Wifi}
            title="Data Saver"
            subtitle="Sets audio quality to Low and disables Canvas"
            rightElement={
              <Switch
                value={dataSaver}
                onValueChange={(val) => {
                  setDataSaver(val);
                }}
                trackColor={{ false: '#404040', true: SPOTIFY.green }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon={Download}
            title="Downloads"
            subtitle="0 songs"
            onPress={() => {}}
          />

          {/* ─── Storage ─── */}
          <SectionTitle title="Storage" />
          <SettingsRow
            icon={HardDrive}
            title="Clear cache"
            subtitle="Free up storage on your device"
            onPress={() => {}}
          />

          {/* ─── About ─── */}
          <SectionTitle title="About" />
          <SettingsRow
            icon={Info}
            title="Version"
            subtitle="1.0.0 (build 1)"
          />
          <SettingsRow
            icon={FileText}
            title="Privacy Policy"
            rightElement={<ExternalLink size={18} color={SPOTIFY.textMuted} />}
            onPress={() => {}}
          />
          <SettingsRow
            icon={FileText}
            title="Terms of Service"
            rightElement={<ExternalLink size={18} color={SPOTIFY.textMuted} />}
            onPress={() => {}}
          />

          {/* ─── Log Out Button ─── */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.logoutButton}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ─── Language Selection Modal ─── */}
      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        selectedLanguages={selectedLanguages}
        onSave={setSelectedLanguages}
      />
    </View>
  );
}

// ─── Section Title ───
interface SectionTitleProps {
  title: string;
}

const SectionTitle = React.memo(({ title }: SectionTitleProps) => (
  <View style={styles.sectionTitleContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
));

// ─── Settings Row ───
interface SettingsRowProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingsRow = React.memo(({
  icon: Icon,
  title,
  subtitle,
  onPress,
  rightElement,
}: SettingsRowProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const content = (
    <>
      <View style={styles.rowIconContainer}>
        <Icon size={22} color={SPOTIFY.textSecondary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
      {rightElement ? (
        rightElement
      ) : onPress ? (
        <ChevronRight size={22} color={SPOTIFY.textMuted} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        style={[styles.row, animatedStyle]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
});

// ─── Language Modal ───
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
  const [localSelection, setLocalSelection] = useState<string[]>(selectedLanguages);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      setLocalSelection(selectedLanguages);
    }
  }, [visible, selectedLanguages]);

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

  const hasChanges = JSON.stringify([...localSelection].sort()) !==
                     JSON.stringify([...selectedLanguages].sort());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={StyleSheet.absoluteFill}
          />
        </Pressable>

        <Animated.View
        //   entering={SlideInDown.springify().damping(20).stiffness(200)}
          exiting={SlideOutDown.springify().damping(20).stiffness(200)}
          style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <X size={24} color={SPOTIFY.textPrimary} />
            </TouchableOpacity>
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
                    isSelected && styles.languageTextSelected,
                  ]}>
                    {lang.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Check size={20} color={SPOTIFY.green} strokeWidth={3} />
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
        </Animated.View>
      </View>
    </Modal>
  );
});

// ─── Styles ───
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPOTIFY.background,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: SPOTIFY.background,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: SPOTIFY.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  headerDivider: {
    height: 1,
    backgroundColor: SPOTIFY.divider,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },

  // Profile Row
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: SPOTIFY.row,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    color: SPOTIFY.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  profileSubtext: {
    color: SPOTIFY.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },

  // Section Title
  sectionTitleContainer: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: SPOTIFY.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    backgroundColor: SPOTIFY.row,
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
    color: SPOTIFY.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  rowSubtitle: {
    color: SPOTIFY.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },

  // Logout
  logoutContainer: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: SPOTIFY.textMuted,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: SPOTIFY.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    color: SPOTIFY.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  footerSubtext: {
    color: SPOTIFY.textMuted,
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#282828',
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
  modalCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  modalTitle: {
    color: SPOTIFY.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  modalHeaderSpacer: {
    width: 44,
  },
  modalSubtitle: {
    color: SPOTIFY.textSecondary,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Language List
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
    borderBottomColor: SPOTIFY.divider,
  },
  languageText: {
    color: SPOTIFY.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  languageTextSelected: {
    color: SPOTIFY.green,
  },
  checkmark: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Footer
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  saveButton: {
    backgroundColor: SPOTIFY.green,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#404040',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  saveButtonTextDisabled: {
    color: SPOTIFY.textMuted,
  },
});