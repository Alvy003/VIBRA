import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatStore } from "@/stores/useChatStore";
import { ArrowLeft } from "lucide-react";

const ChatHeader = () => {
	const { selectedUser, onlineUsers, setSelectedUser } = useChatStore();

	if (!selectedUser) return null;

	return (
		<div className='p-4 border-b border-zinc-800'>
			<div className='flex items-center gap-3'>

				{/* 👈 Back button (only on small screens) */}
				<button
					onClick={() => setSelectedUser(null)}
					className='lg:hidden text-zinc-400 hover:text-white transition'
				>
					<ArrowLeft className='w-5 h-5' />
				</button>

				<Avatar>
					<AvatarImage src={selectedUser.imageUrl} />
					<AvatarFallback>{selectedUser.fullName[0]}</AvatarFallback>
				</Avatar>

				<div>
					<h2 className='font-medium'>{selectedUser.fullName}</h2>
					<p className='text-sm text-zinc-400'>
						{onlineUsers.has(selectedUser.clerkId) ? "Online" : "Offline"}
					</p>
				</div>
			</div>
		</div>
	);
};

export default ChatHeader;
