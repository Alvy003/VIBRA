import React, { useEffect } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMusicStore } from '@/stores/useMusicStore';
import { Library as LibraryIcon, Disc, ListMusic } from 'lucide-react-native';

export default function LibraryScreen() {
    const { albums, fetchAlbums } = useMusicStore();

    useEffect(() => {
        fetchAlbums();
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-black">
            <ScrollView className="flex-1 px-4">
                <View className="flex-row items-center py-6">
                    <LibraryIcon size={28} color="#9333ea" className="mr-3" />
                    <Text className="text-white text-3xl font-bold">Your Library</Text>
                </View>

                {/* Quick Links */}
                <View className="flex-row justify-between mb-8">
                    <TouchableOpacity className="bg-zinc-900 w-[48%] p-4 rounded-2xl flex-row items-center space-x-3">
                        <View className="w-10 h-10 rounded-full bg-purple-600/20 items-center justify-center">
                            <Disc size={20} color="#9333ea" />
                        </View>
                        <Text className="text-white font-semibold">Albums</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-zinc-900 w-[48%] p-4 rounded-2xl flex-row items-center space-x-3">
                        <View className="w-10 h-10 rounded-full bg-blue-600/20 items-center justify-center">
                            <ListMusic size={20} color="#2563eb" />
                        </View>
                        <Text className="text-white font-semibold">Playlists</Text>
                    </TouchableOpacity>
                </View>

                {/* Recently Added Albums */}
                <Text className="text-white text-xl font-bold mb-4">Albums</Text>
                <View className="flex-1">
                    {albums.length > 0 ? (
                        <FlatList
                            data={albums}
                            keyExtractor={(album) => album._id}
                            numColumns={2}
                            columnWrapperStyle={{ justifyContent: 'space-between' }}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item: album }) => (
                                <TouchableOpacity className="w-[48%] mb-6">
                                    <Image
                                        source={album.imageUrl}
                                        className="w-full aspect-square rounded-2xl mb-2"
                                        contentFit="cover"
                                        transition={200}
                                    />
                                    <Text className="text-white font-semibold truncate">{album.title}</Text>
                                    <Text className="text-zinc-500 text-sm truncate">{album.artist}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    ) : (
                        <View className="w-full py-20 items-center justify-center">
                            <Text className="text-zinc-600 text-lg">No albums found in your library</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
