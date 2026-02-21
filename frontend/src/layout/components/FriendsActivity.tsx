// src/components/FriendsActivity.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/useChatStore";
import { useUser } from "@clerk/clerk-react";
import { HeadphonesIcon, Headphones } from "lucide-react";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/stores/usePreferencesStore"; 

const FriendsActivity = () => {
  const { users, fetchUsers, onlineUsers, userActivities } = useChatStore();
  const { user } = useUser();
  const { showMusicActivityInChat } = usePreferencesStore();

  useEffect(() => {
    if (user) fetchUsers();
  }, [fetchUsers, user]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = onlineUsers.has(a.clerkId);
      const bOnline = onlineUsers.has(b.clerkId);
      const aActivity = userActivities.get(a.clerkId);
      const bActivity = userActivities.get(b.clerkId);
      const aPlaying = aActivity && aActivity !== "Idle";
      const bPlaying = bActivity && bActivity !== "Idle";

      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      if (aOnline && bOnline) {
        if (aPlaying && !bPlaying) return -1;
        if (!aPlaying && bPlaying) return 1;
      }

      return 0;
    });
  }, [users, onlineUsers, userActivities]);

  if (!user) return <LoginPrompt />;

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="py-2">
          {sortedUsers.map((user, index) => {
            const activity = userActivities.get(user.clerkId);
            const isOnline = onlineUsers.has(user.clerkId);
            const isPlaying = showMusicActivityInChat && activity && activity !== "Idle";

            let songTitle = "";
            let artistName = "";
            if (isPlaying) {
              const parts = activity.replace("Playing ", "").split(" by ");
              songTitle = parts[0] || "";
              artistName = parts[1] || "";
            }

            const isLastItem = index === sortedUsers.length - 1;

            return (
              <div key={user._id}>
                <div
                  className={cn(
                    "group relative px-4 py-2 transition-colors duration-150",
                    "hover:bg-zinc-800/50 cursor-pointer"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="size-9">
                        <AvatarImage src={user.imageUrl} alt={user.fullName} />
                        <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                          {user.fullName[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Online indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full border-2 border-zinc-900",
                            isOnline ? "bg-violet-500" : "bg-zinc-600"
                          )}
                        />
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-normal text-sm text-zinc-100 truncate">
                          {user.fullName}
                        </span>
                        {isPlaying && (
                          <div className="flex items-center gap-[3px] shrink-0">
                            <div className="w-[3px] h-2.5 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                            <div className="w-[3px] h-2.5 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                            <div className="w-[3px] h-2.5 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>

                      {isPlaying ? (
                        <div className="space-y-0">
                          <div className="flex items-center gap-1.5">
                            <Headphones 
                              className="size-3 text-violet-400 shrink-0" 
                            />
                            <span className="text-xs text-white/80 line-clamp-1">
                              {songTitle}
                            </span>
                          </div>
                          {artistName && (
                            <span className="text-xs text-white/50 line-clamp-1 pl-[18px]">
                              {artistName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-white/40">
                          {isOnline ? "Idle" : "Offline"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                {!isLastItem && (
                  <div className="mx-4 border-b border-zinc-800/30" />
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FriendsActivity;

const LoginPrompt = () => (
  <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
    <div className="relative">
      <div
        className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-full blur-xl opacity-50"
        aria-hidden="true"
      />
      <div className="relative bg-zinc-800/50 rounded-full p-4">
        <HeadphonesIcon className="size-7 text-zinc-400" />
      </div>
    </div>

    <div className="space-y-2 max-w-[180px]">
      <h3 className="text-sm font-medium text-zinc-300">See Friend Activity</h3>
      <p className="text-xs text-zinc-500 leading-relaxed">
        Sign in to see what your friends are playing
      </p>
    </div>
  </div>
);