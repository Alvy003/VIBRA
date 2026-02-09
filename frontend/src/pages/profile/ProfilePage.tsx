// src/pages/profile/ProfilePage.tsx
import { useUser, useClerk } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  ChevronRight, 
  Shield, 
  LogOut,
  User,
  Settings,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppUpdate } from "@/hooks/useAppUpdate";

const ProfilePage = () => {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const navigate = useNavigate();
  
  const { showMusicActivityInChat, setShowMusicActivityInChat } = usePreferencesStore();
  const { currentVersion } = useAppUpdate();

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

            <h1 className="text-2xl font-semibold text-white">
                Settings
            </h1>
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

            {/* Chat & Social Section */}
            <PreferencesSection icon={MessageSquare} title="Chat & Social">
            <TogglePreference
                label="Show friends music activity"
                description={
                    <>
                    {/* Small devices */}
                    <span className="md:hidden">
                        See what your friends are listening to in the chat list.
                    </span>

                    {/* Medium and up */}
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
            <div className="text-center pt-4">
              <p className="text-xs text-white/50">Vibra v{currentVersion || '...'}</p>
            </div>
            </div>
        </ScrollArea>
        </motion.div>
    );
};

export default ProfilePage;

// Sub-components

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