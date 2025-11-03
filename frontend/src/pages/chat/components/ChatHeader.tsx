import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatStore } from "@/stores/useChatStore";
import { ArrowLeft, Phone, PhoneOff, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useCallStore } from "@/stores/useCallStore";

const ChatHeader = () => {
  const { selectedUser, onlineUsers, setSelectedUser } = useChatStore();
  const { user } = useUser();
  const myId = user?.id || null;

  const status = useCallStore((s) => s.status);
  const peerId = useCallStore((s) => s.peerId);
  const incomingFrom = useCallStore((s) => s.incomingFrom);
  const actions = useCallStore((s) => s.actions);

  if (!selectedUser) return null;

  const isInAnyCall = status === "calling" || status === "connecting" || status === "connected";
  const isIncomingFromSelected = status === "incoming" && incomingFrom === selectedUser.clerkId;
  const isInCallWithSelected = isInAnyCall && peerId === selectedUser.clerkId;

  return (
    <div className="p-4 border-b border-zinc-700/80 bg-zinc-900/50 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedUser(null)}
            className="lg:hidden text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <Avatar className="size-10">
            <AvatarImage src={selectedUser.imageUrl} />
            <AvatarFallback>{selectedUser.fullName?.[0] || "U"}</AvatarFallback>
          </Avatar>

          <div className="leading-tight">
            <h2 className="font-medium text-white">{selectedUser.fullName}</h2>
            <p className="text-xs text-zinc-400">
              {onlineUsers.has(selectedUser.clerkId) ? "Online" : "Offline"}
              {isInCallWithSelected && (
                <span className="ml-2 inline-flex items-center gap-1 text-violet-400">
                  {status === "calling" && (
                    <>
                      <PhoneOutgoing className="w-3 h-3" /> Ringing...
                    </>
                  )}
                  {status === "connecting" && <>Connecting...</>}
                  {status === "connected" && <>In call</>}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isIncomingFromSelected ? (
            <>
              <button
                onClick={() => {
                  actions.acceptCall();
                  actions.setMinimized(false);
                }}
                className="p-2 rounded-full bg-green-600 text-white hover:bg-green-500 shadow-md transition-colors"
                title="Accept"
              >
                <PhoneIncoming className="w-4 h-4" />
              </button>
              <button
                onClick={actions.declineCall}
                className="p-2 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-md transition-colors"
                title="Decline"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </>
          ) : isInCallWithSelected ? (
            <>
              <button
                onClick={() => actions.setMinimized(false)}
                className="p-2 rounded-full bg-violet-600 text-white hover:bg-violet-500 shadow-md transition-colors"
                title="Open call"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={actions.endCall}
                className="p-2 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-md transition-colors"
                title="End call"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </>
          ) : (
            !isInAnyCall &&
            myId && (
              <button
                onClick={() => {
                  actions.startCall(selectedUser.clerkId);
                  actions.setMinimized(false);
                }}
                className="p-2 rounded-full text-white hover:text-violet-300 shadow-md transition-colors"
                title="Call"
              >
                <Phone className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;