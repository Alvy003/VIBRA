import UsersListSkeleton from "@/components/skeletons/UsersListSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/useChatStore";

const UsersList = () => {
  const {
    users,
    selectedUser,
    isLoading,
    setSelectedUser,
    onlineUsers,
    unreadMessagesByUser,
  } = useChatStore();

  return (
    <div className="border-r border-zinc-800">
      <div className="flex flex-col h-full">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-2 p-4">
            {isLoading ? (
              <UsersListSkeleton />
            ) : (
              users.map((user) => {
                const unreadCount = unreadMessagesByUser[user.clerkId] || 0;
                const isSelected = selectedUser?.clerkId === user.clerkId;

                return (
                  <div
                    key={user._id}
                    onClick={() => setSelectedUser(user)}
                    className={`flex items-center justify-center lg:justify-start gap-3 p-3 
                    rounded-lg cursor-pointer transition-colors
                    ${isSelected ? "bg-zinc-800" : "hover:bg-zinc-800/50"}`}
                  >
                    <div className="relative">
                      <Avatar className="size-8 md:size-12">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback>{user.fullName[0]}</AvatarFallback>
                      </Avatar>

                      {/* online indicator */}
                      <div
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-zinc-900
                        ${onlineUsers.has(user.clerkId) ? "bg-violet-600" : "bg-zinc-500"}`}
                      />

                      {/* Mobile unread badge (visible only on small screens) */}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 lg:hidden bg-violet-600 text-white text-xs font-semibold h-4 w-4 rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 lg:block hidden relative">
                      <span className="font-medium truncate">{user.fullName}</span>

                      {/* Desktop unread badge (visible only on large screens) */}
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold leading-none text-white bg-violet-600 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default UsersList;
