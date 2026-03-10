export interface SongItem {
    _id: string;
    title: string;
    artist: string;
    imageUrl: string;
    audioUrl?: string;
    streamUrl?: string;
    duration?: number;
    videoId?: string;
    externalId?: string;
    source?: string;
}

export interface ExternalItem {
    _id?: string;
    id?: string;
    externalId?: string;
    title: string;
    artist?: string;
    description?: string;
    imageUrl?: string;
    songCount?: number;
}
