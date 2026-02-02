export interface Song {
	_id: string;
	title: string;
	artist: string;
	albumId: string | null;
	imageUrl: string;
	audioUrl: string;
	duration: number;
	createdAt: string;
	updatedAt: string;
	audioBlob?: Blob; 
}

export interface Album {
	_id: string;
	title: string;
	artist: string;
	imageUrl?: string | null;
	releaseYear: number;
	previewImages?: string[]; 
	songs: Song[];
	useMosaicCover?: boolean;
}

export interface Stats {
	totalSongs: number;
	totalAlbums: number;
	totalUsers: number;
	totalArtists: number;
}

export interface MessageReaction {
	emoji: string;
	userId: string;
	createdAt?: string;
}

export interface MessageFile {
	url: string;
	filename: string;
	mimetype: string;
	size: number;
}

export interface Message {
	_id: string;
	senderId: string;
	receiverId: string;
	content: string;
	type?: "text" | "audio" | "file" | "call_started" | "call_missed" | "call_declined";
	audioUrl?: string;
	audioDuration?: number;
	files?: MessageFile[];
	read: boolean;
	readAt?: string;
	delivered?: boolean;
	deliveredAt?: string;
	replyTo?: Message | null;
	reactions?: MessageReaction[];
	createdAt: string;
	updatedAt: string;
}

export interface User {
	_id: string;
	clerkId: string;
	fullName: string;
	imageUrl: string;
	email: string;
	profileImage?: string;
	lastMessage?: string;
	lastMessageTime?: string;
}

export interface Playlist {
	_id: string;
	name: string;
	description: string;
	imageUrl: string;
	songs: Song[];
	userId: string;
	createdAt: string;
	updatedAt: string;
}