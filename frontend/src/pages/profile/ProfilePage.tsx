// src/pages/profile/ProfilePage.tsx
import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ChevronRight, 
  Shield, 
  LogOut,
  User,
  Settings,
  MessageSquare,
  Globe,
  Check,
  Pencil,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useStreamStore } from "@/stores/useStreamStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { cn } from "@/lib/utils";
import { HardDrive, Download } from "lucide-react";
import { useStorageInfo } from "@/hooks/useStorageInfo";
import { useDownloads } from "@/hooks/useDownloads";

const ProfilePage = () => {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const navigate = useNavigate();
  
  const { showMusicActivityInChat, setShowMusicActivityInChat } = usePreferencesStore();
  // const { currentVersion } = useAppUpdate();

  const [showLanguageEditor, setShowLanguageEditor] = useState(false);

  const handleBack = () => {
    navigate(-1);
  };

  const handleManageAccount = () => {
    openUserProfile();
  };

  const handleSignOut = () => {
    signOut(() => navigate("/"));
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-zinc-900 lg:relative lg:inset-auto lg:z-auto"
    >
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 lg:hidden safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-zinc-800 active:bg-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-300" />
          </button>
          <h1 className="text-lg font-semibold text-white">Settings</h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block border-b border-zinc-800 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-zinc-800 active:bg-zinc-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-300" />
            </button>
            <h1 className="text-2xl font-semibold text-white">Settings</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            Manage your profile and preferences
          </p>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-64px)] md:h-[calc(100vh-210px)]">
        <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6 pb-32 lg:pb-6">
          
          {/* Profile Header */}
          <ProfileHeader user={user} />

          {/* Music Preferences Section */}
          <PreferencesSection icon={Globe} title="Music Preferences">
            <LanguagePreferenceItem onEdit={() => setShowLanguageEditor(true)} />
          </PreferencesSection>

          {/* Chat & Social Section */}
          <PreferencesSection icon={MessageSquare} title="Chat & Social">
            <TogglePreference
              label="Show friends music activity"
              description={
                <>
                  <span className="md:hidden">
                    See what your friends are listening to in the chat list.
                  </span>
                  <span className="hidden md:inline">
                    See what your friends are listening to in activity feed.
                  </span>
                </>
              }
              checked={showMusicActivityInChat}
              onCheckedChange={setShowMusicActivityInChat}
            />
          </PreferencesSection>

          {/* Account Section */}
          <PreferencesSection icon={User} title="Account">
            <ActionItem
              icon={Settings}
              label="Manage account"
              description="Update your profile information and settings"
              onClick={handleManageAccount}
            />
            <ActionItem
              icon={Shield}
              label="Security & sessions"
              description="Manage your active sessions and security settings"
              onClick={handleManageAccount}
            />
          </PreferencesSection>

          {/* App & Storage */}
<PreferencesSection icon={HardDrive} title="App & Storage">
  <StorageRow />
  <UpdateRow />
</PreferencesSection>

          {/* Sign Out */}
          <div className="pt-4">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 active:bg-zinc-700 text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">Sign out</span>
            </button>
          </div>

          {/* App Version */}
          {/* <div className="text-center pt-4">
            <p className="text-xs text-white/50">Vibra v{currentVersion || '...'}</p>
          </div> */}
        </div>
      </ScrollArea>

      {/* Language Editor Modal */}
      <AnimatePresence>
        {showLanguageEditor && (
          <LanguageEditorModal onClose={() => setShowLanguageEditor(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============ Storage Row ============

const StorageRow = () => {
  const { storage, formatBytes } = useStorageInfo();
  const { listDownloads } = useDownloads();
  const [downloadCount, setDownloadCount] = useState(0);

  useEffect(() => {
    listDownloads().then((songs) => {
      setDownloadCount(songs.length);
    }).catch(() => {});
  }, [listDownloads]);

  const percentage = storage?.percentage || 0;

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="p-2 bg-zinc-700/50 rounded-lg shrink-0">
        <Download className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Downloads storage</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {downloadCount} {downloadCount === 1 ? "song" : "songs"}
          {storage ? ` • ${formatBytes(storage.used)} used` : ""}
        </p>
        {storage && (
          <div className="w-full bg-zinc-700/40 rounded-full h-[3px] mt-2 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                percentage > 90
                  ? "bg-red-400"
                  : percentage > 70
                    ? "bg-amber-400"
                    : "bg-violet-500"
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ============ Update Row ============

const UpdateRow = () => {
  const {
    updateAvailable,
    isUpdating,
    updateApplied,
    currentVersion,
    applyUpdate,
  } = useAppUpdate();

  if (updateApplied) {
    return (
      <div className="flex items-center gap-3 p-4">
        <div className="p-2 bg-zinc-700/50 rounded-lg shrink-0">
          <HardDrive className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">App update</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Restart app to finish updating
          </p>
        </div>
      </div>
    );
  }

  if (updateAvailable) {
    return (
      <button
        onClick={applyUpdate}
        disabled={isUpdating}
        className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors text-left"
      >
        <div className="p-2 bg-zinc-700/50 rounded-lg shrink-0">
          <HardDrive className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">App update</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isUpdating ? "Installing..." : "Update available"}
          </p>
        </div>
        {!isUpdating && (
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shrink-0" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="p-2 bg-zinc-700/50 rounded-lg shrink-0">
        <HardDrive className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">App update</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          v{currentVersion || "..."} • You're up to date
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;


// ============ Language Preference Display Item ============

const LanguagePreferenceItem = ({ onEdit }: { onEdit: () => void }) => {
  const { preferences, availableLanguages } = useOnboardingStore();
  
  const selectedLangs = availableLanguages.filter((l) =>
    preferences.languages.includes(l.id)
  );

  return (
    <button
      onClick={onEdit}
      className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors text-left"
    >
      <div className="p-2 bg-zinc-700/50 rounded-lg shrink-0">
        <Globe className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Music languages</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {selectedLangs.length > 0 ? (
            <>
              {selectedLangs.slice(0, 4).map((lang) => (
                <span
                  key={lang.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-700/60 text-xs text-zinc-300"
                >
                  <span>{lang.label}</span>
                </span>
              ))}
              {selectedLangs.length > 4 && (
                <span className="text-xs text-zinc-500">
                  +{selectedLangs.length - 4} more
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-zinc-500">None selected</span>
          )}
        </div>
      </div>
      <Pencil className="w-4 h-4 text-zinc-600 shrink-0" />
    </button>
  );
};


// ============ Language Editor Modal ============

const LanguageEditorModal = ({ onClose }: { onClose: () => void }) => {
  const { preferences, availableLanguages, setLanguages } =
    useOnboardingStore();

  // Work with a local copy so we can cancel
  const [localSelected, setLocalSelected] = useState<string[]>([
    ...preferences.languages,
  ]);

  const handleToggle = (langId: string) => {
    setLocalSelected((prev) =>
      prev.includes(langId)
        ? prev.filter((l) => l !== langId)
        : [...prev, langId]
    );
  };

  const handleSave = () => {
    setLanguages(localSelected);
    // Refresh homepage with new preferences
    useStreamStore.setState({ homepageData: null });
    useStreamStore.getState().fetchHomepage();
    onClose();
  };

  const hasChanges =
    JSON.stringify([...localSelected].sort()) !==
    JSON.stringify([...preferences.languages].sort());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="bg-zinc-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden border border-zinc-800/60 shadow-2xl shadow-black/50 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white">Edit Languages</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {localSelected.length} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-zinc-400 hover:text-zinc-300 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Language Grid */}
        <div className="px-5 flex-1 overflow-y-auto scrollbar-none min-h-0">
          <div className="grid grid-cols-2 gap-2 pb-2">
            {availableLanguages.map((lang) => {
              const isSelected = localSelected.includes(lang.id);
              return (
                <motion.button
                  key={lang.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleToggle(lang.id)}
                  className={cn(
                    "relative flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 text-left",
                    isSelected
                      ? "bg-violet-600/15 border-violet-500/40"
                      : "bg-zinc-800/40 border-zinc-700/30 hover:bg-zinc-800/70"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium flex-1 transition-colors",
                      isSelected ? "text-white" : "text-zinc-400"
                    )}
                  >
                    {lang.label}
                  </span>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                      isSelected
                        ? "bg-violet-500 scale-100"
                        : "bg-zinc-700/50 scale-90"
                    )}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-5 border-t border-zinc-800/40">
          <button
            onClick={handleSave}
            disabled={localSelected.length === 0}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-6 py-3.5 font-semibold rounded-xl transition-all active:scale-[0.98]",
              localSelected.length > 0
                ? "bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {localSelected.length === 0
              ? "Select at least 1 language"
              : hasChanges
                ? "Save Changes"
                : "Done"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};


// ============ Sub-components (unchanged logic, kept for completeness) ============

interface ProfileHeaderProps {
  user: {
    imageUrl: string;
    fullName: string | null;
    primaryEmailAddress?: { emailAddress: string } | null;
  };
}

const ProfileHeader = ({ user }: ProfileHeaderProps) => (
  <div className="flex items-center gap-4 p-4 bg-zinc-800/30 rounded-2xl">
    <Avatar className="w-16 h-16 lg:w-20 lg:h-20 ring-2 ring-violet-500/20">
      <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
      <AvatarFallback className="bg-zinc-700 text-white text-xl">
        {user.fullName?.[0] || "U"}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <h2 className="text-lg lg:text-xl font-semibold text-white truncate">
        {user.fullName || "User"}
      </h2>
      <p className="text-sm text-zinc-400 truncate">
        {user.primaryEmailAddress?.emailAddress}
      </p>
    </div>
  </div>
);

interface PreferencesSectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

const PreferencesSection = ({ icon: Icon, title, children }: PreferencesSectionProps) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 px-1 mb-3">
      <Icon className="w-4 h-4 text-zinc-400" />
      <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
    </div>
    <div className="bg-zinc-800/30 rounded-2xl overflow-hidden divide-y divide-zinc-800/50">
      {children}
    </div>
  </div>
);

interface TogglePreferenceProps {
  label: string;
  description?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const TogglePreference = ({ label, description, checked, onCheckedChange }: TogglePreferenceProps) => (
  <div className="flex items-center justify-between gap-4 p-4">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white">{label}</p>
      {description && (
        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
      )}
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="data-[state=checked]:bg-violet-600 shrink-0"
    />
  </div>
);

interface ActionItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
}

const ActionItem = ({ icon: Icon, label, description, onClick }: ActionItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors text-left"
  >
    <div className="p-2 bg-zinc-700/50 rounded-lg shrink-0">
      <Icon className="w-4 h-4 text-zinc-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white">{label}</p>
      {description && (
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      )}
    </div>
    <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
  </button>
);