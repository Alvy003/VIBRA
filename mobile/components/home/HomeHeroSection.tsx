import React, { useCallback, useMemo } from 'react';
import { HeroSection } from '@/components/HeroSection';
import { useMusicStore } from '@/stores/useMusicStore';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { SongItem } from './types';

interface HomeHeroSectionProps {
    heroParallaxStyle: any;
}

export const HomeHeroSection = React.memo(({ heroParallaxStyle }: HomeHeroSectionProps) => {
    const featuredSongs = useMusicStore(s => s.featuredSongs);
    const playTrack = usePlayerStore(s => s.playTrack);

    const heroSongs = useMemo(() => featuredSongs.slice(0, 5), [featuredSongs]);

    const handlePlay = useCallback(
        (song: SongItem) => {
            playTrack({
                id: song.videoId || song.externalId || song._id || '',
                url: song.streamUrl || song.audioUrl || '',
                title: song.title,
                artist: song.artist,
                artwork: song.imageUrl,
                duration: song.duration,
                source: song.source || (song.videoId ? 'youtube' : 'jiosaavn'),
            } as any);
        },
        [playTrack]
    );

    if (!heroSongs || heroSongs.length === 0) return null;

    return (
        <HeroSection
            heroSongs={heroSongs}
            onPlay={handlePlay}
            heroParallaxStyle={heroParallaxStyle}
        />
    );
});

HomeHeroSection.displayName = 'HomeHeroSection';
