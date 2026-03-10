import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, Pressable, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { MoreVertical, Play, ListPlus, Heart, Share2, Trash2, ListStart, ListEnd } from 'lucide-react-native';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useMusicStore } from '@/stores/useMusicStore';

const { height } = Dimensions.get('window');

interface SongOptionsProps {
    song: any;
    trigger?: React.ReactNode;
}

export default function SongOptions({ song, trigger }: SongOptionsProps) {
    const [visible, setVisible] = useState(false);
    const { addToQueue, setPlayNext } = usePlayerStore();
    // Assuming likedSongs state exists in useMusicStore based on web structure
    // const { likedSongs, toggleLike } = useMusicStore();

    const handlePlayNext = () => {
        const track = {
            id: song.externalId || song._id,
            url: song.streamUrl || song.audioUrl,
            title: song.title,
            artist: song.artist,
            artwork: song.imageUrl,
            source: song.source || 'jiosaavn'
        };
        // Implement playNext in PlayerStore if not exists, or just use queue logic
        setPlayNext(track);
        setVisible(false);
    };

    const handleAddToQueue = () => {
        const track = {
            id: song.externalId || song._id,
            url: song.streamUrl || song.audioUrl,
            title: song.title,
            artist: song.artist,
            artwork: song.imageUrl,
            source: song.source || 'jiosaavn'
        };
        addToQueue(track);
        setVisible(false);
    };

    const menuItems = [
        { icon: ListStart, label: 'Play Next', onPress: handlePlayNext, color: 'white' },
        { icon: ListEnd, label: 'Add to Queue', onPress: handleAddToQueue, color: 'white' },
        { icon: Heart, label: 'Like', onPress: () => { }, color: 'white' },
        { icon: ListPlus, label: 'Add to Playlist', onPress: () => { }, color: 'white' },
        { icon: Share2, label: 'Share', onPress: () => { }, color: 'white' },
    ];

    return (
        <>
            <TouchableOpacity onPress={() => setVisible(true)}>
                {trigger || <MoreVertical size={20} color="#71717a" />}
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <Pressable
                    className="flex-1 bg-black/40"
                    onPress={() => setVisible(false)}
                >
                    <View className="flex-1 justify-end">
                        <BlurView intensity={80} tint="dark" className="rounded-t-[32px] overflow-hidden">
                            <View className="bg-zinc-900/40 p-6 pb-12">
                                {/* Header */}
                                <View className="flex-row items-center mb-8">
                                    <Image
                                        source={{ uri: song.imageUrl }}
                                        className="w-16 h-16 rounded-2xl bg-zinc-800"
                                    />
                                    <View className="ml-4 flex-1">
                                        <Text className="text-white font-bold text-lg" numberOfLines={1}>{song.title}</Text>
                                        <Text className="text-zinc-400 text-sm" numberOfLines={1}>{song.artist}</Text>
                                    </View>
                                </View>

                                {/* Menu Items */}
                                <View className="space-y-4">
                                    {menuItems.map((item, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={item.onPress}
                                            className="flex-row items-center py-3 px-2 rounded-2xl active:bg-white/5"
                                        >
                                            <item.icon size={22} color={item.color} />
                                            <Text className="ml-4 text-white font-medium text-base">{item.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </BlurView>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}
