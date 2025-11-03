import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/useChatStore";
import { useUser } from "@clerk/clerk-react";
import { HeadphonesIcon, Music, Users, Disc3 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

const FriendsActivity = () => {
  const { users, fetchUsers, onlineUsers, userActivities } = useChatStore();
  const { user } = useUser();

  useEffect(() => {
    if (user) fetchUsers();
  }, [fetchUsers, user]);

  // ✅ Sort users: online first, then by activity status
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = onlineUsers.has(a.clerkId);
      const bOnline = onlineUsers.has(b.clerkId);
      const aActivity = userActivities.get(a.clerkId);
      const bActivity = userActivities.get(b.clerkId);
      const aPlaying = aActivity && aActivity !== "Idle";
      const bPlaying = bActivity && bActivity !== "Idle";

      // 1. Online users first
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      // 2. Among online users, playing users first
      if (aOnline && bOnline) {
        if (aPlaying && !bPlaying) return -1;
        if (!aPlaying && bPlaying) return 1;
      }

      // 3. Otherwise keep original order
      return 0;
    });
  }, [users, onlineUsers, userActivities]);

  const onlineCount = users.filter((u) => onlineUsers.has(u.clerkId)).length;

  return (
    <div className='h-full bg-zinc-900 rounded-lg flex flex-col overflow-hidden'>
      {/* ✅ Polished Header */}
      <div className='p-4 border-b border-zinc-800/50 bg-gradient-to-b from-zinc-800/50 to-transparent'>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <div className='p-1.5 bg-violet-500/10 rounded-lg'>
              <Users className='size-4 text-violet-400' />
            </div>
            <h2 className='font-semibold text-white'>Friends Activity</h2>
          </div>
          {user && onlineCount > 0 && (
            <div className='flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 rounded-full'>
              <div className='w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse' />
              <span className='text-xs font-medium text-violet-400'>{onlineCount} online</span>
            </div>
          )}
        </div>
        <p className='text-xs text-zinc-500'>See what your friends are listening to</p>
      </div>

      {!user && <LoginPrompt />}

      <ScrollArea className='flex-1'>
        <div className='p-3 space-y-2'>
          {sortedUsers.map((user) => {
            const activity = userActivities.get(user.clerkId);
            const isOnline = onlineUsers.has(user.clerkId);
            const isPlaying = activity && activity !== "Idle";

            // Parse song info
            let songTitle = "";
            let artistName = "";
            if (isPlaying) {
              const parts = activity.replace("Playing ", "").split(" by ");
              songTitle = parts[0] || "";
              artistName = parts[1] || "";
            }

            return (
              <div
                key={user._id}
                className={cn(
                  'group relative rounded-lg transition-all duration-200',
                  'hover:bg-zinc-800/70 cursor-pointer',
                  isPlaying && 'bg-zinc-800/30'
                )}
              >
                {/* ✅ Gradient accent when playing */}
                {isPlaying && (
                  <div className='absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent rounded-lg' />
                )}

                <div className='relative p-3'>
                  <div className='flex items-start gap-3'>
                    {/* ✅ Enhanced Avatar */}
                    <div className='relative shrink-0'>
                      <div className={cn(
                        'rounded-full p-0.5 transition-all duration-200',
                      )}>
                        <Avatar className='size-11 border-2 border-zinc-900'>
                          <AvatarImage src={user.imageUrl} alt={user.fullName} />
                          <AvatarFallback className='bg-violet-500/20 text-violet-400'>
                            {user.fullName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      {/* ✅ Enhanced Online/Offline Badge */}
                      <div className='absolute -bottom-0.5 -right-0.5'>
                        <div className={cn(
                          'h-3.5 w-3.5 rounded-full border-2 border-zinc-900 transition-all',
                          isOnline ? 'bg-violet-500 shadow-lg shadow-violet-500/50' : 'bg-zinc-600'
                        )} />
                      </div>
                    </div>

                    {/* ✅ User Info */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='font-medium text-sm text-white truncate'>
                          {user.fullName}
                        </span>
                        {isPlaying && (
                          <div className='flex items-center gap-0.5 shrink-0'>
                            <div className='w-0.5 h-3 bg-violet-500 rounded-full animate-pulse' style={{ animationDelay: '0ms' }} />
                            <div className='w-0.5 h-3 bg-violet-500 rounded-full animate-pulse' style={{ animationDelay: '150ms' }} />
                            <div className='w-0.5 h-3 bg-violet-500 rounded-full animate-pulse' style={{ animationDelay: '300ms' }} />
                          </div>
                        )}
                      </div>

                      {isPlaying ? (
                        <div className='space-y-0.5'>
                          <div className='flex items-center gap-1.5'>
                            <Disc3 className='size-3 text-violet-400 shrink-0 animate-spin' style={{ animationDuration: '3s' }} />
                            <div className='text-sm text-white font-medium truncate'>
                              {songTitle}
                            </div>
                          </div>
                          {artistName && (
                            <div className='text-xs text-zinc-400 truncate pl-4'>
                              {artistName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className='flex items-center gap-1.5'>
                          <div className='w-1.5 h-1.5 bg-zinc-600 rounded-full' />
                          <span className='text-xs text-zinc-500'>Idle</span>
                        </div>
                      )}
                    </div>

                    {/* ✅ Playing Indicator */}
                    {isPlaying && (
                      <div className='shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'>
                        <div className='p-1.5 bg-violet-500/10 rounded-lg'>
                          <Music className='size-3.5 text-violet-400' />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
  <div className='h-full flex flex-col items-center justify-center p-6 text-center space-y-4'>
    <div className='relative'>
      <div
        className='absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full blur-xl
         opacity-75 animate-pulse'
        aria-hidden='true'
      />
      <div className='relative bg-zinc-900 rounded-full p-4 ring-1 ring-violet-500/20'>
        <HeadphonesIcon className='size-8 text-violet-400' />
      </div>
    </div>

    <div className='space-y-2 max-w-[250px]'>
      <h3 className='text-lg font-semibold text-white'>See What Friends Are Playing</h3>
      <p className='text-sm text-zinc-400 leading-relaxed'>
        Login to discover what music your friends are enjoying right now
      </p>
    </div>
  </div>
);