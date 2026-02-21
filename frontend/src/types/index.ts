export interface Song {
	_id: string;
	title: string;
	artist: string;
	albumId: string | null;
	cloudProvider?: "cloudinary" | "imagekit";
	genre?: string | null;
	mood?: string | null;
	language?: string | null;

	source?: "local" | "jiosaavn" | "youtube";
	externalId?: string;
	videoId?: string;           // YouTube only
	streamUrl?: string | null;  // Original stream URL (may expire for YT)
	album?: string;             // Album name from external source

	imageUrl: string;
	audioUrl: string;
	duration: number;
	createdAt?: string;
	updatedAt?: string;
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
	isActive?: boolean;
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

export interface ExternalSong {
	externalId: string;
	source: "jiosaavn" | "youtube" | "local";
	title: string;
	artist: string;
	album?: string;
	duration: number;
	imageUrl: string;
	streamUrl: string | null;  // null for YouTube (fetch on play)
	videoId?: string;           // only for YouTube
	language?: string;
	year?: string;
	hasLyrics?: boolean;
	playCount?: number;
  }

// Unified type that your player can handle
export type PlayableSong = {
	id: string;              // _id for local, externalId for external
	title: string;
	artist: string;
	duration: number;
	imageUrl: string;
	audioUrl: string;        // resolved URL ready to play
	source: "local" | "jiosaavn" | "youtube";
	externalId?: string;
	album?: string;
  };

  export interface ExternalAlbum {
	externalId: string;
	source: "jiosaavn" | "youtube";
	type: "album";
	title: string;
	artist: string;
	imageUrl: string;
	year?: string;
	songCount?: number;
	language?: string;
	_id?: string; // raw JioSaavn ID
	songs?: ExternalSong[];
  }
  
  export interface ExternalPlaylist {
	externalId: string;
	source: "jiosaavn" | "youtube";
	type: "playlist" | "chart";
	title: string;
	description?: string;
	imageUrl: string;
	songCount?: number;
	followerCount?: number;
	language?: string;
	_id?: string;
	songs?: ExternalSong[];
  }
  
  export interface ExternalArtist {
	externalId: string;
	source: "jiosaavn" | "youtube";
	type: "artist";
	name: string;
	imageUrl: string;
	followerCount?: number;
	isVerified?: boolean;
	description?: string;
	bio?: string;
	_id?: string;
	topSongs?: ExternalSong[];
	topAlbums?: ExternalAlbum[];
  }
  
  export interface SearchAllResults {
	songs: ExternalSong[];
	albums: ExternalAlbum[];
	playlists: ExternalPlaylist[];
	artists: ExternalArtist[];
  }
  
  export interface AutocompleteSuggestion {
	type: "song" | "album" | "artist" | "playlist";
	title: string;
	artist: string;
	imageUrl: string;
	id: string;
  }
  
  export interface HomepageData {
	newAlbums: ExternalAlbum[];
	topPlaylists: ExternalPlaylist[];
	charts: ExternalPlaylist[];
	trending: any[];
  }